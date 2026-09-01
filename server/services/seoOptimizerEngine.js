const { PrismaClient } = require('@prisma/client');
let prismaInstance = null;
function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

const { fetchGoogleSearchConsoleData, calculateTextSimilarity } = require('./seoEngine');
const { callAiWithFallback, cleanAndParseJson } = require('../lib/ai');

/**
 * Fetch Page and Query Search Console metrics for Optimizer
 */
async function fetchPageAndQueryGscData() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL || 'https://fullematematigi.com.tr';

  if (!serviceAccountEmail || !privateKey) {
    return { connected: false, rows: [], note: 'Search Console (.env) kimlik bilgileri eksik.' };
  }

  try {
    const crypto = require('crypto');
    function base64url(buf) {
      return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }

    let formattedKey = (privateKey || '')
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .trim();

    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
    }

    const cleanEmail = (serviceAccountEmail || '').replace(/^["']|["']$/g, '').trim();
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: cleanEmail,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const jwtVal = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(claim)))}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(jwtVal);
    const signature = base64url(sign.sign(formattedKey));
    const jwtAssertion = `${jwtVal}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtAssertion
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return { connected: false, rows: [], note: 'GSC token isteği başarısız: ' + errText };
    }

    const { access_token } = await tokenRes.json();
    const today = new Date().toISOString().split('T')[0];
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const siteCandidates = Array.from(new Set([
      siteUrl,
      'https://fullematematigi.com.tr',
      'https://fullematematigi.com.tr/',
      'sc-domain:fullematematigi.com.tr',
      'https://www.fullematematigi.com.tr/',
      'https://www.fullematematigi.com.tr'
    ]));

    let currentRows = [];
    let prevRows = [];
    let matchedSite = null;

    for (const candidate of siteCandidates) {
      const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/searchAnalytics/query`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: twentyEightDaysAgo,
          endDate: today,
          dimensions: ['page', 'query'],
          rowLimit: 500
        })
      });

      if (res.ok) {
        const data = await res.json();
        currentRows = data.rows || [];
        matchedSite = candidate;

        // Fetch previous 28-day period for comparison
        const prevRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDate: fiftySixDaysAgo,
            endDate: twentyEightDaysAgo,
            dimensions: ['page', 'query'],
            rowLimit: 500
          })
        });

        if (prevRes.ok) {
          const prevData = await prevRes.json();
          prevRows = prevData.rows || [];
        }
        break;
      }
    }

    if (!matchedSite) {
      return { connected: false, rows: [], note: 'Search Console mülkü bulunamadı.' };
    }

    return {
      connected: true,
      currentRows,
      prevRows,
      matchedSite,
      note: `Search Console Bağlı (${currentRows.length} sayfa/sorgu çifti analiz edildi)`
    };
  } catch (err) {
    console.warn('[SEO Optimizer Engine] GSC query error:', err.message);
    return { connected: false, rows: [], note: 'GSC hatası: ' + err.message };
  }
}

/**
 * Calculate Optimization Score (0-100) & Opportunity Type for a Page
 */
