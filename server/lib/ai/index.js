const { generateGemini } = require('./gemini');
const { generateOpenRouter } = require('./openrouter');
const config = require('./aiConfig');

/**
 * Safely parse JSON from LLM text response
 */
function cleanAndParseJson(text) {
  if (!text || typeof text !== 'string') return null;
  
  let cleaned = text.trim();
  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  cleaned = cleaned.trim();

  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try finding first '{' and last '}'
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const substring = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(substring);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Executes AI call with automatic OpenRouter fallback
 */
async function callAiWithFallback(prompt, options = {}) {
  let fallbackUsed = false;
  let provider = 'gemini';
  let modelUsed = options.model || config.GEMINI.MODEL;
  let rawResponse = '';

  try {
    rawResponse = await generateGemini(prompt, { ...options, jsonMode: options.jsonMode ?? true });
  } catch (geminiError) {
    console.warn('[AI Engine] Gemini API call failed:', geminiError.message);
    
    // Check if OpenRouter key is available for fallback
    if (process.env.OPENROUTER_API_KEY) {
      console.log('[AI Engine] Attempting OpenRouter fallback...');
      try {
        rawResponse = await generateOpenRouter(prompt, { ...options, jsonMode: options.jsonMode ?? true });
        fallbackUsed = true;
        provider = 'openrouter';
        modelUsed = options.openrouterModel || config.OPENROUTER.MODEL;
      } catch (openRouterError) {
        console.error('[AI Engine] OpenRouter fallback also failed:', openRouterError.message);
        throw new Error(`AI Providers failed. Gemini: ${geminiError.message} | OpenRouter: ${openRouterError.message}`);
      }
    } else {
      console.warn('[AI Engine] OPENROUTER_API_KEY not configured. Skipping fallback.');
      throw geminiError;
    }
  }

  return {
    rawResponse,
    provider,
    modelUsed,
    fallbackUsed
  };
}

/**
 * Step 1: Analyze Search Query & Intent
 */
async function analyzeSearchQuery(keyword, contextData = {}) {
  const prompt = `
Sen Türkiye MEB müfredatına (LGS, TYT, AYT, Lise Matematik) hakim bir SEO Analisti ve Matematik Baş Öğretmenisin.

Aşağıdaki arama sorgusunu (keyword) analiz et:
Sorgu: "${keyword}"
Mevcut İçerikler: ${JSON.stringify(contextData.existingTitles || [])}

GÖREV:
Bu sorguyu derinlemesine analiz et ve aşağıdaki JSON formatında yanıt dön:
{
  "searchIntent": "Öğrencinin gerçek arama niyeti (örn: Soru çözümü arıyor, Konu özeti istiyor, Yazılıya hazırlanıyor)",
  "targetKeyword": "${keyword}",
  "secondaryKeywords": ["ilgili yan anahtar kelime 1", "yan anahtar kelime 2", "yan anahtar kelime 3"],
  "contentType": "Konu Anlatımı | Soru Çözüm Rehberi | Yazılı Hazırlık | Sınav Taktikleri",
  "grade": "5. Sınıf | 6. Sınıf | 7. Sınıf | 8. Sınıf (LGS) | 9. Sınıf | 10. Sınıf | 11. Sınıf | 12. Sınıf / YKS",
  "recommendedTitle": "SEO odaklı ilgi çekici Türkçe başlık",
  "opportunityReason": "Bu konunun neden yüksek SEO potansiyeline sahip olduğunun açıklaması"
}
Sadece ve sadece geçerli JSON çıktısı üret. Başka metin yazma.
`;

  const result = await callAiWithFallback(prompt, { jsonMode: true });
  const parsed = cleanAndParseJson(result.rawResponse);

  if (!parsed) {
    throw new Error('AI sorgu analizi için geçerli JSON yanıtı üretemedi.');
  }

  return {
    ...parsed,
    meta: {
      provider: result.provider,
      modelUsed: result.modelUsed,
      fallbackUsed: result.fallbackUsed
    }
  };
}

/**
 * Step 2: Generate High-Quality Blog Draft
 */
async function generateBlogDraftContent({ keyword, analysis = {}, existingSitePages = [] }) {
  const targetGrade = analysis.grade || 'Genel Matematik';
  const recTitle = analysis.recommendedTitle || `${keyword} Konu Anlatımı ve Örnek Soru Çözümleri`;

  const prompt = `
Sen alanında uzman Baş Öğretmensin. Derece öğrencileri yetiştiren tecrübeli bir matematik müfredat yazarısın.

HEDEF:
Aşağıdaki bilgiler doğrultusunda öğrenciler için son derece kaliteli, eğitici, anlaşılır ve SEO uyumlu bir blog yazısı taslağı hazırla.

BİLGİLER:
- Anahtar Kelime: "${keyword}"
- Arama Niyeti: "${analysis.searchIntent || 'Konu öğrenme ve soru çözümü'}"
- Önerilen Başlık: "${recTitle}"
- Seviye/Sınıf: "${targetGrade}"
- İkincil Anahtar Kelimeler: ${JSON.stringify(analysis.secondaryKeywords || [])}
- Sitede Var Olabilen İlgili Sayfalar/Kategoriler: ${JSON.stringify(existingSitePages)}

İÇERİK VE KALİTE KURALLARI:
1. Türkçe dilinde, doğal, öğrenci samimiyetinde ama öğretici dille yaz.
2. Gereksiz kelime tekrarından ve anahtar kelime spam'inden (keyword stuffing) kaçın.
3. H2 ve H3 başlık yapısını düzgün kurgula (HTML olarak <h2>, <h3>, <p>, <ul>, <ol>, <strong> vb. etiketler kullan).
4. Eğer konu matematiksel bir konuysa, mutlaka EN AZ 2 ADET örnek matematik sorusu ve adım adım detaylı çözümlerini ekle.
5. KESİNLİKLE DOĞRULANMAMIŞ BİLGİ ÜRETME!
   - MEB yeni müfredat değişiklikleri, ÖSYM sınav tarihleri, net soru sayıları veya resmi baraj puanları gibi veriye dayalı konularda kesin doğrulanmış bilgi sahibi değilsen uydurma tahminlerde bulunma.
   - Doğrulanmamış veya teyide muhtaç iddialar yer alıyorsa JSON içerisindeki "verificationRequired" alanını true yap.
6. İç Link Önerileri: Sitedeki var olan kategorilere (örn: /blog, /derslerimiz, /pdf-notlar, /9-sinif-matematik) uygun ve var olan mantıklı bağlantı önerileri oluştur (Var olmayan URL uydurma).

ÇIKTI FORMATI:
Aşağıdaki JSON şemasına BİREBİR uyacak şekilde çıktıyı üret:
{
  "title": "${recTitle}",
  "slug": "seo-uyumlu-temiz-slug-orn-9-sinif-matematik-fonksiyonlar",
  "metaTitle": "Google arama sonuçlarında görünecek Meta Title (maks 60 karakter)",
  "metaDescription": "Google arama sonuçlarında görünecek Meta Description (maks 155 karakter)",
  "excerpt": "Blog kartlarında görünecek 2-3 cümlelik çekici özet",
  "targetKeyword": "${keyword}",
  "secondaryKeywords": ["ikincil1", "ikincil2"],
  "grade": "${targetGrade}",
  "topic": "${keyword}",
  "content": "<h2>Giriş</h2><p>...</p><h2>Örnek Sorular ve Çözümleri</h2><p>...</p>",
  "faq": [
    {
      "question": "Bu konuyla ilgili sık sorulan soru 1?",
      "answer": "Net ve doyurucu cevap 1."
    },
    {
      "question": "Sık sorulan soru 2?",
      "answer": "Cevap 2."
    }
  ],
  "internalLinkSuggestions": [
    {
      "anchorText": "İlgili Konu Anlatımları",
      "targetUrl": "/blog"
    }
  ],
  "verificationRequired": false
}

Yalnızca ve yalnızca yukarıdaki JSON nesnesini döndür.
`;

  const result = await callAiWithFallback(prompt, { jsonMode: true, maxTokens: 8192 });
  const parsed = cleanAndParseJson(result.rawResponse);

  if (!parsed || !parsed.title || !parsed.content) {
    throw new Error('AI blog taslağı için geçerli ve eksiksiz JSON çıktısı üretemedi.');
  }

  const currentAcademicYear = '2026-2027';
  const sanitizeYearInText = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/\b(202[0-5]|20[3-9][0-9])\b/g, currentAcademicYear)
      .replace(/\b2025-2026\b/g, currentAcademicYear);
  };

  // Validate and sanitize structure
  const draft = {
    title: sanitizeYearInText(parsed.title || recTitle),
    slug: parsed.slug || keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, ''),
    metaTitle: sanitizeYearInText(parsed.metaTitle || parsed.title),
    metaDescription: sanitizeYearInText(parsed.metaDescription || parsed.excerpt || parsed.title),
    excerpt: sanitizeYearInText(parsed.excerpt || parsed.content.substring(0, 150) + '...'),
    targetKeyword: parsed.targetKeyword || keyword,
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : [],
    grade: parsed.grade || targetGrade,
    topic: parsed.topic || keyword,
    content: sanitizeYearInText(parsed.content),
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
    internalLinks: Array.isArray(parsed.internalLinkSuggestions) ? parsed.internalLinkSuggestions : [],
    verificationRequired: Boolean(parsed.verificationRequired),
    aiProvider: result.provider,
    aiModel: result.modelUsed,
    fallbackUsed: result.fallbackUsed
  };

  return draft;
}

