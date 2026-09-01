const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { auth, checkRole } = require('../middleware/auth');
const { runSeoDiscoveryScan, fetchGoogleSearchConsoleData } = require('../services/seoEngine');
const { analyzeSearchQuery, generateBlogDraftContent } = require('../lib/ai');

// Rate Limiter for AI generation endpoints (max 10 calls per 15 minutes per IP)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Çok fazla AI üretimi isteği atıldı. Lütfen birkaç dakika bekleyin.' }
});

// Rate Limiter for Manual Scan (max 5 scans per 10 minutes)
const scanLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Çok sık SEO taraması başlatıldı. Lütfen biraz bekleyin.' }
});

/**
 * Helper: Ensure default settings row exists
 */
async function getOrInitSettings() {
  let settings = await prisma.seoSettings.findFirst();
  if (!settings) {
    settings = await prisma.seoSettings.create({
      data: {
        id: 1,
        autoDraftHighScores: false,
        maxOpportunitiesPerRun: 20,
        maxAutoDraftsPerRun: 2
      }
    });
  }
  return settings;
}

/**
 * GET /api/teacher/seo/overview
 */
router.get('/overview', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  try {
    const settings = await getOrInitSettings();
    const gscStatus = await fetchGoogleSearchConsoleData();

    const [oppCount, draftCount, publishedAiCount, lastLog, errorLogCount] = await Promise.all([
      prisma.seoOpportunity.count({ where: { status: { not: 'IGNORED' } } }),
      prisma.aiBlogDraft.count({ where: { status: 'DRAFT' } }),
      prisma.aiBlogDraft.count({ where: { status: 'PUBLISHED' } }),
      prisma.seoLog.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.seoLog.count({ where: { status: 'ERROR' } })
    ]);

    res.json({
      gscConnected: gscStatus.connected,
      gscNote: gscStatus.note || (gscStatus.connected ? 'Google Search Console Bağlı' : 'Search Console Bağlı Değil'),
      stats: {
        opportunitiesCount: oppCount,
        draftsCount: draftCount,
        publishedAiCount: publishedAiCount,
        errorLogCount: errorLogCount
      },
      lastScanTime: lastLog ? lastLog.createdAt : null,
      settings
    });
  } catch (err) {
    console.error('[SEO Route Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teacher/seo/opportunities
 */
router.get('/opportunities', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  try {
    const items = await prisma.seoOpportunity.findMany({
      orderBy: { score: 'desc' },
      take: 50
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teacher/seo/scan
 */
router.post('/scan', auth, checkRole('HEAD_TEACHER'), scanLimiter, async (req, res) => {
  try {
    const result = await runSeoDiscoveryScan();
    res.json(result);
  } catch (err) {
    console.error('[SEO Scan Error]', err);
    await prisma.seoLog.create({
      data: {
        action: 'SEO_DISCOVERY_SCAN',
        status: 'ERROR',
        details: err.message
      }
    });
    res.status(500).json({ error: 'SEO taraması gerçekleştirilemedi: ' + err.message });
  }
});

/**
 * POST /api/teacher/seo/generate-draft
 */
router.post('/generate-draft', auth, checkRole('HEAD_TEACHER'), aiLimiter, async (req, res) => {
  const { opportunityId, keyword } = req.body;

  let targetKeyword = keyword;
  let opportunity = null;

  if (opportunityId) {
    opportunity = await prisma.seoOpportunity.findUnique({ where: { id: parseInt(opportunityId) } });
    if (opportunity) targetKeyword = opportunity.keyword;
  }

  if (!targetKeyword) {
    return res.status(400).json({ error: 'Anahtar kelime zorunludur.' });
  }

  try {
    // 1. Fetch existing content titles to prevent duplicates in link suggestions
    const existingBlogs = await prisma.blogPost.findMany({ select: { title: true, slug: true } });
    const existingTitles = existingBlogs.map(b => b.title);

    // 2. Perform AI Keyword Analysis
    const analysis = await analyzeSearchQuery(targetKeyword, { existingTitles });

    // 3. Generate High-Quality Blog Draft
    const draftContent = await generateBlogDraftContent({
      keyword: targetKeyword,
      analysis,
      existingSitePages: ['/blog', '/derslerimiz', '/pdf-notlar', '/9-sinif-matematik']
    });

    // 4. Save into AiBlogDraft database table
    const draft = await prisma.aiBlogDraft.create({
      data: {
        opportunityId: opportunity ? opportunity.id : null,
        title: draftContent.title,
        slug: draftContent.slug,
        metaTitle: draftContent.metaTitle,
        metaDescription: draftContent.metaDescription,
        excerpt: draftContent.excerpt,
        targetKeyword: draftContent.targetKeyword,
        secondaryKeywords: JSON.stringify(draftContent.secondaryKeywords),
        grade: draftContent.grade,
        topic: draftContent.topic,
        content: draftContent.content,
        faq: JSON.stringify(draftContent.faq),
        internalLinks: JSON.stringify(draftContent.internalLinks),
        verificationRequired: draftContent.verificationRequired,
        aiProvider: draftContent.aiProvider,
        aiModel: draftContent.aiModel,
        status: 'DRAFT'
      }
    });

    // Update opportunity status if linked
    if (opportunity) {
      await prisma.seoOpportunity.update({
        where: { id: opportunity.id },
        data: { status: 'DRAFT_CREATED', targetDraftId: draft.id }
      });
    }

    // Log success
    await prisma.seoLog.create({
      data: {
        action: 'AI_BLOG_DRAFT_GENERATE',
        aiProvider: draftContent.aiProvider,
        status: 'SUCCESS',
        fallbackUsed: draftContent.fallbackUsed,
        details: `Draft created: "${draft.title}" for keyword "${targetKeyword}"`
      }
    });

    res.json(draft);
  } catch (err) {
    console.error('[AI Draft Gen Error]', err);
    await prisma.seoLog.create({
      data: {
        action: 'AI_BLOG_DRAFT_GENERATE',
        status: 'ERROR',
        details: err.message
      }
    });
    res.status(500).json({ error: 'AI blog taslağı oluşturulurken hata meydana geldi: ' + err.message });
  }
});

/**
 * POST /api/teacher/seo/suggest-best
 */
router.post('/suggest-best', auth, checkRole('HEAD_TEACHER'), aiLimiter, async (req, res) => {
  try {
    const topOpportunity = await prisma.seoOpportunity.findFirst({
      where: { status: 'NEW' },
      orderBy: { score: 'desc' }
    });

    if (!topOpportunity) {
      return res.status(404).json({ message: 'Henüz işlenmemiş SEO fırsatı bulunamadı.' });
    }

    const existingBlogs = await prisma.blogPost.findMany({ select: { title: true } });
    const analysis = await analyzeSearchQuery(topOpportunity.keyword, { existingTitles: existingBlogs.map(b => b.title) });

    res.json({
      opportunity: topOpportunity,
      suggestedAnalysis: analysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teacher/seo/drafts
 */
router.get('/drafts', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  try {
    const drafts = await prisma.aiBlogDraft.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/teacher/seo/drafts/:id
 */
router.put('/drafts/:id', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, slug, metaTitle, metaDescription, excerpt, targetKeyword, secondaryKeywords, grade, topic, content, faq, internalLinks, verificationRequired } = req.body;

  try {
    const updated = await prisma.aiBlogDraft.update({
      where: { id },
      data: {
        title,
        slug,
        metaTitle,
        metaDescription,
        excerpt,
        targetKeyword,
        secondaryKeywords: typeof secondaryKeywords === 'string' ? secondaryKeywords : JSON.stringify(secondaryKeywords || []),
        grade,
        topic,
        content,
        faq: typeof faq === 'string' ? faq : JSON.stringify(faq || []),
        internalLinks: typeof internalLinks === 'string' ? internalLinks : JSON.stringify(internalLinks || []),
        verificationRequired: Boolean(verificationRequired),
        updatedAt: new Date()
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teacher/seo/drafts/:id/publish
 */
router.post('/drafts/:id/publish', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const draft = await prisma.aiBlogDraft.findUnique({ where: { id } });
    if (!draft) {
      return res.status(404).json({ error: 'Taslak bulunamadı.' });
    }

    // Create live BlogPost
    let slug = draft.slug;
    let counter = 1;
    while (await prisma.blogPost.findUnique({ where: { slug } })) {
      slug = `${draft.slug}-${counter}`;
      counter++;
    }

    const blogPost = await prisma.blogPost.create({
      data: {
        title: draft.title,
        slug,
        content: draft.content,
        excerpt: draft.excerpt || draft.content.substring(0, 150) + '...',
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        targetKeyword: draft.targetKeyword,
        secondaryKeywords: draft.secondaryKeywords,
        faq: draft.faq,
        grade: draft.grade,
        topic: draft.topic,
        internalLinks: draft.internalLinks,
        authorId: req.user.id
      }
    });

    // Update draft status
    await prisma.aiBlogDraft.update({
      where: { id },
      data: { status: 'PUBLISHED' }
    });

    // Update opportunity status if linked
    if (draft.opportunityId) {
      await prisma.seoOpportunity.update({
        where: { id: draft.opportunityId },
        data: { status: 'PUBLISHED' }
      });
    }

    await prisma.seoLog.create({
      data: {
        action: 'PUBLISH_AI_BLOG',
        status: 'SUCCESS',
        details: `Blog published: "${blogPost.title}" (ID: ${blogPost.id})`
      }
    });

    res.json({ success: true, post: blogPost });
  } catch (err) {
    console.error('[Publish Error]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/teacher/seo/drafts/:id
 */
router.delete('/drafts/:id', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.aiBlogDraft.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teacher/seo/opportunities/:id/ignore
 */
router.post('/opportunities/:id/ignore', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updated = await prisma.seoOpportunity.update({
      where: { id },
      data: { status: 'IGNORED' }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/teacher/seo/logs
 */
router.get('/logs', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  try {
    const logs = await prisma.seoLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/teacher/seo/settings
 */
router.post('/settings', auth, checkRole('HEAD_TEACHER'), async (req, res) => {
  const { autoDraftHighScores, maxOpportunitiesPerRun, maxAutoDraftsPerRun } = req.body;
  try {
    const updated = await prisma.seoSettings.upsert({
      where: { id: 1 },
      update: {
        autoDraftHighScores: Boolean(autoDraftHighScores),
        maxOpportunitiesPerRun: parseInt(maxOpportunitiesPerRun) || 20,
        maxAutoDraftsPerRun: parseInt(maxAutoDraftsPerRun) || 2
      },
      create: {
        id: 1,
        autoDraftHighScores: Boolean(autoDraftHighScores),
        maxOpportunitiesPerRun: parseInt(maxOpportunitiesPerRun) || 20,
        maxAutoDraftsPerRun: parseInt(maxAutoDraftsPerRun) || 2
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Cron Endpoint: Scheduled SEO Discovery (e.g. Vercel Cron or external scheduler)
 * Protected by CRON_SECRET token
 */
router.get('/cron/scan', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const tokenQuery = req.query.secret;

  if (cronSecret) {
    const matchesHeader = authHeader === `Bearer ${cronSecret}`;
    const matchesQuery = tokenQuery === cronSecret;
    if (!matchesHeader && !matchesQuery) {
      return res.status(401).json({ error: 'Unauthorized CRON request' });
    }
  }

  try {
    const scanResult = await runSeoDiscoveryScan();
    const settings = await getOrInitSettings();

    let autoDraftsCreated = 0;

    // Optional Auto Draft generation for high scoring opportunities if setting enabled
    if (settings.autoDraftHighScores) {
      const topOpps = await prisma.seoOpportunity.findMany({
        where: { status: 'NEW', score: { gte: 75 } },
        take: settings.maxAutoDraftsPerRun
      });

      for (const opp of topOpps) {
        try {
          const existingBlogs = await prisma.blogPost.findMany({ select: { title: true } });
          const analysis = await analyzeSearchQuery(opp.keyword, { existingTitles: existingBlogs.map(b => b.title) });
          const draftContent = await generateBlogDraftContent({ keyword: opp.keyword, analysis });

          const draft = await prisma.aiBlogDraft.create({
            data: {
              opportunityId: opp.id,
              title: draftContent.title,
              slug: draftContent.slug,
              metaTitle: draftContent.metaTitle,
              metaDescription: draftContent.metaDescription,
              excerpt: draftContent.excerpt,
              targetKeyword: draftContent.targetKeyword,
              secondaryKeywords: JSON.stringify(draftContent.secondaryKeywords),
              grade: draftContent.grade,
              topic: draftContent.topic,
              content: draftContent.content,
              faq: JSON.stringify(draftContent.faq),
              internalLinks: JSON.stringify(draftContent.internalLinks),
              verificationRequired: draftContent.verificationRequired,
              aiProvider: draftContent.aiProvider,
              aiModel: draftContent.aiModel,
              status: 'DRAFT'
            }
          });

          await prisma.seoOpportunity.update({
            where: { id: opp.id },
            data: { status: 'DRAFT_CREATED', targetDraftId: draft.id }
          });

          autoDraftsCreated++;
        } catch (autoErr) {
          console.error('[CRON Auto Draft Error]', autoErr.message);
        }
      }
    }

    res.json({
      success: true,
      scanResult,
      autoDraftsCreated
    });
  } catch (err) {
    console.error('[CRON Error]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