function calculateOptimizationScore(metrics) {
  const { impressions, clicks, ctr, position, positionChange, impressionGrowth, queryCount, cannibalizationCount } = metrics;
  let score = 30; // base

  // Position 4-10 (Top 3 Opportunity): Highest Priority
  if (position >= 3.5 && position <= 10.4) {
    score += 35;
  }
  // Position 11-20 (First Page Opportunity)
  else if (position >= 10.5 && position <= 20.4) {
    score += 30;
  }
  // Position 1-3 (High ranking - maintain & optimize CTR)
  else if (position >= 1.0 && position < 3.5) {
    score += 15;
  }

  // Impression Growth bonus (Rising Content)
  if (impressionGrowth > 50) score += 20;
  else if (impressionGrowth > 20) score += 10;

  // High Impressions & Low CTR
  if (impressions > 250 && ctr < 0.03) {
    score += 25;
  }

  // Ranking Drop Penalty/Signal (Position drop > 3)
  if (positionChange > 3) {
    score += 20;
  }

  // Cannibalization Risk
  if (cannibalizationCount > 0) {
    score += 15;
  }

  // Impression volume scale
  if (impressions > 1000) score += 10;
  else if (impressions > 300) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Determine exact Opportunity Type Badge strictly backed by GSC empirical numbers
 */
function determineOpportunityType(metrics) {
  const { position, positionChange, impressionGrowth, impressions, ctr, cannibalizationCount, title, hasGscData } = metrics;

  // New or unindexed content without real GSC impressions
  if (!hasGscData || impressions === 0) {
    return 'LOW_POTENTIAL';
  }

  if (cannibalizationCount > 0) return 'CANNIBALIZATION_RISK';
  if (positionChange > 3.0) return 'RANKING_DROP';

  // Real GSC Position 3.5 - 10.4: Genuine Top 3 Opportunity (Page 1 -> Top 3)
  if (position >= 3.5 && position <= 10.4) return 'TOP_3_OPPORTUNITY';

  // Real GSC Position 10.5 - 20.4: Genuine First Page Opportunity (Page 2 -> Page 1)
  if (position >= 10.5 && position <= 20.4) return 'FIRST_PAGE_OPPORTUNITY';

  if (impressionGrowth > 40 && impressions > 150) return 'RISING_CONTENT';
  if (impressions > 250 && ctr < 0.035) return 'HIGH_IMP_LOW_CTR';

  const currentYear = new Date().getFullYear();
  if (title && (title.includes(String(currentYear - 1)) || title.includes(String(currentYear)))) {
    return 'CONTENT_REFRESH';
  }

  return 'LOW_POTENTIAL';
}

/**
 * Detect Keyword Cannibalization across site pages
 */
function detectCannibalizationRisks(gscRows) {
  const queryToPagesMap = new Map();

  for (const r of gscRows) {
    const page = r.keys?.[0] || '';
    const query = (r.keys?.[1] || '').toLowerCase().trim();
    if (!page || !query) continue;

    if (!queryToPagesMap.has(query)) {
      queryToPagesMap.set(query, []);
    }
    queryToPagesMap.get(query).push({
      page,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      position: r.position || 0
    });
  }

  const cannibalizationMap = new Map();
  for (const [query, pages] of queryToPagesMap.entries()) {
    if (pages.length >= 2) {
      const distinctPages = Array.from(new Set(pages.map(p => p.page)));
      if (distinctPages.length >= 2) {
        for (const p of distinctPages) {
          if (!cannibalizationMap.has(p)) cannibalizationMap.set(p, []);
          cannibalizationMap.get(p).push({ query, competingPages: distinctPages.filter(x => x !== p) });
        }
      }
    }
  }

  return cannibalizationMap;
}

/**
 * Execute Full SEO Optimizer Scan
 */
async function runSeoOptimizerScan() {
  const startTime = Date.now();
  console.log('[SEO Optimizer] Starting scan...');

  const db = getPrisma();
  const gscData = await fetchPageAndQueryGscData();

  let existingPosts = [];
  try {
    existingPosts = await db.blogPost.findMany({
      select: { id: true, title: true, slug: true, targetKeyword: true, content: true, metaTitle: true, metaDescription: true, updatedAt: true }
    });
  } catch (err) {
    console.warn('[SEO Optimizer] DB fetch warning:', err.message);
  }

  const prevMetricsMap = new Map();
  if (gscData.connected && gscData.prevRows) {
    for (const r of gscData.prevRows) {
      const page = r.keys?.[0] || '';
      const query = r.keys?.[1] || '';
      const key = `${page}::${query}`;
      prevMetricsMap.set(key, {
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        position: r.position || 0
      });
    }
  }

  const cannibalizationMap = gscData.connected ? detectCannibalizationRisks(gscData.currentRows) : new Map();
  const pageAggregatesMap = new Map();

  if (gscData.connected && gscData.currentRows.length > 0) {
    for (const r of gscData.currentRows) {
      const pageUrl = r.keys?.[0] || '';
      const query = r.keys?.[1] || '';
      if (!pageUrl) continue;

      if (!pageAggregatesMap.has(pageUrl)) {
        pageAggregatesMap.set(pageUrl, {
          pageUrl,
          totalClicks: 0,
          totalImpressions: 0,
          posSum: 0,
          count: 0,
          queries: [],
          topQuery: '',
          maxImp: -1,
          prevPosSum: 0,
          prevImpSum: 0
        });
      }

      const agg = pageAggregatesMap.get(pageUrl);
      const imp = r.impressions || 0;
      const clk = r.clicks || 0;
      const pos = r.position || 0;

      agg.totalClicks += clk;
      agg.totalImpressions += imp;
      agg.posSum += pos;
      agg.count += 1;
      agg.queries.push({ query, impressions: imp, clicks: clk, position: pos });

      if (imp > agg.maxImp) {
        agg.maxImp = imp;
        agg.topQuery = query;
      }

      const prevKey = `${pageUrl}::${query}`;
      const prev = prevMetricsMap.get(prevKey);
      if (prev) {
        agg.prevPosSum += prev.position;
        agg.prevImpSum += prev.impressions;
      }
    }
  }

  // Also include published blog posts that might not have GSC impressions yet
  for (const post of existingPosts) {
    const postUrl = `https://fullematematigi.com.tr/blog/${post.slug}`;
    if (!pageAggregatesMap.has(postUrl)) {
      pageAggregatesMap.set(postUrl, {
        pageUrl: postUrl,
        pageTitle: post.title,
        totalClicks: 0,
        totalImpressions: 0,
        posSum: 0,
        count: 0,
        queries: [],
        topQuery: post.targetKeyword || post.title,
        maxImp: 0,
        prevPosSum: 0,
        prevImpSum: 0
      });
    }
  }

  let opportunitiesCreated = 0;
  const processedOptimizations = [];

  for (const [pageUrl, agg] of pageAggregatesMap.entries()) {
    // Match with database blog post if available
    const slugMatch = pageUrl.split('/blog/')[1] || '';
    const matchingPost = existingPosts.find(p => p.slug === slugMatch || pageUrl.endsWith(p.slug));

    const pageTitle = matchingPost ? matchingPost.title : (agg.pageTitle || pageUrl);
    const targetKeyword = matchingPost?.targetKeyword || agg.topQuery || 'Matematik Konu Anlatımı';

    const hasGscData = agg.count > 0 && agg.totalImpressions > 0;
    const avgPos = hasGscData ? (agg.posSum / agg.count) : 0;
    const prevAvgPos = hasGscData && agg.prevPosSum > 0 ? (agg.prevPosSum / agg.count) : avgPos;
    const positionChange = hasGscData ? Number((avgPos - prevAvgPos).toFixed(1)) : 0;

    const impressionGrowth = agg.prevImpSum > 0
      ? Number((((agg.totalImpressions - agg.prevImpSum) / agg.prevImpSum) * 100).toFixed(1))
      : (agg.totalImpressions > 100 ? 50 : 0);

    const ctr = agg.totalImpressions > 0 ? Number((agg.totalClicks / agg.totalImpressions).toFixed(4)) : 0;
    const cannibalizationCount = cannibalizationMap.has(pageUrl) ? cannibalizationMap.get(pageUrl).length : 0;

    const metrics = {
      impressions: agg.totalImpressions,
      clicks: agg.totalClicks,
      ctr,
      position: Number(avgPos.toFixed(1)),
      positionChange,
      impressionGrowth,
      queryCount: agg.queries.length,
      cannibalizationCount,
      title: pageTitle,
      hasGscData
    };

    const optimizationScore = calculateOptimizationScore(metrics);
    const opportunityType = determineOpportunityType(metrics);

    try {
      const saved = await db.seoPageOptimization.upsert({
        where: { pageUrl },
        update: {
          pageTitle,
          targetKeyword,
          topQuery: agg.topQuery || targetKeyword,
          clicks: agg.totalClicks,
          impressions: agg.totalImpressions,
          ctr,
          position: Number(avgPos.toFixed(1)),
          prevPosition: Number(prevAvgPos.toFixed(1)),
          positionChange,
          optimizationScore,
          opportunityType,
          updatedAt: new Date()
        },
        create: {
          pageUrl,
          pageTitle,
          targetKeyword,
          topQuery: agg.topQuery || targetKeyword,
          clicks: agg.totalClicks,
          impressions: agg.totalImpressions,
          ctr,
          position: Number(avgPos.toFixed(1)),
          prevPosition: Number(prevAvgPos.toFixed(1)),
          positionChange,
          optimizationScore,
          opportunityType,
          status: 'PENDING_ANALYSIS'
        }
      });

      opportunitiesCreated++;
      processedOptimizations.push(saved);
    } catch (saveErr) {
      console.warn('[SEO Optimizer] Upsert error for pageUrl:', pageUrl, saveErr.message);
    }
  }

  // Log scan
  try {
    await db.seoLog.create({
      data: {
        action: 'SEO_OPTIMIZER_SCAN',
        queriesFound: gscData.currentRows?.length || 0,
        opportunitiesCreated,
        status: 'SUCCESS',
        details: JSON.stringify({
          durationMs: Date.now() - startTime,
          pagesAnalyzed: pageAggregatesMap.size
        })
      }
    });
  } catch (logErr) {
    console.warn('[SEO Optimizer] Log save error:', logErr.message);
  }

  return {
    success: true,
    pagesAnalyzed: pageAggregatesMap.size,
    opportunitiesCreated,
    gscConnected: gscData.connected,
    items: processedOptimizations
  };
}

/**
 * AI Page Analysis Engine: Evaluates Search Intent, Math Pedagogy, Headings, Internal Links & Gaps
 */
async function analyzePageOptimizationWithAi({ pageUrl, currentContent, gscData, targetKeyword, sitePages }) {
  const prompt = `
Sen Fullematematiği'nin Baş SEO ve Matematik Kıdemli Öğretmenisin.
Google'da gösterim almaya başlayan veya sıralaması değişen aşağıdaki sayfa ve performans verilerini analiz et.

SAYFA BİLGİLERİ:
- URL: "${pageUrl}"
- Hedef Anahtar Kelime: "${targetKeyword || 'Matematik'}"
- Mevcut Başlık: "${currentContent.title || ''}"
- Mevcut Meta Description: "${currentContent.metaDescription || ''}"
- Sayfa Türü: Matematik Konu Anlatımı / Eğitici Rehber
- İçerik Metni (İlk 1500 Karakter): ${JSON.stringify((currentContent.content || '').substring(0, 1500))}

GOOGLE SEARCH CONSOLE VERİLERİ:
- Ortalama Pozisyon: ${currentContent.position || 'N/A'}
- Toplam Gösterim (Impressions): ${currentContent.impressions || 0}
- Tıklama (Clicks): ${currentContent.clicks || 0}
- Tıklama Oranı (CTR): %${((currentContent.ctr || 0) * 100).toFixed(2)}
- Pozisyon Değişimi: ${currentContent.positionChange || 0}
- En Çok Gösterim Alan Sorgular: ${JSON.stringify(gscData || [])}

MEVCUT SİTE SAYFALARI (Internal Link İçin Yalnızca Bu Sayfaları Öner! Sakın Olmayan URL Üretme):
${JSON.stringify(sitePages || [])}

GÖREV & MATEMATİK PEDAGOJİK DEĞERLENDİRME:
1. Öğrencinin arama niyetini (Search Intent) tam olarak belirle. (Örn: Sınav soruları mı arıyor, konu özeti mi, taktik mi?)
2. İçeriğin eksiklerini ve zayıf yönlerini tespit et (Örn: Çözümlü örnek soru eksik mi, kurallar net mi, sık yapılan hatalar bölümü var mı, mini test lazım mı?).
3. Tıklama oranını (CTR) artıracak çekici ama clickbait olmayan Türkçe Başlık (Title) ve Meta Description öner.
4. Yalnızca yukarıda verilen MEVCUT SİTE SAYFALARI listesinden mantıklı iç linkler (Internal Links) öner.

ÇIKTI FORMATI (Aşağıdaki JSON nesnesini eksiksiz döndür):
{
  "summary": "Sayfanın Google performansının ve genel durumunun 2 cümlelik özeti.",
  "mainProblem": "Sayfanın yükselmesini engelleyen temel problem (Örn: Düşük CTR, eksik soru tipleri, arama niyeti uyumsuzluğu vb.).",
  "searchIntent": "Öğrencinin bu sorgudaki kesin arama amacı.",
  "recommendedActions": [
    "Başlığa '2026-2027 MEB Müfredatı' vurgusu ekle.",
    "2 adet çözümlü LGS örnek sorusu ekle.",
    "Öğrencilerin sık yaptığı 3 işlem hatasını vurgula."
  ],
  "titleSuggestion": "SEO Uyumlu Yeni Çekici Başlık",
  "metaDescriptionSuggestion": "SEO Uyumlu 145 Karakterlik Meta Açıklaması",
  "sectionsToAdd": ["Çözümlü Örnek Sorular", "Öğrenci İşlem Hataları & Taktikler"],
  "sectionsToImprove": ["Giriş Özet Paragrafı"],
  "internalLinksToAdd": [
    {
      "anchorText": "Çözümlü Test Soruları",
      "targetUrl": "/pdf-notlar"
    }
  ],
  "contentGaps": ["Kolay-Orta-Zor seviye soru dağılımı eksik"],
  "priority": "HIGH",
  "confidence": 94
}

Yalnızca ve yalnızca yukarıdaki JSON nesnesini döndür.
`;

  const result = await callAiWithFallback(prompt, { jsonMode: true, maxTokens: 4096 });
  const parsed = cleanAndParseJson(result.rawResponse);

  if (!parsed || !parsed.summary || !parsed.recommendedActions) {
    throw new Error('AI SEO analiz nesnesini geçerli JSON olarak üretemedi.');
  }

  const currentAcademicYear = '2026-2027';
  const sanitizeYearInText = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/\b(202[0-5]|20[3-9][0-9])\b/g, currentAcademicYear)
      .replace(/\b2025-2026\b/g, currentAcademicYear);
  };

  const rawTitle = parsed.titleSuggestion || currentContent.title;
  const rawMeta = parsed.metaDescriptionSuggestion || currentContent.metaDescription;

  return {
    summary: sanitizeYearInText(parsed.summary || 'Sayfa performans analizi tamamlandı.'),
    mainProblem: sanitizeYearInText(parsed.mainProblem || 'Sayfada CTR veya içerik derinliği optimizasyonu gerekiyor.'),
    searchIntent: sanitizeYearInText(parsed.searchIntent || 'Matematik konu öğrenimi ve soru çözümü.'),
    recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions.map(sanitizeYearInText) : [],
    titleSuggestion: sanitizeYearInText(rawTitle),
    metaDescriptionSuggestion: sanitizeYearInText(rawMeta),
    sectionsToAdd: Array.isArray(parsed.sectionsToAdd) ? parsed.sectionsToAdd.map(sanitizeYearInText) : [],
    sectionsToImprove: Array.isArray(parsed.sectionsToImprove) ? parsed.sectionsToImprove.map(sanitizeYearInText) : [],
    internalLinksToAdd: Array.isArray(parsed.internalLinksToAdd) ? parsed.internalLinksToAdd : [],
    contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.map(sanitizeYearInText) : [],
    priority: parsed.priority || 'HIGH',
    confidence: parsed.confidence || 90,
    aiProvider: result.provider,
    aiModel: result.modelUsed
  };
}

module.exports = {
  fetchPageAndQueryGscData,
  calculateOptimizationScore,
  determineOpportunityType,
  detectCannibalizationRisks,
  runSeoOptimizerScan,
  analyzePageOptimizationWithAi
};
