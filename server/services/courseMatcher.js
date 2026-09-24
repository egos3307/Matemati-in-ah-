const { PrismaClient } = require('@prisma/client');
const { callAiWithFallback, cleanAndParseJson } = require('../lib/ai');

let prismaInstance = null;
function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}

/**
 * Fetch all currently active course packages (QuotaCourses and Camps)
 */
async function getActiveCourses() {
  const prisma = getPrisma();
  let quotaCourses = [];
  let camps = [];

  try {
    quotaCourses = await prisma.quotaCourse.findMany({
      where: { published: true }
    });
  } catch (err) {
    console.warn('[CourseMatcher] QuotaCourse fetch error:', err.message);
  }

  try {
    camps = await prisma.camp.findMany();
  } catch (err) {
    console.warn('[CourseMatcher] Camp fetch error:', err.message);
  }

  const normalizedQuota = quotaCourses.map(qc => ({
    id: qc.id,
    type: 'QUOTA_COURSE',
    title: qc.title,
    category: qc.category || 'Genel',
    description: qc.description || '',
    price: qc.price || '',
    image: qc.image || '',
    whatsappLink: qc.whatsappLink || ''
  }));

  const normalizedCamps = camps.map(c => ({
    id: c.id,
    type: 'CAMP',
    title: c.title,
    category: c.category || c.badge || 'Genel',
    subtitle: c.subtitle || '',
    description: c.description || '',
    price: c.price || '',
    image: c.image || '',
    whatsappLink: c.whatsappLink || ''
  }));

  return [...normalizedQuota, ...normalizedCamps];
}

/**
 * Use Gemini AI to match a blog post to primary and secondary active course packages
 */
async function matchCoursePackagesWithGemini({ title, grade, topic, category, targetKeyword, content }) {
  const activeCourses = await getActiveCourses();

  if (!activeCourses || activeCourses.length === 0) {
    return {
      primary: null,
      secondary: null
    };
  }

  const coursesSummary = activeCourses.map(c => ({
    id: c.id,
    type: c.type,
    title: c.title,
    category: c.category,
    description: (c.description || c.subtitle || '').substring(0, 150)
  }));

  const prompt = `
Sen Yapay Zeka Ders ve Eğitim Danışmanısın.
Aşağıdaki blog yazısını incele ve sitede şu an aktif olan ders paketleri arasından:
1. Bu yazıya EN UYGUN BİRİNCİL DERS PAKETİNİ
2. Birincil paket silinirse veya kapandığında kullanılacak İKİNCİL (YEDEK) DERS PAKETİNİ seç.

BLOG BİLGİLERİ:
- Başlık: "${title || ''}"
- Seviye/Sınıf: "${grade || ''}"
- Konu/Kategori: "${topic || category || ''}"
- Hedef Anahtar Kelime: "${targetKeyword || ''}"
- Kısa Özet/İçerik başı: "${(content || '').substring(0, 300).replace(/"/g, "'")}"

AKTİF DERS PAKETLERİ LİSTESİ:
${JSON.stringify(coursesSummary, null, 2)}

GÖREV:
Yukarıdaki aktif ders paketleri listesinden blogun hedef kitlesine ve seviyesine (LGS, YKS, KPSS, Ortaokul, Lise vb.) en uygun olan 1 adet BİRİNCİL (primary) ve 1 adet İKİNCİL (secondary) paket seç.

ÇIKTI FORMATI (Sadece geçerli JSON döndür):
{
  "primaryId": <Seçilen birincil paketin id numarası>,
  "primaryType": "<QUOTA_COURSE veya CAMP>",
  "secondaryId": <Seçilen ikincil paketin id numarası (farklı bir paket olmalı)>,
  "secondaryType": "<QUOTA_COURSE veya CAMP>",
  "reason": "Seçim gerekçesi"
}
Eğer liste tek elemanlıysa secondaryId aynı veya null olabilir.
`;

  try {
    const result = await callAiWithFallback(prompt, { jsonMode: true });
    const parsed = cleanAndParseJson(result.rawResponse);

    if (parsed && parsed.primaryId && parsed.primaryType) {
      const primaryExists = activeCourses.find(c => c.id === parsed.primaryId && c.type === parsed.primaryType);
      if (primaryExists) {
        let secondaryExists = activeCourses.find(c => c.id === parsed.secondaryId && c.type === parsed.secondaryType);
        if (!secondaryExists || (secondaryExists.id === primaryExists.id && secondaryExists.type === primaryExists.type)) {
          secondaryExists = activeCourses.find(c => !(c.id === primaryExists.id && c.type === primaryExists.type));
        }

        return {
          primary: primaryExists,
          secondary: secondaryExists || null,
          reason: parsed.reason || 'Gemini AI tarafından eşleştirildi'
        };
      }
    }
  } catch (err) {
    console.warn('[CourseMatcher] Gemini AI match error:', err.message);
  }

  // Heuristic Fallback matching if AI fails
  return fallbackHeuristicMatch(title, grade, topic, category, activeCourses);
}

