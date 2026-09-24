/**
 * Ders Kayıtları - Google Drive Migration & Backfill Scripti
 * Idempotent, Güvenli, Non-Destructive
 * 
 * Kullanım:
 *   node migrate_recordings.js --dry-run   (Sadece analiz yapar, değişiklik yapmaz)
 *   node migrate_recordings.js             (Güvenli aktarımı gerçekleştirir)
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  extractDriveFileId,
  isValidDriveFileId,
  ensureDriveFileReadable,
  inspectDriveFolderSecurity
} = require('./services/driveService');

// server/index.js içerisindeki token alma mantığıyla aynı
const crypto = require('crypto');

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateGoogleAccessToken(clientEmail, privateKey) {
  let formattedKey = privateKey.replace(/\\n/g, '\n').trim();
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----\n`;
  }
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const headerEnc = base64url(Buffer.from(JSON.stringify(header)));
  const claimEnc = base64url(Buffer.from(JSON.stringify(claim)));
  const jwtVal = `${headerEnc}.${claimEnc}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(jwtVal);
  const signature = base64url(sign.sign(formattedKey));
  return `${jwtVal}.${signature}`;
}

async function getGoogleDriveAccessToken() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (refreshToken && clientId && clientSecret) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { token: data.access_token, type: 'OAuth2' };
      }
    } catch (err) {
      console.warn(`[Drive Auth] OAuth2 hatası: ${err.message}`);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    return null;
  }

  try {
    const jwt = generateGoogleAccessToken(email, privateKey);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    if (res.ok) {
      const data = await res.json();
      return { token: data.access_token, type: 'ServiceAccount' };
    }
  } catch (err) {
    console.warn(`[Drive Auth] Service Account hatası: ${err.message}`);
  }
  return null;
}

// Drive klasöründeki dosyaları listeleme (kesin eşleştirme için)
async function fetchDriveFolderFiles(folderId, accessToken) {
  if (!folderId || !accessToken) return [];
  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime)&supportsAllDrives=true&pageSize=1000`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.files || [];
    }
  } catch (e) {
    console.warn('[Drive List] Klasör dosyaları listelenemedi:', e.message);
  }
  return [];
}

async function runMigration() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('====================================================');
  console.log(`DERS KAYITLARI GOOGLE DRIVE MIGRATION (${isDryRun ? 'DRY-RUN / ANALİZ MODU' : 'CANLI ÇALIŞTIRMA'})`);
  console.log('====================================================\n');

  // 1. Google Drive Yetkilendirme & Klasör Güvenlik Kontrolü
  let accessToken = null;
  let authData = null;
  let driveFiles = [];
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  try {
    authData = await getGoogleDriveAccessToken();
    if (authData && authData.token) {
      accessToken = authData.token;
      console.log(`[Drive] Google Drive bağlantısı başarılı (${authData.type}).`);

      if (folderId) {
        const secReport = await inspectDriveFolderSecurity(folderId, getGoogleDriveAccessToken);
        console.log(`[Drive Klasör Güvenliği]: ${secReport.message}`);
        if (secReport.hasPublicPermission) {
          console.warn('⚠️ DİKKAT: Ana klasörde public izin var! Öğrencilere klasör seviyesinde izin verilmemeli.');
        }

        driveFiles = await fetchDriveFolderFiles(folderId, accessToken);
        console.log(`[Drive Dosyaları] Ana kayıt klasöründe ${driveFiles.length} dosya tespit edildi.\n`);
      }
    } else {
      console.warn('[Drive Uyarısı] Google Drive erişim anahtarları bulunamadı. Sadece URL ve database analizi yapılacak.\n');
    }
  } catch (authErr) {
    console.warn(`[Drive Auth Uyarısı] ${authErr.message}\n`);
  }

  // 2. Veritabanındaki Ders Kayıtlarını Çek
  let allLessons = [];
  let isSqlite = false;
  let sqliteDb = null;

  try {
    allLessons = await prisma.lesson.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } }
      }
    });
  } catch (dbErr) {
    console.error('❌ Veritabanı sorgu hatası: DATABASE_URL geçerli bir PostgreSQL veritabanına işaret etmelidir.', dbErr.message);
    process.exit(1);
  }

  console.log(`Toplam Aktif Ders Sayısı: ${allLessons.length}`);

  // İstatistikler
  let totalWithRecording = 0;
  let alreadyHasFileId = 0;
  let extractedFromUrl = 0;
  let matchedViaApi = 0;
  let ambiguousMultipleMatches = 0;
  let unmatchable = 0;
  let successfullyProcessed = 0;

  const unmatchableLessons = [];
  const ambiguousLessons = [];
  const convertedLessons = [];

  async function updateLessonRecordingUrl(lessonId, newUrl) {
    if (isSqlite && sqliteDb) {
      sqliteDb.prepare('UPDATE Lesson SET recordingUrl = ?, recordingRequested = 1 WHERE id = ?').run(newUrl, lessonId);
    } else {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: { recordingUrl: newUrl, recordingRequested: true }
      });
    }
  }

  for (const lesson of allLessons) {
    const rawUrl = lesson.recordingUrl ? lesson.recordingUrl.trim() : null;

    if (!rawUrl && !lesson.recordingRequested) {
      continue; // Bu derste hiçbir kayıt talep edilmemiş veya kaydedilmemiş
    }

    totalWithRecording++;

    // Durum A: Zaten drive:FILE_ID formatında mı?
    if (rawUrl && rawUrl.startsWith('drive:')) {
      const fileId = rawUrl.replace('drive:', '').trim();
      if (isValidDriveFileId(fileId)) {
        alreadyHasFileId++;
        successfullyProcessed++;

        // Canlı modda dosya bazlı izinleri güvenceye al
        if (!isDryRun && accessToken) {
          await ensureDriveFileReadable(fileId, getGoogleDriveAccessToken);
        }
        continue;
      }
    }

    // Durum B: Eski Google Drive URL formatı var mı?
    const extractedId = extractDriveFileId(rawUrl);
    if (extractedId) {
      extractedFromUrl++;
      convertedLessons.push({
        lessonId: lesson.id,
        title: lesson.title,
        oldUrl: rawUrl,
        newUrl: `drive:${extractedId}`,
        fileId: extractedId,
        source: 'URL_EXTRACTION'
      });

      if (!isDryRun) {
        await updateLessonRecordingUrl(lesson.id, `drive:${extractedId}`);
        if (accessToken) {
          await ensureDriveFileReadable(extractedId, getGoogleDriveAccessToken);
        }
      }
      successfullyProcessed++;
      continue;
    }

    // Durum C: URL yok veya drive formatında değil ama Drive API dosyaları mevcut
    // KESİNLİKLE TAHMİN ETMİYORUZ. Yalnızca dosya adı tam olarak lesson_${lesson.id}.* olanları arıyoruz.
    if (driveFiles.length > 0) {
      const exactNameWebm = `lesson_${lesson.id}.webm`;
      const exactNameMp4 = `lesson_${lesson.id}.mp4`;

      const matches = driveFiles.filter(f => f.name === exactNameWebm || f.name === exactNameMp4);

      if (matches.length === 1) {
        matchedViaApi++;
        const matchedFile = matches[0];
        convertedLessons.push({
          lessonId: lesson.id,
          title: lesson.title,
          oldUrl: rawUrl,
          newUrl: `drive:${matchedFile.id}`,
          fileId: matchedFile.id,
          source: `DRIVE_API_EXACT_FILENAME (${matchedFile.name})`
        });

        if (!isDryRun) {
          await updateLessonRecordingUrl(lesson.id, `drive:${matchedFile.id}`);
          await ensureDriveFileReadable(matchedFile.id, getGoogleDriveAccessToken);
        }
        successfullyProcessed++;
        continue;
      } else if (matches.length > 1) {
        ambiguousMultipleMatches++;
        ambiguousLessons.push({
          lessonId: lesson.id,
          title: lesson.title,
          oldUrl: rawUrl,
          candidates: matches.map(m => ({ id: m.id, name: m.name, size: m.size }))
        });
        continue;
      }
    }

    // Durum D: Eşleştirilemedi
    unmatchable++;
    unmatchableLessons.push({
      lessonId: lesson.id,
      title: lesson.title,
      teacher: lesson.teacher?.name || 'Bilinmiyor',
      student: lesson.student?.name || 'Bilinmiyor',
      date: lesson.date,
      oldRecordingUrl: rawUrl
    });
  }

  // 3. MIGRATION RAPORU
  console.log('====================================================');
  console.log('MIGRATION VE ANALİZ SONUÇLARI RAPORU');
  console.log('====================================================');
  console.log(`- İncelenen toplam kayıtlı / kayıt talepli ders : ${totalWithRecording}`);
  console.log(`- Zaten geçerli Drive fileId'si olan kayıtlar   : ${alreadyHasFileId}`);
  console.log(`- Eski Drive URL'sinden fileId çıkarılanlar    : ${extractedFromUrl}`);
  console.log(`- Drive API ile tam isimle kesin eşleşenler     : ${matchedViaApi}`);
  console.log(`- Birden fazla olası dosya bulunanlar (bağlanmadı): ${ambiguousMultipleMatches}`);
  console.log(`- Eşleştirilemeyen kayıtlar                     : ${unmatchable}`);
  console.log(`- Toplam başarıyla yeni sisteme entegre olan   : ${successfullyProcessed}`);
  console.log('----------------------------------------------------');

  if (convertedLessons.length > 0) {
    console.log(`\n✅ Dönüştürülen Kayıtlar (${convertedLessons.length} adet):`);
    convertedLessons.forEach(c => {
      console.log(`  - Ders #${c.lessonId} ("${c.title}") -> File ID: ${c.fileId} [Kaynak: ${c.source}]`);
    });
  }

  if (ambiguousLessons.length > 0) {
    console.log(`\n⚠️ Birden Fazla Dosya Bulunup Güvenlik Nedeniyle Otomatik Eşleştirilmeyenler (${ambiguousLessons.length} adet):`);
    ambiguousLessons.forEach(a => {
      console.log(`  - Ders #${a.lessonId} ("${a.title}"): ${JSON.stringify(a.candidates)}`);
    });
  }

  if (unmatchableLessons.length > 0) {
    console.log(`\n❌ Eşleştirilemeyen Kayıtlar (${unmatchableLessons.length} adet):`);
    unmatchableLessons.forEach(u => {
      console.log(`  - Ders #${u.lessonId} | Başlık: "${u.title}" | Öğrenci: ${u.student} | Öğretmen: ${u.teacher} | Mevcut URL: ${u.oldRecordingUrl || 'Yok'}`);
    });
  }

  console.log('\n====================================================');
  if (isDryRun) {
    console.log('DRY-RUN tamamlandı. Veritabanında hiçbir değişiklik yapılmadı.');
    console.log('Gerçek dönüşüm için: node migrate_recordings.js komutunu çalıştırabilirsiniz.');
  } else {
    console.log('✅ CANLI MIGRATION TAMAMLANDI. Tüm kayıtlar idempotent olarak güncellendi.');
  }
  console.log('====================================================\n');
}

runMigration()
  .catch(err => {
    console.error('Migration kritik hata:', err);
  })
  .finally(() => prisma.$disconnect());
