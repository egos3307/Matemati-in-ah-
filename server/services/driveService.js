/**
 * Google Drive Video Kayıtları Yardımcı Servisi
 * Fullematematiği - Hızlı ve Güvenli İzleme Sistemi
 */

/**
 * Verilen metin veya URL'den Google Drive fileId'sini güvenli bir şekilde ayıklar.
 * Desteklenen formatlar:
 * - drive:FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view...
 * - https://drive.google.com/file/d/FILE_ID/edit...
 * - https://drive.google.com/file/d/FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?export=download&id=FILE_ID
 * - Yalın Google Drive File ID (25-50 karakterlik alfanümerik, tire ve alt çizgi içeren ID)
 */
function extractDriveFileId(input) {
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

  // 4. Doğrudan yalın fileId girilmişse (Drive klasör linkleri hariç tutulur)
  if (!trimmed.includes('/') && !trimmed.includes('?') && isValidDriveFileId(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Drive File ID format doğrulaması
 */
function isValidDriveFileId(id) {
  if (!id || typeof id !== 'string') return false;
  // Google Drive file ID'leri tipik olarak 25 ila 45 karakter arasında alfanümerik, tire ve altçizgiden oluşur
  return /^[a-zA-Z0-9_-]{15,60}$/.test(id);
}

/**
 * İlgili dosyanın yalnızca kendi bağlantısıyla izlenebilmesi için
 * Google Drive üzerinde dosya bazında "anyone with link" reader iznini kontrol eder ve tanımlar.
 * 
 * ÖNEMLİ:
 * - Ana kayıt klasörüne ASLA izin verilmez.
 * - Sadece bu tekil dosyanın ID'sine izin verilir.
 * - Bu sayede kullanıcı videoyu açtığında klasördeki diğer videolara veya ana klasöre erişemez.
 */
async function ensureDriveFileReadable(fileId, getAccessTokenFn) {
  if (!isValidDriveFileId(fileId) || typeof getAccessTokenFn !== 'function') {
    return false;
  }

  try {
    const authData = await getAccessTokenFn();
    if (!authData || !authData.token) {
      console.warn(`[Drive Perm] Access token alınamadı. File ID: ${fileId}`);
      return false;
    }

    const token = authData.token;

    // 1. Mevcut izinleri kontrol et
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (listRes.ok) {
      const permData = await listRes.json();
      const hasAnyoneReader = (permData.permissions || []).some(
        p => p.type === 'anyone' && (p.role === 'reader' || p.role === 'viewer')
      );
      if (hasAnyoneReader) {
        // İzin zaten mevcut
        return true;
      }
    }

    // 2. Yalnızca bu dosyaya "anyone: reader" izni ekle
    const createRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      }
    );

    if (createRes.ok) {
      console.log(`[Drive Perm] Dosyaya link ile izleme izni verildi: ${fileId}`);
      return true;
    } else {
      const errText = await createRes.text();
      console.warn(`[Drive Perm] Dosya izni eklenemedi (${fileId}): ${errText}`);
      return false;
    }
  } catch (err) {
    console.warn(`[Drive Perm Hatası] ${fileId}:`, err.message);
    return false;
  }
}

/**
 * Google Drive ana kayıt klasörünün izinlerini denetler.
 * Ana klasörün herkese açık ('anyone') olup olmadığını tespit eder.
 */
async function inspectDriveFolderSecurity(folderId, getAccessTokenFn) {
  if (!folderId || typeof getAccessTokenFn !== 'function') {
    return { secure: true, message: 'Klasör ID veya auth fonksiyonu yok' };
  }

  try {
    const authData = await getAccessTokenFn();
    if (!authData || !authData.token) {
      return { secure: false, message: 'Drive access token temin edilemedi.' };
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role)`,
      {
        headers: { Authorization: `Bearer ${authData.token}` }
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return { secure: false, message: `Klasör izinleri sorgulanamadı: ${err}` };
    }

    const data = await res.json();
    const permissions = data.permissions || [];
    const publicPerms = permissions.filter(p => p.type === 'anyone');

    if (publicPerms.length > 0) {
      console.warn(`[Drive GÜVENLİK UYARISI] Ana ders kayıt klasöründe '${publicPerms.map(p => p.role).join(', ')}' türünde herkese açık izin bulundu!`);
      return {
        secure: false,
        hasPublicPermission: true,
        publicPermissions: publicPerms,
        message: 'Ana klasörde herkese açık izin bulundu. Dosya bazlı güvenlik için bu kaldırılmalıdır.'
      };
    }

    return {
      secure: true,
      hasPublicPermission: false,
      message: 'Ana klasör güvenli. Yalnızca yetkili hesapların erişimi var.'
    };
  } catch (err) {
    return { secure: false, message: err.message };
  }
}

/**
 * Dosya için standart Google Drive izleme URL'sini oluşturur.
 */
function buildDriveWatchUrl(fileId) {
  if (!isValidDriveFileId(fileId)) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Hem eski tekli kayıtları hem de çoklu kayıtları ayrıştırır.
 * Desteklenen formatlar:
 * - "drive:ID"
 * - "drive:ID1, drive:ID2"
 * - "drive:ID1\ndrive:ID2"
 * - "https://drive.google.com/... , https://drive.google.com/..."
 * - JSON listesi: '["drive:ID1", "drive:ID2"]'
 */
function parseLessonRecordings(rawInput) {
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

/**
 * Dosya adından ders ID'sini tespit eder.
 * Örnekler: lesson_42.webm, lesson-42.mp4, lesson 42.webm, Ders_42_Kayit.mp4, 42_lesson.mp4
 */
function extractLessonIdFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const m = filename.match(/(?:lesson|ders|Ders|LESSON)[_\s-](\d+)/i);
  if (m && m[1]) return parseInt(m[1], 10);
  const m2 = filename.match(/^(\d+)[_\s\.]/);
  if (m2 && m2[1]) return parseInt(m2[1], 10);
  return null;
}

// Google Drive klasör sorgusu önbelleği (30 saniye TTL - API kotasını korur)
let _driveFolderCache = null;
let _driveFolderCacheTime = 0;
const DRIVE_FOLDER_CACHE_TTL = 30 * 1000;

/**
 * Google Drive ana kayıt klasöründeki tüm video dosyalarını tarar ve ders ID'lerine göre gruplar.
 */
async function scanDriveFolderRecordings(getAccessTokenFn, folderIdOverride = null) {
  const folderId = folderIdOverride || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || typeof getAccessTokenFn !== 'function') return _driveFolderCache || new Map();

  const now = Date.now();
  if (!folderIdOverride && _driveFolderCache && (now - _driveFolderCacheTime < DRIVE_FOLDER_CACHE_TTL)) {
    return _driveFolderCache;
  }

  try {
    const authData = await getAccessTokenFn();
    if (!authData || !authData.token) return _driveFolderCache || new Map();

    const cleanFolderId = String(folderId).replace(/^['"]|['"]$/g, '').trim();
    const folderMatch = cleanFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
    const targetFolderId = folderMatch ? folderMatch[1] : cleanFolderId;

    const query = encodeURIComponent(`'${targetFolderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime)&supportsAllDrives=true&orderBy=createdTime asc&pageSize=1000`,
      {
        headers: { Authorization: `Bearer ${authData.token}` }
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Drive Scan] Klasör listeleme uyarısı (${targetFolderId}):`, errText);
      return _driveFolderCache || new Map();
    }

    const data = await res.json();
    const files = data.files || [];

    const lessonFilesMap = new Map();

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') continue;

      const lessonId = extractLessonIdFromFilename(file.name);
      if (lessonId) {
        if (!lessonFilesMap.has(lessonId)) {
          lessonFilesMap.set(lessonId, []);
        }
        lessonFilesMap.get(lessonId).push({
          fileId: file.id,
          name: file.name,
          createdTime: file.createdTime
        });
      }
    }

    if (!folderIdOverride) {
      _driveFolderCache = lessonFilesMap;
      _driveFolderCacheTime = now;
    }

    return lessonFilesMap;
  } catch (err) {
    console.warn(`[Drive Scan Hatası]:`, err.message);
    return _driveFolderCache || new Map();
  }
}

/**
 * Ders listesini Google Drive'daki güncel dosyalar ile senkronize eder.
 * Drive'da bir derse ait 2 veya daha fazla kayıt varsa, veritabanını ve ders nesnesini
 * otomatik olarak "drive:ID1, drive:ID2" şeklinde günceller.
 */
async function syncLessonsWithDrive(lessons, prisma, getAccessTokenFn) {
  if (!lessons || lessons.length === 0) return lessons;

  try {
    const driveMap = await scanDriveFolderRecordings(getAccessTokenFn);
    if (!driveMap || driveMap.size === 0) return lessons;

    for (const lesson of lessons) {
      const driveFiles = driveMap.get(lesson.id);

      if (driveFiles && driveFiles.length > 0) {
        const existingRecordings = parseLessonRecordings(lesson.recordingUrl);
        const existingFileIds = new Set(existingRecordings.map(r => r.fileId).filter(Boolean));

        const missingFromDb = driveFiles.filter(df => !existingFileIds.has(df.fileId));

        if (missingFromDb.length > 0 || (driveFiles.length > 1 && existingRecordings.length < driveFiles.length)) {
          const allFileIds = [];
          const addedSet = new Set();

          // İlk oluşturulan dosya 1. Kayıt, sonraki 2. Kayıt olacak şekilde Drive'daki sıralamayı koru
          for (const df of driveFiles) {
            if (!addedSet.has(df.fileId)) {
              addedSet.add(df.fileId);
              allFileIds.push(`drive:${df.fileId}`);
              ensureDriveFileReadable(df.fileId, getAccessTokenFn).catch(() => {});
            }
          }

          // Veritabanındaki diğer mevcut linkleri de koru
          for (const er of existingRecordings) {
            if (er.fileId && !addedSet.has(er.fileId)) {
              addedSet.add(er.fileId);
              allFileIds.push(`drive:${er.fileId}`);
            } else if (!er.fileId && er.watchUrl && !addedSet.has(er.watchUrl)) {
              addedSet.add(er.watchUrl);
              allFileIds.push(er.watchUrl);
            }
          }

          const newRecordingUrl = allFileIds.join(', ');
          if (newRecordingUrl !== lesson.recordingUrl) {
            lesson.recordingUrl = newRecordingUrl;
            lesson.recordingRequested = true;
            if (prisma && prisma.lesson) {
              prisma.lesson.update({
                where: { id: lesson.id },
                data: { recordingUrl: newRecordingUrl, recordingRequested: true }
              }).catch(e => console.warn(`[Drive Sync DB Error] Lesson ${lesson.id}:`, e.message));
            }
            console.log(`[Drive Sync] Lesson ${lesson.id} için Drive'dan ${driveFiles.length} adet kayıt senkronize edildi: ${newRecordingUrl}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Drive Sync Hatası]:', err.message);
  }

  return lessons;
}

module.exports = {
  extractDriveFileId,
  isValidDriveFileId,
  ensureDriveFileReadable,
  inspectDriveFolderSecurity,
  buildDriveWatchUrl,
  parseLessonRecordings,
  extractLessonIdFromFilename,
  scanDriveFolderRecordings,
  syncLessonsWithDrive
};