/**
 * Step 3: Refine Existing Blog Draft based on Teacher's Prompt Instruction
 */
async function refineBlogDraftWithInstruction({ existingDraft, instruction }) {
  const prompt = `
Sen alanında uzman Baş Öğretmensin. Mevcut bir blog taslağını verilen özel talimata göre yeniden düzenleyeceksin.

MEVCUT DRAFT:
- Başlık: "${existingDraft.title}"
- Anahtar Kelime: "${existingDraft.targetKeyword}"
- Seviye: "${existingDraft.grade || 'Genel'}"
- Özet: "${existingDraft.excerpt || ''}"
- Mevcut HTML İçeriği: ${JSON.stringify(existingDraft.content || '')}
- Mevcut FAQ: ${JSON.stringify(existingDraft.faq || [])}

ÖĞRETMENİN ÖZEL DÜZENLEME TALİMATI:
"${instruction}"

GÖREV:
Mevcut taslağı öğretmenin talimatına göre GÜNCELLE VE YENİDEN YAZ.
Öğretmenin istediği eklemeleri yap, tonlamayı ayarla veya soru/içerik ekle.

ÇIKTI FORMATI (Aşağıdaki JSON formatında döndür):
{
  "title": "Güncellenmiş Başlık",
  "slug": "${existingDraft.slug}",
  "metaTitle": "Güncellenmiş Meta Title",
  "metaDescription": "Güncellenmiş Meta Description",
  "excerpt": "Güncellenmiş Özet",
  "targetKeyword": "${existingDraft.targetKeyword}",
  "secondaryKeywords": [],
  "grade": "${existingDraft.grade || 'Genel'}",
  "topic": "${existingDraft.topic || existingDraft.targetKeyword}",
  "content": "<h2>HTML İçerik...</h2>",
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "internalLinkSuggestions": [],
  "verificationRequired": false
}
Sadece ve sadece yukarıdaki JSON nesnesini döndür.
`;

  const result = await callAiWithFallback(prompt, { jsonMode: true, maxTokens: 8192 });
  const parsed = cleanAndParseJson(result.rawResponse);

  if (!parsed || !parsed.title || !parsed.content) {
    throw new Error('AI taslağı düzenlerken geçerli JSON çıktısı üretemedi.');
  }

  return {
    title: parsed.title || existingDraft.title,
    slug: parsed.slug || existingDraft.slug,
    metaTitle: parsed.metaTitle || existingDraft.metaTitle,
    metaDescription: parsed.metaDescription || existingDraft.metaDescription,
    excerpt: parsed.excerpt || existingDraft.excerpt,
    targetKeyword: parsed.targetKeyword || existingDraft.targetKeyword,
    secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : (existingDraft.secondaryKeywords || []),
    grade: parsed.grade || existingDraft.grade,
    topic: parsed.topic || existingDraft.topic,
    content: parsed.content,
    faq: Array.isArray(parsed.faq) ? parsed.faq : (existingDraft.faq || []),
    internalLinks: Array.isArray(parsed.internalLinkSuggestions) ? parsed.internalLinkSuggestions : (existingDraft.internalLinks || []),
    verificationRequired: Boolean(parsed.verificationRequired),
    aiProvider: result.provider,
    aiModel: result.modelUsed,
    fallbackUsed: result.fallbackUsed
  };
}

module.exports = {
  callAiWithFallback,
  analyzeSearchQuery,
  generateBlogDraftContent,
  refineBlogDraftWithInstruction,
  cleanAndParseJson
};
