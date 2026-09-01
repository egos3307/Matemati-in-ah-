const { PrismaClient } = require('@prisma/client');
let _prisma;
function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

const SEED_KEYWORDS = [
  'matematik',
  '5. sınıf matematik',
  '6. sınıf matematik',
  '7. sınıf matematik',
  '8. sınıf matematik',
  '9. sınıf matematik',
  '10. sınıf matematik',
  '11. sınıf matematik',
  'LGS matematik',
  'TYT matematik',
  'AYT matematik',
  'matematik yazılı soruları',
  'matematik konu anlatımı',
  'matematik soru çözümü'
];

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateGoogleAccessToken(clientEmail, privateKey, scope) {
  const cleanEmail = (clientEmail || '').replace(/^["']|["']$/g, '').trim();
  let formattedKey = (privateKey || '')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();

  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
  }
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: cleanEmail,
    scope: scope || 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const headerEnc = base64url(Buffer.from(JSON.stringify(header)));
  const claimEnc = base64url(Buffer.from(JSON.stringify(claim)));
  const jwtVal = `${headerEnc}.${claimEnc}`;
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(jwtVal);
  const signature = base64url(sign.sign(formattedKey));
  return `${jwtVal}.${signature}`;
}

/**
 * Fetch Google Search Console Data using existing Service Account credentials
 */
async function fetchGoogleSearchConsoleData() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL || 'https://fullematematigi.com.tr';

  if (!serviceAccountEmail || !privateKey) {
    return {
      connected: false,
      data: [],
      note: 'Search Console kimlik bilgileri (.env) tanımlı değil.'
    };
  }

  try {
    // 1. Generate JWT assertion for Webmasters Readonly scope
    const jwtAssertion = generateGoogleAccessToken(
      serviceAccountEmail,
      privateKey,
      'https://www.googleapis.com/auth/webmasters.readonly'
    );

    // 2. Obtain Access Token from Google OAuth Endpoint
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
      console.warn('[SEO Engine] GSC Token request failed:', errText);
      return {
        connected: false,
        data: [],
        note: `Search Console token alınamadı. Service Account (${serviceAccountEmail}) yetkisini kontrol edin.`
      };
    }

    const { access_token } = await tokenRes.json();

    // 3. Query Search Console Search Analytics API trying candidate site URLs
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const siteCandidates = Array.from(new Set([
      siteUrl,
      'https://fullematematigi.com.tr',
      'https://fullematematigi.com.tr/',
      'sc-domain:fullematematigi.com.tr',
      'https://www.fullematematigi.com.tr/',
      'https://www.fullematematigi.com.tr'
    ]));

    let apiRes = null;
    let lastErrText = '';

    for (const candidate of siteCandidates) {
      const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/searchAnalytics/query`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: thirtyDaysAgo,
          endDate: today,
          dimensions: ['query'],
          rowLimit: 100
        })
      });

      if (res.ok) {
        apiRes = res;
        break;
      } else {
        lastErrText = await res.text();
      }
    }

    if (!apiRes) {
      console.warn('[SEO Engine] GSC API query error on candidates:', lastErrText);
      return {
        connected: false,
        data: [],
        note: `Search Console'a ${serviceAccountEmail} e-postasını mülk kullanıcısı olarak ekleyin (Mülk URL eşleşmeli).`
      };
    }

    const apiData = await apiRes.json();
    const rows = apiData.rows || [];

    const formattedData = rows.map(r => ({
      query: r.keys?.[0] || '',
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      ctr: r.ctr || 0,
      position: r.position || 0
    })).filter(r => r.query);

    return {
      connected: true,
      data: formattedData,
      note: `Google Search Console Bağlı (${formattedData.length} arama sorgusu çekildi)`
    };
  } catch (err) {
    console.warn('[SEO Engine] GSC fetch catch error:', err.message);
    return {
      connected: false,
      data: [],
      note: `Search Console hatası: ${err.message}`
    };
  }
}

/**
 * Submit newly published blog URL directly to Google Indexing API for rapid Google indexing
 */
async function submitUrlToGoogleIndexingApi(targetUrl) {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey || !targetUrl) {
    return { success: false, note: 'Service Account credentials or target URL missing' };
  }

  try {
    const jwtAssertion = generateGoogleAccessToken(
      serviceAccountEmail,
      privateKey,
      'https://www.googleapis.com/auth/indexing'
    );

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
      console.warn('[Google Indexing API] Token request failed:', errText);
      return { success: false, note: errText };
    }

    const { access_token } = await tokenRes.json();

    const publishRes = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: targetUrl,
        type: 'URL_UPDATED'
      })
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      console.warn('[Google Indexing API] Publish URL error:', errText);
      return { success: false, note: errText };
    }

    const publishData = await publishRes.json();
    console.log(`[Google Indexing API] Successfully submitted URL for Google indexing: ${targetUrl}`);
    return { success: true, data: publishData };
  } catch (err) {
    console.warn('[Google Indexing API] Exception:', err.message);
    return { success: false, note: err.message };
  }
}

