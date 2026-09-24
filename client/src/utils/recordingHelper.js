/**
 * Ders Kayıtları Ayrıştırıcı ve Yardımcı Fonksiyonlar
 * Matematiğin Şahı - Çoklu Kayıt Desteği (1. ve 2. Kayıt vb.)
 */

export function isValidDriveFileId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{15,60}$/.test(id.trim());
}

export function extractDriveFileId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. drive:FILE_ID formatı
  if (trimmed.startsWith('drive:')) {
    const withoutPrefix = trimmed.replace('drive:', '').trim();
    const firstPart = withoutPrefix.split(/[\r\n,;|]+/)[0].trim();
    if (isValidDriveFileId(firstPart)) return firstPart;
    if (isValidDriveFileId(withoutPrefix)) return withoutPrefix;
  }

  // 2. /file/d/FILE_ID formatı
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // 3. id=FILE_ID parametresi (open?id=, uc?id= vb.)
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // 4. Doğrudan yalın fileId girilmişse
  if (!trimmed.includes('/') && !trimmed.includes('?') && isValidDriveFileId(trimmed)) {
    return trimmed;
  }

  return null;
}

export function buildDriveWatchUrl(fileId) {
  if (!isValidDriveFileId(fileId)) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Hem eski tekli kayıtları (drive:ID veya doğrudan link)
 * hem de yeni/eski çoklu kayıtları (virgül, satır sonu, JSON listesi vb.)
 * ayrıştırarak standart bir dizi döndürür.
 * 
 * @param {string|null|undefined} rawInput
 * @returns {Array<{part: number, title: string, shortTitle: string, watchUrl: string, fileId: string|null, type: string}>}
 */
export function parseLessonRecordings(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  let rawList = [];

  // JSON Listesi mi kontrol et
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson)) {
        rawList = parsedJson.map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.url || item.recordingUrl || item.watchUrl || '';
          return '';
        }).filter(Boolean);
      } else if (parsedJson && typeof parsedJson === 'object') {
        const u = parsedJson.url || parsedJson.recordingUrl || parsedJson.watchUrl;
        if (u) rawList = [u];
      }
    } catch {
      // JSON değilse standart parçalamaya devam et
    }
  }

  if (rawList.length === 0) {
    const segments = trimmed.split(/[\r\n,;|]+/);
    for (const seg of segments) {
      const cleanSeg = seg.trim();
      if (!cleanSeg) continue;
      // Eğer segment içinde birden fazla 'drive:' varsa split et
      if (cleanSeg.includes('drive:') && cleanSeg.indexOf('drive:') !== cleanSeg.lastIndexOf('drive:')) {
        const sub = cleanSeg.split(/(?=drive:)/g);
        for (const s of sub) {
          if (s.trim()) rawList.push(s.trim());
        }
      } else if ((cleanSeg.match(/https?:\/\//g) || []).length > 1) {
        const sub = cleanSeg.split(/(?=https?:\/\/)/g);
        for (const s of sub) {
          if (s.trim()) rawList.push(s.trim());
        }
      } else {
        rawList.push(cleanSeg);
      }
    }
  }

  const results = [];
  const seenKeys = new Set();

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i].trim();
    if (!item) continue;

    const fileId = extractDriveFileId(item);
    let watchUrl = null;
    let type = 'unknown';

    if (fileId) {
      watchUrl = buildDriveWatchUrl(fileId);
      type = 'drive';
    } else if (item.startsWith('http://') || item.startsWith('https://')) {
      watchUrl = item;
      type = 'external';
    } else if (item.startsWith('/')) {
      watchUrl = item;
      type = 'local';
    }

    if (!watchUrl) continue;

    const dedupeKey = fileId ? `drive:${fileId}` : watchUrl;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const partNum = results.length + 1;
    results.push({
      part: partNum,
      title: `${partNum}. Kayıt`,
      shortTitle: `${partNum}. Kaydı İzle`,
      type,
      fileId,
      watchUrl,
      raw: item
    });
  }

  if (results.length === 1) {
    results[0].title = 'Ders Kaydı';
    results[0].shortTitle = 'Kaydı İzle';
  }

  return results;
}