/**
 * Heuristic fallback matching logic based on keywords and categories
 */
function fallbackHeuristicMatch(title, grade, topic, category, activeCourses) {
  const text = `${title || ''} ${grade || ''} ${topic || ''} ${category || ''}`.toLowerCase();

  let primary = null;
  let secondary = null;

  if (text.includes('lgs') || text.includes('8. sınıf') || text.includes('ortaokul') || text.includes('5. sınıf') || text.includes('6. sınıf') || text.includes('7. sınıf')) {
    primary = activeCourses.find(c => (c.title + c.category).toLowerCase().includes('lgs') || (c.title + c.category).toLowerCase().includes('ortaokul'));
  } else if (text.includes('kpss') || text.includes('lisans') || text.includes('ön lisans')) {
    primary = activeCourses.find(c => (c.title + c.category).toLowerCase().includes('kpss'));
  } else if (text.includes('yks') || text.includes('tyt') || text.includes('ayt') || text.includes('9. sınıf') || text.includes('10. sınıf') || text.includes('11. sınıf') || text.includes('12. sınıf')) {
    primary = activeCourses.find(c => (c.title + c.category).toLowerCase().includes('yks') || (c.title + c.category).toLowerCase().includes('tyt') || (c.title + c.category).toLowerCase().includes('ayt'));
  }

  if (!primary) {
    primary = activeCourses[0] || null;
  }

  if (primary) {
    secondary = activeCourses.find(c => !(c.id === primary.id && c.type === primary.type)) || null;
  }

  return { primary, secondary, reason: 'Kategori bazlı otomatik eşleştirme' };
}

/**
 * Helper to resolve the active primary or secondary course package for a blog post.
 * Fast, local, and reliable without calling external AI APIs during GET requests.
 */
function resolveBlogPackagesSync(blogPost, activeCourses = []) {
  let activePrimary = null;
  let activeSecondary = null;
  let isSecondaryActive = false;

  if (blogPost?.relatedCourseId && blogPost?.relatedCourseType) {
    activePrimary = activeCourses.find(c => c.id === blogPost.relatedCourseId && c.type === blogPost.relatedCourseType);
  }

  if (blogPost?.secondaryCourseId && blogPost?.secondaryCourseType) {
    activeSecondary = activeCourses.find(c => c.id === blogPost.secondaryCourseId && c.type === blogPost.secondaryCourseType);
  }

  // If primary course is deleted/unpublished or not set, fallback to secondary course or heuristic match
  let displayCourse = activePrimary;
  if (!displayCourse) {
    if (activeSecondary) {
      displayCourse = activeSecondary;
      isSecondaryActive = true;
    } else {
      // Fast local heuristic fallback match
      const dynamicMatch = fallbackHeuristicMatch(blogPost?.title, blogPost?.grade, blogPost?.topic, blogPost?.category, activeCourses);
      displayCourse = dynamicMatch.primary;
      activeSecondary = dynamicMatch.secondary;
    }
  }

  return {
    primaryCourse: activePrimary,
    secondaryCourse: activeSecondary,
    displayCourse,
    isSecondaryActive,
    allActiveCourses: activeCourses
  };
}

async function resolveBlogPackages(blogPost) {
  let activeCourses = [];
  try {
    activeCourses = await getActiveCourses();
  } catch (err) {
    console.warn('[CourseMatcher] getActiveCourses warning:', err.message);
  }
  return resolveBlogPackagesSync(blogPost, activeCourses);
}

module.exports = {
  getActiveCourses,
  matchCoursePackagesWithGemini,
  resolveBlogPackages,
  resolveBlogPackagesSync
};