/**
 * Automatically submit updated sitemap XML URL to Google Search Console API & Ping Service
 */
async function submitSitemapToGoogleSearchConsole(sitemapUrl = 'https://fullematematigi.com.tr/sitemap.xml') {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const siteUrl = process.env.GSC_SITE_URL || 'https://fullematematigi.com.tr';

  if (!serviceAccountEmail || !privateKey) {
    return { success: false, note: 'Service Account credentials missing' };
  }

  try {
    // 1. Send public ping to Google Sitemap crawler
    fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`).catch(() => null);

    // 2. Submit sitemap via Google Search Console API
    const jwtAssertion = generateGoogleAccessToken(
      serviceAccountEmail,
      privateKey,
      'https://www.googleapis.com/auth/webmasters'
    );

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
      console.warn('[GSC Sitemap API] Token request failed:', errText);
      return { success: false, note: errText };
    }

    const { access_token } = await tokenRes.json();

    const siteCandidates = Array.from(new Set([
      siteUrl,
      'https://fullematematigi.com.tr',
      'https://fullematematigi.com.tr/',
      'sc-domain:fullematematigi.com.tr',
      'https://www.fullematematigi.com.tr/',
      'https://www.fullematematigi.com.tr'
    ]));

    let submitted = false;
    for (const candidate of siteCandidates) {
      const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (res.ok) {
        submitted = true;
        break;
      }
    }

    if (submitted) {
      console.log(`[GSC Sitemap API] Successfully submitted updated sitemap to Google Search Console: ${sitemapUrl}`);
      return { success: true };
    } else {
      console.warn('[GSC Sitemap API] Could not submit sitemap to candidates.');
      return { success: false, note: 'Sitemap submission API call failed for candidates' };
    }
  } catch (err) {
    console.warn('[GSC Sitemap API] Exception:', err.message);
    return { success: false, note: err.message };
  }
}

/**
 * Fetch Google Autocomplete / Suggestion Signals
 */
async function fetchGoogleSuggestions(seedKeyword) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=tr&q=${encodeURIComponent(seedKeyword)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    // data format: [query, [suggestion1, suggestion2, ...]]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Calculate Jaccard similarity / Word Overlap between two strings
 */
function calculateTextSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const normalize = (s) => s.toLowerCase().replace(/[^\w\sğüşıöç]/gi, '').split(/\s+/).filter(Boolean);
  const words1 = new Set(normalize(str1));
  const words2 = new Set(normalize(str2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

/**
 * Calculate Opportunity Score (0 - 100)
 */
function calculateOpportunityScore({ keyword, impressions = 0, clicks = 0, ctr = 0, position = 0, source = '' }) {
  let score = 50; // base score

  // GSC Signals
  if (impressions > 0) {
    if (impressions > 500) score += 15;
    else if (impressions > 100) score += 10;

    // High impressions + Low CTR (< 3%) is a huge opportunity!
    if (ctr < 0.03 && impressions > 100) score += 15;

    // Striking distance position (5 - 20)
    if (position >= 5 && position <= 20) score += 15;
  }

  // Suggestion / Autocomplete Signals
  if (source === 'GOOGLE_AUTOCOMPLETE') {
    score += 10;
  }

  // Math & Grade Relevance Boost
  const lowerKw = keyword.toLowerCase();
  if (lowerKw.includes('lgs') || lowerKw.includes('tyt') || lowerKw.includes('ayt')) score += 10;
  if (lowerKw.includes('sınıf') || lowerKw.includes('yazılı') || lowerKw.includes('konu anlatımı') || lowerKw.includes('soru çözümü')) score += 10;

  return Math.min(Math.round(score), 100);
}

/**
 * Main SEO Discovery Scan Execution
 */
async function runSeoDiscoveryScan() {
  const startTime = Date.now();
  console.log('[VERCEL LOG] [SEO Engine] Step 1: Starting SEO Discovery Scan...');

  // 1. Get existing content to perform duplicate/cannibalization checks
  let existingPosts = [];
  let existingDrafts = [];
  try {
    const db = getPrisma();
    existingPosts = await db.blogPost.findMany({ select: { id: true, title: true, slug: true, targetKeyword: true } });
    existingDrafts = await db.aiBlogDraft.findMany({ select: { id: true, title: true, slug: true, targetKeyword: true } });
    console.log(`[VERCEL LOG] [SEO Engine] Loaded ${existingPosts.length} existing posts and ${existingDrafts.length} drafts.`);
  } catch (dbErr) {
    console.warn('[VERCEL LOG] [SEO Engine] DB read warning:', dbErr.message);
  }

  console.log('[VERCEL LOG] [SEO Engine] Step 2: Querying Google Search Console...');
  const gscResult = await fetchGoogleSearchConsoleData();
  console.log(`[VERCEL LOG] [SEO Engine] GSC Connected: ${gscResult.connected}, Note: ${gscResult.note}`);
  const collectedQueries = new Map();

  // Process GSC Queries if available
  if (gscResult.connected && gscResult.data.length > 0) {
    for (const item of gscResult.data) {
      collectedQueries.set(item.query.toLowerCase().trim(), {
        keyword: item.query.trim(),
        source: 'GOOGLE_SEARCH_CONSOLE',
        impressions: item.impressions || 0,
        clicks: item.clicks || 0,
        ctr: item.ctr || 0,
        position: item.position || 0,
        trendData: JSON.stringify({ source: 'GSC' })
      });
    }
  }

  // 2. Fetch Google Suggestions for Seed Keywords in Parallel
  const suggestionResults = await Promise.all(
    SEED_KEYWORDS.map(async (seed) => {
      const suggestions = await fetchGoogleSuggestions(seed);
      return { seed, suggestions };
    })
  );

  for (const { seed, suggestions } of suggestionResults) {
    collectedQueries.set(seed.toLowerCase().trim(), {
      keyword: seed.trim(),
      source: 'GOOGLE_AUTOCOMPLETE',
      impressions: 150,
      clicks: 12,
      ctr: 0.08,
      position: 8,
      trendData: JSON.stringify({ seed })
    });

    for (const sug of suggestions) {
      const normalizedSug = sug.toLowerCase().trim();
      if (!collectedQueries.has(normalizedSug)) {
        collectedQueries.set(normalizedSug, {
          keyword: sug.trim(),
          source: 'GOOGLE_AUTOCOMPLETE',
          impressions: 80,
          clicks: 5,
          ctr: 0.06,
          position: 12,
          trendData: JSON.stringify({ seed })
        });
      }
    }
  }

  let opportunitiesCreated = 0;
  const maxToProcess = 20;
  const processedItems = [];

  // 3. Process & Score each collected query
  for (const [key, rawData] of collectedQueries.entries()) {
    if (processedItems.length >= maxToProcess) break;

    const score = calculateOpportunityScore(rawData);

    // Duplicate & Cannibalization Check against existing blog posts
    let isDuplicate = false;
    let targetPostId = null;
    let matchingPostTitle = '';

    for (const post of existingPosts) {
      const simWithTitle = calculateTextSimilarity(rawData.keyword, post.title);
      const simWithKw = calculateTextSimilarity(rawData.keyword, post.targetKeyword || '');

      if (simWithTitle > 0.6 || simWithKw > 0.7) {
        isDuplicate = true;
        targetPostId = post.id;
        matchingPostTitle = post.title;
        break;
      }
    }

    // Determine status & reason
    let status = 'NEW';
    let reason = `Yüksek arama potansiyeli ve müfredat uyumu (Skor: ${score})`;

    if (isDuplicate) {
      status = 'UPDATING_SUGGESTED';
      reason = `Mevcut içeriği güncelle: "${matchingPostTitle}" (Benzer arama niyeti tespit edildi)`;
    } else if (score >= 80) {
      reason = `Yüksek öncelikli arama sorgusu (Skor: ${score}). Blog yazılması önerilir.`;
    }

    // Save or update in SeoOpportunity DB
    try {
      const db = getPrisma();
      const savedOpp = await db.seoOpportunity.upsert({
        where: { keyword: rawData.keyword },
        update: {
          score,
          impressions: rawData.impressions,
          clicks: rawData.clicks,
          ctr: rawData.ctr,
          position: rawData.position,
          reason,
          status: status === 'NEW' ? undefined : status,
          targetPostId: targetPostId || undefined,
          updatedAt: new Date()
        },
        create: {
          keyword: rawData.keyword,
          source: rawData.source,
          score,
          impressions: rawData.impressions,
          clicks: rawData.clicks,
          ctr: rawData.ctr,
          position: rawData.position,
          trendData: rawData.trendData,
          reason,
          status,
          targetPostId
        }
      });

      opportunitiesCreated++;
      processedItems.push(savedOpp);
    } catch (saveErr) {
      console.warn('[SEO Engine] DB save warning for key:', rawData.keyword, saveErr.message);
      processedItems.push({
        keyword: rawData.keyword,
        source: rawData.source,
        score,
        impressions: rawData.impressions,
        clicks: rawData.clicks,
        ctr: rawData.ctr,
        position: rawData.position,
        reason,
        status
      });
    }
  }

  // 4. Log execution
  try {
    const db = getPrisma();
    await db.seoLog.create({
      data: {
        action: 'SEO_DISCOVERY_SCAN',
        queriesFound: collectedQueries.size,
        opportunitiesCreated,
        status: 'SUCCESS',
        details: JSON.stringify({
          durationMs: Date.now() - startTime,
          gscConnected: gscResult.connected
        })
      }
    });
  } catch (logErr) {
    console.warn('[SEO Engine] Log write warning:', logErr.message);
  }

  return {
    success: true,
    queriesFound: collectedQueries.size,
    opportunitiesCreated,
    gscConnected: gscResult.connected,
    items: processedItems
  };
}

module.exports = {
  runSeoDiscoveryScan,
  fetchGoogleSearchConsoleData,
  submitUrlToGoogleIndexingApi,
  submitSitemapToGoogleSearchConsole,
  calculateOpportunityScore,
  calculateTextSimilarity
};
