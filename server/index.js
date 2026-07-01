const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('./middleware/auth');
const crypto = require('crypto');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);


async function createDailyRoom() {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Daily.co API error:', errText);
      return null;
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error creating Daily.co room:', error.message);
    return null;
  }
}

const path = require('path');
const fs = require('fs');
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Database is loaded directly via Prisma using DATABASE_URL environment variable

const app = express();
const prisma = new PrismaClient();

// Seed camps if none exist
async function seedCamps() {
  try {
    const count = await prisma.camp.count();
    if (count === 0) {
      console.log('Seeding initial 2 camps/courses...');
      await prisma.camp.createMany({
        data: [
          {
            badge: '5, 6, 7 ve 8. Sınıflar',
            title: 'Ortaokul Yeni Nesil Soru Çözüm Kampı',
            subtitle: 'LGS ve Okul Sınavları İçin Sağlam Altyapı',
            image: '/IMG_3001.jpeg',
            details: JSON.stringify([
              { icon: 'calendar_month', label: 'Tarih', value: '3 Temmuz - 6 Eylül' },
              { icon: 'schedule', label: 'Ders Programı', value: 'Haftada 4 Ders' },
              { icon: 'filter_list', label: 'Toplam', value: '18 Canlı Ders' },
              { icon: 'videocam', label: 'Eğitim Türü', value: 'Online Canlı Eğitim (Zoom)' }
            ]),
            description: 'Ders kayıtları Google Drive üzerinden paylaşılacak ve öğrenciler istedikleri zaman tekrar izleyebilecektir. Ders notları ve ödevlendirme desteği mevcuttur.',
            highlights: JSON.stringify([
              'Yeni nesil soru mantığını öğren',
              'Matematiksel okuma ve yorumlama becerini geliştir',
              'Temel eksiklerini tamamla',
              'Çözümlü örneklerle soru çözüm tekniklerini öğren',
              'LGS ve okul sınavları için sağlam altyapı oluştur'
            ]),
            whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20Ortaokul%20Yeni%20Nesil%20Soru%20Çözüm%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
          },
          {
            badge: 'Lisans & Ön Lisans Adayları',
            title: 'KPSS Lisans & Ön Lisans Matematik Kampı',
            subtitle: 'Matematikte Eksiklerini Kapat, Netlerini Zirveye Taşı!',
            image: '/IMG_2999.jpeg',
            details: JSON.stringify([
              { icon: 'calendar_month', label: 'Tarih', value: '3 Temmuz - 4 Eylül (Lisans Bitiş)' },
              { icon: 'schedule', label: 'Ders Programı', value: 'Haftada 6 Ders (Dersler 40 dk)' },
              { icon: 'filter_list', label: 'Toplam', value: '54 Canlı Ders' },
              { icon: 'videocam', label: 'Eğitim Türü', value: 'Online Canlı Eğitim (Zoom)' }
            ]),
            description: 'Kaçırılan dersler için Google Drive üzerinden kayıt erişimi sağlanır. KPSS Lisans ve Ön Lisans Matematik konularının tamamı, konu anlatımları, çözümlü ders notları (PDF), çıkmış soruların detaylı çözümleri ve 35+ çözümlü PDF soru havuzunu içerir.',
            highlights: JSON.stringify([
              'Tüm KPSS Lisans ve Ön Lisans matematik konuları',
              'Detaylı konu anlatımları ve çıkmış soruların pratik çözümleri',
              'Özel çözümlü ders notları (PDF) ve 35+ çözümlü PDF soruları',
              'Kaçırılan dersleri dilediğiniz zaman tekrar izleme imkanı',
              'Sınava sağlam ve eksiksiz bir hazırlık süreci'
            ]),
            whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20KPSS%20Lisans%20&%20Ön%20Lisans%20Matematik%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
          }
        ]
      });
      console.log('Seeding initial camps completed.');
    }
  } catch (err) {
    console.error('Error seeding camps:', err);
  }
}
seedCamps();

const PORT = process.env.PORT || 5000;

// Vercel ve benzeri reverse proxy ortamları için gerekli
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve static recorded lessons
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Fullematematik API is running...');
});

// Debug endpoint kaldırıldı (güvenlik)

// Auth Routes
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password, studentCode, loginType } = req.body;
  console.log('Login attempt:', { email, studentCode, loginType }); // Debug log
  try {
    let user;
    if (loginType === 'STUDENT') {
      const normalizedCode = (studentCode || '').trim().toUpperCase();
      if (normalizedCode.startsWith('FMV')) {
        // Parent login via parent code
        user = await prisma.user.findUnique({ where: { parentCode: normalizedCode } });
        if (!user) {
          console.log('Parent user not found');
          return res.status(400).json({ message: 'Geçersiz bilgiler' });
        }
        // Force role to PARENT for session
        user = { ...user, role: 'PARENT' };
      } else {
        // Student login
        user = await prisma.user.findUnique({ where: { studentCode: normalizedCode } });
        if (!user) {
          console.log('Student user not found');
          return res.status(400).json({ message: 'Geçersiz bilgiler' });
        }
      }
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log('User not found');
        return res.status(400).json({ message: 'Geçersiz bilgiler' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch');
        return res.status(400).json({ message: 'Geçersiz bilgiler' });
      }
      
      // Auto upgrade specific emails to HEAD_TEACHER
      if ((email === 'burakcelik@fullematematigi.com.tr' || email === 'test@fulle.com') && user.role !== 'HEAD_TEACHER') {
        user = await prisma.user.update({
          where: { email },
          data: { role: 'HEAD_TEACHER' }
        });
        console.log(`User ${email} automatically upgraded to HEAD_TEACHER in DB`);
      }
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, grade: user.grade },
      secret,
      { expiresIn: '1d' }
    );

    console.log('Login successful for:', user.email || user.studentCode || user.parentCode);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        studentCode: user.studentCode,
        parentCode: user.parentCode,
        grade: user.grade,
        parentName: user.parentName,
        parentTel: user.parentTel,
        studentTel: user.studentTel
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher Routes
app.post('/api/teacher/add-student', auth, checkRole('TEACHER'), async (req, res) => {
  const { email, password, name, grade, parentName, parentTel, studentTel, serviceProvided, paymentStatus, paymentDay, paymentAmount, paymentNote } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'student', 10);
    
    // Generate unique FMXXX and FMVXXX codes
    let studentCode;
    let parentCode;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
      studentCode = `FM${randomNum}`;
      parentCode = `FMV${randomNum}`;
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { studentCode },
            { parentCode }
          ]
        }
      });
      if (!existing) isUnique = true;
    }

    const finalEmail = email || `${studentCode.toLowerCase()}@fulle.com`;

    const student = await prisma.user.create({
      data: {
        email: finalEmail,
        password: hashedPassword,
        name,
        grade,
        parentName,
        parentTel,
        studentTel,
        studentCode,
        parentCode,
        serviceProvided,
        paymentStatus: paymentStatus || 'UNPAID',
        paymentDay,
        paymentAmount,
        paymentNote,
        role: 'STUDENT'
      },
      select: { id: true, email: true, name: true, grade: true, parentName: true, parentTel: true, studentTel: true, serviceProvided: true, paymentStatus: true, paymentDay: true, paymentAmount: true, paymentNote: true, paymentType: true, totalLessons: true, studentCode: true, parentCode: true, role: true, teacherId: true, createdAt: true }
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/student/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { email, name, grade, parentName, parentTel, studentTel, serviceProvided, paymentStatus, paymentDay, paymentAmount, paymentNote, paymentType, totalLessons } = req.body;
  try {
    const whereClause = req.user.role === 'HEAD_TEACHER' ? { id } : { id, teacherId: req.user.id };
    const existing = await prisma.user.findFirst({ where: whereClause });
    if (!existing) return res.status(403).json({ error: 'Bu öğrenciye erişim yetkiniz yok' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email,
        name,
        grade,
        parentName,
        parentTel,
        studentTel,
        serviceProvided,
        paymentStatus,
        paymentDay,
        paymentAmount,
        paymentNote,
        paymentType: paymentType || 'MONTHLY',
        totalLessons: totalLessons ? parseInt(totalLessons) : 0
      },
      select: { id: true, email: true, name: true, grade: true, parentName: true, parentTel: true, studentTel: true, serviceProvided: true, paymentStatus: true, paymentDay: true, paymentAmount: true, paymentNote: true, paymentType: true, totalLessons: true, studentCode: true, parentCode: true, role: true, teacherId: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/student/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const whereClause = req.user.role === 'HEAD_TEACHER' ? { id } : { id, teacherId: req.user.id };
    const existing = await prisma.user.findFirst({ where: whereClause });
    if (!existing) return res.status(403).json({ error: 'Bu öğrenciye erişim yetkiniz yok' });

    await prisma.trial.deleteMany({ where: { studentId: id } });
    await prisma.studentHomework.deleteMany({ where: { studentId: id } });
    await prisma.lesson.updateMany({ where: { studentId: id }, data: { studentId: null } });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/create-lesson', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, date, studentId, studentIds, zoomJoinUrl } = req.body;
  try {
    let finalUrl = zoomJoinUrl;
    if (!finalUrl) {
      finalUrl = await createDailyRoom();
    }
    if (!finalUrl) {
      const uniqueId = Math.random().toString(36).substring(2, 9);
      finalUrl = `https://meet.jit.si/FulleMatematik_${uniqueId}`;
    }

    let targetIds = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetIds = studentIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    } else if (studentId) {
      const parsedId = parseInt(studentId);
      if (!isNaN(parsedId)) targetIds.push(parsedId);
    }

    // Her zaman TEK bir ders oluştur
    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        date: new Date(date),
        teacherId: req.user.id,
        studentId: targetIds.length > 0 ? targetIds[0] : null,
        studentIds: targetIds.length > 0 ? JSON.stringify(targetIds) : null,
        zoomJoinUrl: finalUrl,
      },
    });

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/teacher/lessons/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Detach homework from this lesson to prevent foreign key constraint issues
    await prisma.homework.updateMany({
      where: { lessonId: id },
      data: { lessonId: null }
    });

    const deleted = await prisma.lesson.delete({
      where: { id }
    });
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/lessons/:id/notify', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const { notifyLessonStart } = require('./services/notificationService');
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Ders bulunamadı.' });
    }

    if (!lesson.student) {
      return res.status(400).json({ error: 'Bu derse atanmış bir öğrenci bulunmamaktadır.' });
    }

    const results = await notifyLessonStart(lesson.student, lesson);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/teacher/lessons', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    let lessons;
    if (req.user.role === 'HEAD_TEACHER') {
      lessons = await prisma.lesson.findMany({
        orderBy: { date: 'asc' },
        include: { 
          student: { 
            select: { 
              id: true, 
              name: true,
              studentTel: true,
              parentTel: true,
              parentName: true
            } 
          },
          teacher: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } else {
      lessons = await prisma.lesson.findMany({
        where: { teacherId: req.user.id },
        orderBy: { date: 'asc' },
        include: { 
          student: { 
            select: { 
              id: true, 
              name: true,
              studentTel: true,
              parentTel: true,
              parentName: true
            } 
          } 
        }
      });
    }
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/migrate-catbox-recordings', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const blocked = await prisma.lesson.findMany({
      where: { OR: [
        { recordingUrl: { contains: 'catbox.moe' } },
        { recordingUrl: { contains: 'gofile.io' } }
      ]},
      select: { id: true, recordingUrl: true, title: true }
    });

    if (blocked.length === 0) {
      return res.json({ success: true, migrated: 0, message: 'Taşınacak kayıt bulunamadı.' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      return res.status(400).json({ error: 'Cloudinary yapılandırılmamış. CLOUDINARY_CLOUD_NAME ve CLOUDINARY_UPLOAD_PRESET env değişkenlerini ekleyin.' });
    }

    const results = [];
    for (const lesson of blocked) {
      try {
        const fileRes = await fetch(lesson.recordingUrl, { signal: AbortSignal.timeout(60000) });
        if (!fileRes.ok) { results.push({ id: lesson.id, success: false, error: `İndirilemedi: ${fileRes.status}` }); continue; }

        const contentType = fileRes.headers.get('content-type') || 'video/mp4';
        const ext = contentType.includes('webm') ? 'webm' : 'mp4';
        const buffer = Buffer.from(await fileRes.arrayBuffer());

        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const parts = [];
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lesson_${lesson.id}.${ext}"\r\nContent-Type: ${contentType}\r\n\r\n`));
        parts.push(buffer);
        parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="upload_preset"\r\n\r\n${uploadPreset}\r\n`));
        parts.push(Buffer.from(`--${boundary}--\r\n`));
        const payload = Buffer.concat(parts);

        const cdnRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(payload.length) },
          body: payload,
          signal: AbortSignal.timeout(300000)
        });
        const cdnJson = await cdnRes.json();
        if (cdnRes.ok && cdnJson.secure_url) {
          await prisma.lesson.update({ where: { id: lesson.id }, data: { recordingUrl: cdnJson.secure_url } });
          results.push({ id: lesson.id, success: true, newUrl: cdnJson.secure_url });
        } else {
          results.push({ id: lesson.id, success: false, error: `Cloudinary: ${cdnJson.error?.message || JSON.stringify(cdnJson)}` });
        }
      } catch (err) {
        results.push({ id: lesson.id, success: false, error: err.message });
      }
    }

    const migrated = results.filter(r => r.success).length;
    res.json({ success: true, migrated, total: blocked.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/lessons/:id/recording', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { recordingUrl } = req.body;
  try {
    const updated = await prisma.lesson.update({
      where: { id },
      data: { recordingUrl: recordingUrl || null }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
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
  const crypto = require('crypto');
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
    console.log("Using Google OAuth2 User Refresh Token to authenticate...");
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Google OAuth2 User Token retrieval failed: ${errorText}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    console.warn('Google credentials (OAuth2 or Service Account) are not set. Skipping Google Drive upload.');
    return null;
  }

  console.log("Using Google Service Account to authenticate...");
  const jwt = generateGoogleAccessToken(email, privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth Service Account token retrieval failed: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function convertToMp4(inputBuffer) {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `input_${Date.now()}.webm`);
  const outputPath = path.join(tmpDir, `output_${Date.now()}.mp4`);

  fs.writeFileSync(inputPath, inputBuffer);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart',
      ])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  const outputBuffer = fs.readFileSync(outputPath);
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);
  return outputBuffer;
}

async function uploadToGoogleDrive(assembledBuffer, fileName, folderId, mimeType = 'video/webm') {
  const accessToken = await getGoogleDriveAccessToken();
  if (!accessToken) {
    return null;
  }
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`));
  parts.push(assembledBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  
  const payload = Buffer.concat(parts);
  
  console.log(`Uploading assembled video (${assembledBuffer.length} bytes) to Google Drive...`);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(payload.length)
    },
    body: payload
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive upload API failed: ${errorText}`);
  }
  
  const fileData = await response.json();
  const fileId = fileData.id;
  console.log(`Successfully uploaded to Google Drive. File ID: ${fileId}`);
  
  try {
    console.log(`Setting public reader permission for Google Drive file ${fileId}...`);
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
    if (!permRes.ok) {
      const permErrText = await permRes.text();
      console.warn(`Failed to set permissions for file ${fileId}: ${permErrText}`);
    } else {
      console.log(`Public reader permission set successfully for Google Drive file ${fileId}.`);
    }
  } catch (permErr) {
    console.warn("Failed to set public view permission on Google Drive file, continuing...", permErr);
  }
  
  return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
}

app.post('/api/teacher/lessons/:id/upload-chunk', auth, checkRole('TEACHER'), async (req, res) => {
  const lessonId = parseInt(req.params.id);
  const chunkIndex = parseInt(req.headers['x-chunk-index']);
  const totalChunks = parseInt(req.headers['x-total-chunks']);
  let mimeType = req.headers['x-mime-type'] || 'video/webm';
  let fileExt = mimeType.includes('mp4') ? 'mp4' : 'webm';

  if (isNaN(lessonId)) {
    return res.status(400).json({ error: 'Geçersiz ders ID' });
  }

  if (isNaN(chunkIndex) || isNaN(totalChunks)) {
    return res.status(400).json({ error: 'Geçersiz dilim (chunk) bilgileri.' });
  }

  try {
    // Read the binary stream of the chunk request body in full
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const chunkData = Buffer.concat(buffers);

    // Save this chunk into our PostgreSQL database table
    await prisma.lessonChunk.create({
      data: {
        lessonId,
        index: chunkIndex,
        data: chunkData
      }
    });

    console.log(`Saved chunk ${chunkIndex + 1}/${totalChunks} to DB for lesson ${lessonId}`);

    // Verify if all chunks have been uploaded
    const count = await prisma.lessonChunk.count({
      where: { lessonId }
    });

    if (count === totalChunks) {
      console.log(`All chunks received for lesson ${lessonId}. Assembling in memory...`);
      
      // Fetch all chunks, sorted by index
      const chunks = await prisma.lessonChunk.findMany({
        where: { lessonId },
        orderBy: { index: 'asc' }
      });

      // Concat the chunks buffer in memory
      const buffersToConcat = chunks.map(c => c.data);
      let assembledBuffer = Buffer.concat(buffersToConcat);

      // WebM → MP4 dönüştürme (Safari uyumluluğu için)
      const isWebm = mimeType.includes('webm');
      if (isWebm) {
        try {
          console.log(`Converting WebM (${assembledBuffer.length} bytes) to MP4 for Safari compatibility...`);
          assembledBuffer = await convertToMp4(assembledBuffer);
          mimeType = 'video/mp4';
          fileExt = 'mp4';
          console.log(`Conversion done. MP4 size: ${assembledBuffer.length} bytes.`);
        } catch (convErr) {
          console.error('WebM→MP4 conversion failed, uploading original WebM:', convErr);
        }
      }

      console.log(`Assembled video buffer size: ${assembledBuffer.length} bytes. Starting upload chain...`);

      const verifyUploadedUrl = async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
          return res.ok;
        } catch {
          return false;
        }
      };

      let uploadSuccess = false;
      let finalUrl = "";

      // Attempt 0: Google Drive Upload (Priority)
      try {
        const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const driveUrl = await uploadToGoogleDrive(assembledBuffer, `lesson_${lessonId}.${fileExt}`, driveFolderId, mimeType);
        if (driveUrl) {
          uploadSuccess = true;
          finalUrl = driveUrl;
          console.log(`Successfully uploaded to Google Drive: ${finalUrl}`);
        }
      } catch (driveErr) {
        console.error("Google Drive upload failed, falling back to other providers...", driveErr);
      }

      // Attempt 1: Cloudinary (Türkiye'de erişilebilir, kalıcı depolama, unsigned upload)
      if (!uploadSuccess) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        if (cloudName && uploadPreset) {
          try {
            console.log("Attempting Cloudinary upload...");
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            const parts = [];
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lesson_${lessonId}.${fileExt}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
            parts.push(assembledBuffer);
            parts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="upload_preset"\r\n\r\n${uploadPreset}\r\n`));
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resource_type"\r\n\r\nvideo\r\n`));
            parts.push(Buffer.from(`--${boundary}--\r\n`));
            const payload = Buffer.concat(parts);

            const cdnRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
              method: 'POST',
              headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(payload.length) },
              body: payload,
              signal: AbortSignal.timeout(300000)
            });
            const cdnJson = await cdnRes.json();
            if (cdnRes.ok && cdnJson.secure_url) {
              const reachable = await verifyUploadedUrl(cdnJson.secure_url);
              if (reachable) {
                uploadSuccess = true;
                finalUrl = cdnJson.secure_url;
                console.log(`Successfully uploaded to Cloudinary: ${finalUrl}`);
              }
            } else {
              console.warn(`Cloudinary upload failed: ${JSON.stringify(cdnJson)}`);
            }
          } catch (cdnErr) {
            console.error("Cloudinary upload failed:", cdnErr);
          }
        }
      }

      // Attempt 2: Pixeldrain (yedek)
      if (!uploadSuccess) {
        try {
          console.log("Attempting Pixeldrain upload...");
          const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
          const parts = [];
          parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lesson_${lessonId}.${fileExt}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
          parts.push(assembledBuffer);
          parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
          const payload = Buffer.concat(parts);

          const pdRes = await fetch('https://pixeldrain.com/api/file', {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': String(payload.length),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: payload
          });

          const pdJson = await pdRes.json();
          if (pdRes.ok && pdJson.success && pdJson.id) {
            const url = `https://pixeldrain.com/api/file/${pdJson.id}`;
            const reachable = await verifyUploadedUrl(url);
            if (reachable) {
              uploadSuccess = true;
              finalUrl = url;
              console.log(`Successfully uploaded to Pixeldrain: ${finalUrl}`);
            } else {
              console.warn(`Pixeldrain URL not reachable: ${url}`);
            }
          } else {
            console.warn(`Pixeldrain upload failed: ${JSON.stringify(pdJson)}`);
          }
        } catch (pdErr) {
          console.error("Pixeldrain upload failed with error:", pdErr);
        }
      }

      // Attempt 3: transfer.sh (14 gün)
      if (!uploadSuccess) {
        try {
          console.log("Attempting transfer.sh upload fallback...");
          const transferRes = await fetch(`https://transfer.sh/lesson_${lessonId}.${fileExt}`, {
            method: 'PUT',
            headers: {
              'Content-Type': mimeType,
              'Content-Length': String(assembledBuffer.length),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: assembledBuffer
          });

          const resText = await transferRes.text();
          if (transferRes.ok && resText.trim().startsWith('https://')) {
            const trimmed = resText.trim();
            const reachable = await verifyUploadedUrl(trimmed);
            if (reachable) {
              uploadSuccess = true;
              finalUrl = trimmed;
              console.log(`Successfully uploaded to transfer.sh: ${finalUrl}`);
            } else {
              console.warn(`transfer.sh URL not reachable: ${trimmed}`);
            }
          } else {
            console.warn(`transfer.sh returned non-OK status: ${transferRes.status}. Response: ${resText}`);
          }
        } catch (transferErr) {
          console.error("transfer.sh fallback upload failed with error:", transferErr);
        }
      }

      // Attempt 4: Uguu.se (48 saat)
      if (!uploadSuccess) {
        try {
          console.log("Attempting Uguu.se upload fallback...");
          const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
          const parts = [];
          parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files[]"; filename="lesson_${lessonId}.${fileExt}"\r\nContent-Type: ${mimeType}\r\n\r\n`));
          parts.push(assembledBuffer);
          parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

          const payload = Buffer.concat(parts);

          const uguuRes = await fetch('https://uguu.se/upload', {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': String(payload.length),
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            },
            body: payload
          });

          const resJson = await uguuRes.json();
          if (uguuRes.ok && resJson.success && resJson.files && resJson.files[0]) {
            const url = resJson.files[0].url;
            const reachable = await verifyUploadedUrl(url);
            if (reachable) {
              uploadSuccess = true;
              finalUrl = url;
              console.log(`Successfully uploaded to Uguu.se: ${finalUrl}`);
            } else {
              console.warn(`Uguu.se URL not reachable: ${url}`);
            }
          } else {
            console.warn(`Uguu.se returned non-OK status: ${uguuRes.status}. Response: ${JSON.stringify(resJson)}`);
          }
        } catch (uguuErr) {
          console.error("Uguu.se fallback upload failed with error:", uguuErr);
        }
      }

      if (!uploadSuccess) {
        throw new Error('Dosya bulut sunucusuna yüklenemedi. Tüm servis denemeleri başarısız oldu.');
      }

      const cleanUrl = finalUrl;
      console.log(`Assembled file successfully uploaded to cloud: ${cleanUrl}`);

      // Update the database URL
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          recordingUrl: cleanUrl,
          recordingRequested: true
        }
      });

      // Clear chunks from database to free database space
      await prisma.lessonChunk.deleteMany({
        where: { lessonId }
      });

      res.json({ success: true, recordingUrl: cleanUrl });
    } else {
      res.json({ success: true, status: 'chunk_saved' });
    }
  } catch (err) {
    console.error('Error saving/assembling chunk:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/students', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    let students;
    if (req.user.role === 'HEAD_TEACHER') {
      students = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, email: true, name: true, grade: true, parentName: true, parentTel: true, studentTel: true, serviceProvided: true, paymentStatus: true, paymentDay: true, paymentAmount: true, paymentNote: true, paymentType: true, totalLessons: true, studentCode: true, parentCode: true, role: true, teacherId: true, createdAt: true, teacher: { select: { id: true, name: true } } }
      });
    } else {
      students = await prisma.user.findMany({
        where: { role: 'STUDENT', teacherId: req.user.id },
        select: { id: true, email: true, name: true, grade: true, parentName: true, parentTel: true, studentTel: true, serviceProvided: true, paymentStatus: true, paymentDay: true, paymentAmount: true, paymentNote: true, paymentType: true, totalLessons: true, studentCode: true, parentCode: true, role: true, teacherId: true, createdAt: true }
      });
    }
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/teachers', auth, checkRole('TEACHER'), async (req, res) => {
  if (req.user.role !== 'HEAD_TEACHER') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: { id: true, name: true, email: true, role: true, studentTel: true }
    });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/add-teacher', auth, checkRole('TEACHER'), async (req, res) => {
  if (req.user.role !== 'HEAD_TEACHER') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }
  const { name, email, password, studentTel } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        studentTel,
        role: 'TEACHER'
      }
    });
    res.json({ success: true, teacher: { id: newTeacher.id, name: newTeacher.name, email: newTeacher.email, studentTel: newTeacher.studentTel } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/teachers/:id', auth, checkRole('TEACHER'), async (req, res) => {
  if (req.user.role !== 'HEAD_TEACHER') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }
  const id = parseInt(req.params.id);
  const { name, email, studentTel, password } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Ad Soyad ve E-posta zorunludur.' });
  }
  try {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanımda.' });
    }
    
    const updateData = {
      name,
      email,
      studentTel
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    res.json({ success: true, teacher: { id: updated.id, name: updated.name, email: updated.email, studentTel: updated.studentTel } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/teachers/:id', auth, checkRole('TEACHER'), async (req, res) => {
  if (req.user.role !== 'HEAD_TEACHER') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }
  const id = parseInt(req.params.id);
  try {
    // Set teacherId to null for all assigned students
    await prisma.user.updateMany({
      where: { teacherId: id },
      data: { teacherId: null }
    });

    // Delete blog posts authored by this teacher
    await prisma.blogPost.deleteMany({
      where: { authorId: id }
    });

    // Delete lessons and their homeworks
    const teacherLessons = await prisma.lesson.findMany({
      where: { teacherId: id },
      select: { id: true }
    });
    const lessonIds = teacherLessons.map(l => l.id);
    if (lessonIds.length > 0) {
      await prisma.studentHomework.deleteMany({
        where: { homework: { lessonId: { in: lessonIds } } }
      });
      await prisma.homework.deleteMany({
        where: { lessonId: { in: lessonIds } }
      });
      await prisma.lessonChunk.deleteMany({
        where: { lessonId: { in: lessonIds } }
      });
      await prisma.lesson.deleteMany({
        where: { teacherId: id }
      });
    }

    const deleted = await prisma.user.delete({
      where: { id }
    });
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/students/:id/assign-teacher', auth, checkRole('TEACHER'), async (req, res) => {
  if (req.user.role !== 'HEAD_TEACHER') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz bulunmamaktadır.' });
  }
  const studentId = parseInt(req.params.id);
  const { teacherId } = req.body;
  try {
    const updatedStudent = await prisma.user.update({
      where: { id: studentId },
      data: { 
        teacherId: teacherId ? parseInt(teacherId) : null 
      }
    });
    res.json({ success: true, updatedStudent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/assign-homework', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, studentIds, deadline } = req.body;
  try {
    const homework = await prisma.homework.create({
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        students: {
          create: studentIds.map(id => ({ studentId: id }))
        }
      }
    });
    res.json(homework);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Routes
app.get('/api/student/lessons', auth, checkRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const allLessons = await prisma.lesson.findMany({
      orderBy: { date: 'asc' },
      include: { teacher: { select: { name: true } } }
    });
    // Öğrenci dersini görebilir: studentId eşleşiyorsa, studentIds içinde ID'si varsa veya herkese açıksa
    const lessons = allLessons.filter(lesson => {
      if (lesson.studentId === userId) return true;
      if (lesson.studentId === null && !lesson.studentIds) return true;
      if (lesson.studentIds) {
        try {
          const ids = JSON.parse(lesson.studentIds);
          return ids.includes(userId);
        } catch { return false; }
      }
      return false;
    });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/student/lessons/:id', auth, checkRole('STUDENT'), async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Geçersiz ders ID' });
  }
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { teacher: { select: { name: true } } }
    });
    if (!lesson) {
      return res.status(404).json({ error: 'Ders bulunamadı.' });
    }
    const userId = req.user.id;
    let hasAccess = lesson.studentId === userId || lesson.studentId === null;
    if (!hasAccess && lesson.studentIds) {
      try { hasAccess = JSON.parse(lesson.studentIds).includes(userId); } catch {}
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Bu derse erişim yetkiniz yok.' });
    }
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/student/lessons/:id/request-recording', auth, checkRole('STUDENT'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      return res.status(404).json({ error: 'Ders bulunamadı.' });
    }
    const userId = req.user.id;
    let hasAccess = lesson.studentId === userId || lesson.studentId === null;
    if (!hasAccess && lesson.studentIds) {
      try { hasAccess = JSON.parse(lesson.studentIds).includes(userId); } catch {}
    }
    if (!hasAccess) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const updated = await prisma.lesson.update({
      where: { id },
      data: { recordingRequested: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/homeworks', auth, checkRole('STUDENT'), async (req, res) => {
  try {
    const homeworks = await prisma.studentHomework.findMany({
      where: { studentId: req.user.id },
      include: { homework: true }
    });
    res.json(homeworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student/homework/:id/complete', auth, checkRole('STUDENT'), async (req, res) => {
  const homeworkId = parseInt(req.params.id);
  try {
    const updated = await prisma.studentHomework.updateMany({
      where: {
        studentId: req.user.id,
        homeworkId: homeworkId
      },
      data: {
        status: 'COMPLETED',
        submittedAt: new Date()
      }
    });
    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trial Exam Routes
app.post('/api/student/trials', auth, checkRole('STUDENT'), async (req, res) => {
  const { name, type, results, totalNet } = req.body;
  try {
    const trial = await prisma.trial.create({
      data: {
        name,
        type,
        results: JSON.stringify(results),
        totalNet: parseFloat(totalNet),
        studentId: req.user.id
      }
    });
    res.json(trial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/trials', auth, checkRole('STUDENT'), async (req, res) => {
  try {
    const trials = await prisma.trial.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    const parsedTrials = trials.map(t => ({
      ...t,
      results: JSON.parse(t.results)
    }));
    res.json(parsedTrials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/student/:id/trials', auth, checkRole('TEACHER'), async (req, res) => {
  const { id } = req.params;
  try {
    const trials = await prisma.trial.findMany({
      where: { studentId: parseInt(id) },
      orderBy: { createdAt: 'desc' }
    });
    const parsedTrials = trials.map(t => ({
      ...t,
      results: JSON.parse(t.results)
    }));
    res.json(parsedTrials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to censor bad words in incoming inputs
function censorText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Replace case-insensitive: siktir, siktiri, aiktiri, kpss (including common Turkish character variations)
  return text.replace(/(siktir|siktiri|aiktiri|kpss|s\u0131ktir|s\u0131ktiri|s\u0130kt\u0130r|s\u0130kt\u0130r\u0130)/gi, 's* s*');
}

// Trial Lesson Request Routes
app.post('/api/trial-requests', async (req, res) => {
  const { type, studentName, email, phone, grade } = req.body;
  if (!studentName || !email || !phone || !grade) {
    return res.status(400).json({ error: 'Lütfen tüm zorunlu alanları doldurun.' });
  }
  try {
    const request = await prisma.trialLessonRequest.create({
      data: {
        type: type || 'SELF',
        studentName: censorText(studentName),
        email,
        phone,
        grade: censorText(grade),
        status: 'PENDING'
      }
    });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/trial-requests', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const requests = await prisma.trialLessonRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/trial-requests/:id/approve', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { scheduledDate } = req.body;
  if (!scheduledDate) {
    return res.status(400).json({ error: 'Lütfen bir ders tarihi ve saati seçin.' });
  }

  try {
    const request = await prisma.trialLessonRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Talep bulunamadı.' });
    }

    // 1. Check if user already exists with this email
    let student = await prisma.user.findUnique({ where: { email: request.email } });
    
    // 2. If student does not exist, create a new student user
    if (!student) {
      const hashedPassword = await bcrypt.hash('student', 10);
      let studentCode;
      let isUnique = false;
      while (!isUnique) {
        const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
        studentCode = `FM${randomNum}`;
        const existing = await prisma.user.findUnique({ where: { studentCode } });
        if (!existing) isUnique = true;
      }

      student = await prisma.user.create({
        data: {
          email: request.email,
          password: hashedPassword,
          name: request.studentName,
          grade: request.grade,
          studentTel: request.phone,
          studentCode,
          role: 'STUDENT'
        }
      });
    }

    // 3. Create a video conference link
    let zoomJoinUrl = await createDailyRoom();
    if (!zoomJoinUrl) {
      const uniqueId = Math.random().toString(36).substring(2, 9);
      zoomJoinUrl = `https://meet.jit.si/FulleMatematik_${uniqueId}`;
    }

    // 4. Create the trial lesson
    const lesson = await prisma.lesson.create({
      data: {
        title: 'Ücretsiz Tanışma Dersi',
        description: 'Ücretsiz tanışma ve seviye tespit dersi.',
        date: new Date(scheduledDate),
        teacherId: req.user.id,
        studentId: student.id,
        zoomJoinUrl
      }
    });

    // 5. Update trial request status
    const updatedRequest = await prisma.trialLessonRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        scheduledDate: new Date(scheduledDate)
      }
    });

    res.json({
      request: updatedRequest,
      studentCode: student.studentCode,
      lesson,
      student
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/trial-requests/:id/reject', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updated = await prisma.trialLessonRequest.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact Messages Routes
app.post('/api/contact-messages', async (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Lütfen ad soyad, telefon ve e-posta alanlarını doldurun.' });
  }
  try {
    const contactMsg = await prisma.contactMessage.create({
      data: {
        name: censorText(name),
        phone,
        email,
        message: message ? censorText(message) : ''
      }
    });
    res.json(contactMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/contact-messages', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/contact-messages/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Blog Routes
function slugify(text) {
  if (!text) return '';
  const trMap = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I', 'İ': 'i', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
  };
  let str = text.toString();
  for (let key in trMap) {
    str = str.replace(new RegExp(key, 'g'), trMap[key]);
  }
  return str.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

app.get('/api/blog', async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } }
    });
    res.json(posts);
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } }
    });
    if (!post) {
      return res.status(404).json({ message: 'Yazı bulunamadı' });
    }
    res.json(post);
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/blog', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, content, excerpt, coverImage } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Başlık ve içerik alanları zorunludur.' });
  }

  try {
    let slug = slugify(title);
    if (!slug) {
      slug = `post-${Date.now()}`;
    }
    let finalSlug = slug;
    let counter = 1;
    let exists = true;
    while (exists) {
      const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
      if (existing) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      } else {
        exists = false;
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        coverImage: coverImage || null,
        slug: finalSlug,
        authorId: req.user.id
      }
    });
    res.json(post);
  } catch (err) {
    console.error('Error creating blog post:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/blog/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.blogPost.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Camp / Course Routes
app.get('/api/camps', async (req, res) => {
  try {
    const camps = await prisma.camp.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(camps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/camps', auth, checkRole('TEACHER'), async (req, res) => {
  const { badge, title, subtitle, image, details, description, highlights, whatsappLink } = req.body;
  try {
    const camp = await prisma.camp.create({
      data: {
        badge,
        title,
        subtitle,
        image,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        description,
        highlights: typeof highlights === 'string' ? highlights : JSON.stringify(highlights),
        whatsappLink
      }
    });
    res.json(camp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/camps/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { badge, title, subtitle, image, details, description, highlights, whatsappLink } = req.body;
  try {
    const camp = await prisma.camp.update({
      where: { id },
      data: {
        badge,
        title,
        subtitle,
        image,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        description,
        highlights: typeof highlights === 'string' ? highlights : JSON.stringify(highlights),
        whatsappLink
      }
    });
    res.json(camp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/camps/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.camp.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zoom SDK Signature Endpoint
app.post('/api/zoom/signature', auth, async (req, res) => {
  const { meetingNumber } = req.body;
  const sdkKey = process.env.ZOOM_SDK_KEY || 'YOUR_SDK_KEY';
  const sdkSecret = process.env.ZOOM_SDK_SECRET || 'YOUR_SDK_SECRET';

  if (!meetingNumber) {
    return res.status(400).json({ error: 'Toplantı numarası gereklidir.' });
  }

  try {
    const zoomRole = (req.user.role === 'TEACHER' || req.user.role === 'HEAD_TEACHER') ? 1 : 0;
    
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours expiration

    const oHeader = { alg: 'HS256', typ: 'JWT' };
    const oPayload = {
      sdkKey: sdkKey,
      mn: parseInt(meetingNumber),
      role: zoomRole,
      iat: iat,
      exp: exp,
      appKey: sdkKey,
      tokenExp: exp
    };

    const sHeader = Buffer.from(JSON.stringify(oHeader)).toString('base64').replace(/=/g, '');
    const sPayload = Buffer.from(JSON.stringify(oPayload)).toString('base64').replace(/=/g, '');

    const signature = crypto
      .createHmac('sha256', sdkSecret)
      .update(sHeader + '.' + sPayload)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const generatedSignature = `${sHeader}.${sPayload}.${signature}`;
    
    res.json({
      signature: generatedSignature,
      sdkKey: sdkKey
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LiveKit Token Endpoint
app.post('/api/livekit/token', auth, async (req, res) => {
  const { roomName, participantName, participantIdentity, role } = req.body;
  
  // Clean surrounding quotes and trailing slashes if any are present from the .env parser
  const apiKey = (process.env.LIVEKIT_API_KEY || '').replace(/['"]/g, '').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || '').replace(/['"]/g, '').trim();
  const livekitUrl = (process.env.LIVEKIT_URL || '').replace(/['"]/g, '').replace(/\/$/, '').trim();

  // If LiveKit credentials are not defined or contain default placeholders, tell client to use Jitsi fallback
  if (!apiKey || !apiSecret || !livekitUrl || 
      apiKey === 'your_livekit_api_key_here' || 
      apiSecret === 'your_livekit_api_secret_here' || 
      livekitUrl.includes('your-project') ||
      livekitUrl.includes('your_livekit_url_here')) {
    console.log('LiveKit not fully configured in env. Falling back to Jitsi Meeting.');
    return res.json({ useFallback: true });
  }

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Oda adı (roomName) ve katılımcı adı (participantName) gereklidir.' });
  }

  // Identity must be completely unique and explicitly cast to a String to avoid session collisions and type-mismatch errors
  const uniqueIdentity = String(participantIdentity || `${participantName}_${Math.random().toString(36).substring(2, 8)}`);

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: uniqueIdentity,
      name: participantName, // Display name
      metadata: JSON.stringify({ role: role || 'STUDENT' })
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await at.toJwt();
    res.json({ token, serverUrl: livekitUrl, useFallback: false });
  } catch (err) {
    console.error('LiveKit token generation error:', err);
    // Automatically fallback to Jitsi if generation fails
    res.json({ useFallback: true });
  }
});

// Öğretmenin öğrenci sesini/kamerasını kapatması
app.post('/api/livekit/mute-participant', auth, checkRole('TEACHER'), async (req, res) => {
  const { roomName, participantIdentity, trackSid, muted } = req.body;
  if (!roomName || !participantIdentity || !trackSid) {
    return res.status(400).json({ error: 'roomName, participantIdentity ve trackSid gereklidir.' });
  }

  const apiKey = (process.env.LIVEKIT_API_KEY || '').replace(/['"]/g, '').trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || '').replace(/['"]/g, '').trim();
  const livekitUrl = (process.env.LIVEKIT_URL || '').replace(/['"]/g, '').replace(/\/$/, '').trim();

  if (!apiKey || !apiSecret || !livekitUrl) {
    return res.status(503).json({ error: 'LiveKit yapılandırılmamış.' });
  }

  try {
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    await roomService.mutePublishedTrack(roomName, participantIdentity, trackSid, muted !== false);
    res.json({ success: true });
  } catch (err) {
    console.error('LiveKit mute error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Real Groq Multimodal AI endpoint
app.post('/api/ai/ask', auth, async (req, res) => {
  const { question, image } = req.body;
  
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Yapay zeka anahtarı (GROQ_API_KEY) Vercel üzerinde tanımlanmamış. Lütfen ekleyin.' });
    }

    // Log API Key prefix for debugging purposes (never log full key)
    console.log(`Using GROQ_API_KEY prefix: ${apiKey.substring(0, 6)}...`);

    const messages = [
      {
        role: "system",
        content: "Sen Fulematematiği Asistanı adında uzman bir matematik öğretmenisin. Öğrencinin gönderdiği matematik sorularını adım adım, anlaşılır ve eğitici bir dille çözmelisin. Eğer gönderilen görsel veya metin matematik ile ilgili değilse, öğrenciye sadece matematik konularında yardımcı olabileceğini kibarca hatırlat. Yanıtını Türkçe olarak ver."
      }
    ];

    const userContent = [];
    
    if (image) {
      // Decode image base64
      // Groq expects image in content list with type: "image_url"
      userContent.push({
        type: "image_url",
        image_url: {
          url: image
        }
      });
    }

    if (question && question.trim()) {
      userContent.push({
        type: "text",
        text: question
      });
    } else if (!image) {
      userContent.push({
        type: "text",
        text: "Bu sorunun çözümünü adım adım açıklayarak yapabilir misin?"
      });
    }

    messages.push({
      role: "user",
      content: userContent
    });

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API Error details:', errText);
      
      let errorMsg = 'Yapay zeka servisi yanıt vermedi.';
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.message) {
          errorMsg = `Groq API Hatası: ${parsedErr.error.message}`;
        }
      } catch (e) {}
      
      return res.status(response.status).json({ error: errorMsg });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Cevap üretilemedi.';
    res.json({ answer });
  } catch (err) {
    console.error('AI ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST TARA — Fotoğraftaki soruları Groq Vision ile JSON'a çıkarır
app.post('/api/teacher/test-tara', auth, checkRole('TEACHER'), async (req, res) => {
  const { gorsel } = req.body; // base64 data URL
  if (!gorsel) {
    return res.status(400).json({ error: 'Görsel gönderilmedi.' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY tanımlanmamış.' });
    }

    const sistemTalimati = `Sen deneyimli bir Türk matematik öğretmenisin. Sana bir test/soru kağıdı fotoğrafı gönderilecek.
Bu fotoğraftaki TÜM soruları tek tek tespit et ve aşağıdaki JSON formatında döndür.

KURALLAR:
- Fotoğraftaki her soruyu eksiksiz, kelimesi kelimesine al.
- Matematiksel ifadeleri $...$ arasında LaTeX olarak yaz.
- Şıkları A) B) C) D) E) formatında ayrı dizi elemanı olarak yaz.
- Eğer doğru şık işaretliyse dogruSik alanını doldur (örn: "A"), değilse boş bırak "".
- Görsel içeriyorsa (grafik, şekil vs.) gorselAciklama alanına kısa açıklama yaz.
- Sadece aşağıdaki JSON şemasında yanıt ver, başka hiçbir açıklama ekleme:

{"sorular":[
  {
    "no": 1,
    "metin": "Soru metni buraya",
    "siklar": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "dogruSik": "",
    "gorselAciklama": ""
  }
]}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: sistemTalimati },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: gorsel } },
              { type: 'text', text: 'Bu fotoğraftaki tüm soruları JSON formatında çıkar.' }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq test-tara error:', errText);
      let errorMsg = 'Görsel işlenemedi.';
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.message) errorMsg = `Groq: ${parsedErr.error.message}`;
      } catch (e) {}
      return res.status(response.status).json({ error: errorMsg });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';

    let ayristirilmis;
    try {
      ayristirilmis = JSON.parse(rawContent);
    } catch (e) {
      console.error('Groq test-tara JSON parse error:', rawContent);
      return res.status(502).json({ error: 'AI geçerli JSON döndürmedi, tekrar deneyin.' });
    }

    if (!Array.isArray(ayristirilmis.sorular)) {
      return res.status(502).json({ error: 'AI beklenen formatta yanıt vermedi.' });
    }

    res.json(ayristirilmis);
  } catch (err) {
    console.error('test-tara error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ders Notu Oluşturucu — ham metni deneyimli bir öğretmen gibi düzenli bir fasiküle dönüştürür
app.post('/api/teacher/ders-notu-ai', auth, checkRole('TEACHER'), async (req, res) => {
  const { metin } = req.body;
  if (!metin || !metin.trim()) {
    return res.status(400).json({ error: 'İşlenecek metin gönderilmedi.' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Yapay zeka anahtarı (GROQ_API_KEY) Vercel üzerinde tanımlanmamış. Lütfen ekleyin.' });
    }

    const sistemTalimati = `Sen 15 yıllık deneyimli bir matematik öğretmenisin. Sana verilen ham ders notu/soru metnini, sanki kendi elinle temize çekmiş gibi düzenli bir fasiküle dönüştürüyorsun.

KURALLAR:
- İçeriği ASLA kısaltma, özetleme veya SİLME. Tüm konu anlatımı ve tüm sorular eksiksiz, kelimesi kelimesine korunmalı (yalnızca PDF çıkarımından kaynaklanan bozuk satır sıralaması/tekrar gibi teknik gürültüyü düzelt).
- Matematiksel ifadeleri LaTeX ile $...$ arasında yaz (örn: $x^2+5x+6=0$).
- Konu başlıklarını kısa, tek satır, açıklayıcı başlıklara dönüştür.
- Çoktan seçmeli soruları tespit et; şıkları A) B) C) D) E) biçiminde ayrı ayrı yaz. Metinde doğru şıkkı işaretleyen bir ipucu varsa (=, *, altı çizili, kalın vb.) onu dogruSik alanına yansıt; yoksa dogruSik alanını boş bırak, şık uydurma.
- Metinde "Örnek", "Örn.", "Örnek Problem" gibi bir başlıkla sunulan çözümlü örnek varsa: örneğin problem/soru kısmını "ornek" tipinde, hemen ardından gelen çözüm/adımları "cozum" tipinde AYRI bloklar olarak yaz (şıklı bir çoktan seçmeli soru değilse "soru" tipini kullanma).
- Yalnızca aşağıdaki JSON şemasında yanıt ver, şema dışında hiçbir açıklama, markdown veya metin ekleme:

{"bloklar":[
  {"tip":"baslik","metin":"..."},
  {"tip":"paragraf","metin":"..."},
  {"tip":"ornek","metin":"Örnek problemin metni..."},
  {"tip":"cozum","metin":"Örneğin çözüm adımları..."},
  {"tip":"soru","metin":"...","sikkar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":"A"},
  {"tip":"tablo","basliklar":["Sütun1","Sütun2"],"satirlar":[["...","..."]]}
]}`;

    const maxCikisTokeni = Math.min(32000, Math.max(2000, Math.ceil(metin.length * 1.2)));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: sistemTalimati },
          { role: 'user', content: metin }
        ],
        temperature: 0.2,
        max_tokens: maxCikisTokeni,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API Error details:', errText);
      let errorMsg = 'Yapay zeka servisi yanıt vermedi.';
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error?.message) errorMsg = `Groq API Hatası: ${parsedErr.error.message}`;
      } catch (e) {}
      return res.status(response.status).json({ error: errorMsg });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';

    let ayristirilmis;
    try {
      ayristirilmis = JSON.parse(rawContent);
    } catch (e) {
      console.error('Groq JSON ayrıştırma hatası:', rawContent);
      return res.status(502).json({ error: 'Yapay zeka geçerli bir JSON döndürmedi. Lütfen tekrar deneyin.' });
    }

    if (!Array.isArray(ayristirilmis.bloklar)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen formatta yanıt vermedi.' });
    }

    res.json(ayristirilmis);
  } catch (err) {
    console.error('Ders notu AI error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Parent Routes
app.get('/api/parent/student', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        teacher: {
          select: {
            name: true,
            studentTel: true
          }
        }
      }
    });
    if (!student) {
      return res.status(404).json({ error: 'Öğrenci bulunamadı.' });
    }
    res.json({
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      parentCode: student.parentCode,
      grade: student.grade,
      parentName: student.parentName,
      parentTel: student.parentTel,
      studentTel: student.studentTel,
      serviceProvided: student.serviceProvided,
      paymentStatus: student.paymentStatus,
      paymentDay: student.paymentDay,
      paymentAmount: student.paymentAmount,
      paymentNote: student.paymentNote,
      paymentType: student.paymentType,
      totalLessons: student.totalLessons,
      teacher: student.teacher
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/parent/lessons', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const allLessons = await prisma.lesson.findMany({
      orderBy: { date: 'asc' },
      include: { teacher: { select: { name: true } } }
    });
    const lessons = allLessons.filter(lesson => {
      if (lesson.studentId === userId) return true;
      if (lesson.studentId === null && !lesson.studentIds) return true;
      if (lesson.studentIds) {
        try {
          const ids = JSON.parse(lesson.studentIds);
          return ids.includes(userId);
        } catch { return false; }
      }
      return false;
    });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/parent/homeworks', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const homeworks = await prisma.studentHomework.findMany({
      where: { studentId: req.user.id },
      include: { homework: true }
    });
    res.json(homeworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parent/trials', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const trials = await prisma.trial.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    const parsedTrials = trials.map(t => ({
      ...t,
      results: JSON.parse(t.results)
    }));
    res.json(parsedTrials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const initParentCodes = async () => {
  try {
    const studentsWithoutParentCode = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        parentCode: null,
        studentCode: { not: null }
      }
    });

    for (const student of studentsWithoutParentCode) {
      const numMatch = student.studentCode.match(/\d+/);
      const randomNum = numMatch ? numMatch[0] : Math.floor(100 + Math.random() * 900);
      const parentCode = `FMV${randomNum}`;
      
      await prisma.user.update({
        where: { id: student.id },
        data: { parentCode }
      });
      console.log(`Updated student ${student.name} with parentCode ${parentCode}`);
    }

    // Fix broken /uploads/lesson_*.webm paths that were incorrectly set by a previous migration.
    // These local file paths don't exist since recordings are stored on Google Drive or external services.
    const fs = require('fs');
    const brokenLessons = await prisma.lesson.findMany({
      where: {
        recordingUrl: { startsWith: '/uploads/' }
      }
    });

    for (const lesson of brokenLessons) {
      const localPath = require('path').join(__dirname, lesson.recordingUrl);
      const fileExists = fs.existsSync(localPath);
      if (!fileExists) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { recordingUrl: null }
        });
        console.log(`Cleared broken local recording path for lesson ${lesson.id}: ${lesson.recordingUrl}`);
      }
    }
  } catch (err) {
    console.error('Error initializing parent codes / cleaning recordings:', err);
  }
};

if (require.main === module) {
  initParentCodes().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

// YouTube RSS Feed (API key gereksiz)
let ytCacheData = null;
let ytCacheTime = 0;
const YT_CACHE_MS = 30 * 60 * 1000;

const YT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function resolveYouTubeChannelId() {
  // Kanal ID'yi bilinen bir videodan çek (en güvenilir yöntem)
  const seedUrl = 'https://www.youtube.com/shorts/-vOHsGTrevA';
  const res = await axios.get(seedUrl, {
    headers: { 'User-Agent': YT_USER_AGENT },
    timeout: 10000,
  });
  const match = res.data.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
  if (match) return match[1];

  // Fallback: kanal sayfasından çek
  const pageRes = await axios.get('https://www.youtube.com/@FULLEMATEMAT%C4%B0G%C4%B0', {
    headers: { 'User-Agent': YT_USER_AGENT },
    timeout: 10000,
  });
  const m2 = pageRes.data.match(/"channelId":"(UC[a-zA-Z0-9_-]+)"/);
  if (m2) return m2[1];

  throw new Error('Kanal ID bulunamadı');
}

let cachedChannelId = null;

app.get('/api/social/youtube-feed', async (req, res) => {
  try {
    if (ytCacheData && Date.now() - ytCacheTime < YT_CACHE_MS) {
      return res.json(ytCacheData);
    }

    if (!cachedChannelId) {
      cachedChannelId = await resolveYouTubeChannelId();
    }

    const rssRes = await axios.get(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${cachedChannelId}`,
      { headers: { 'User-Agent': YT_USER_AGENT }, timeout: 10000 }
    );

    const entries = rssRes.data.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    const videos = entries.slice(0, 3).map(entry => {
      const videoId = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
      const rawTitle = (entry.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      const title = rawTitle
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      const published = (entry.match(/<published>(.*?)<\/published>/) || [])[1];
      return {
        videoId,
        title,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        published,
      };
    }).filter(v => v.videoId);

    ytCacheData = videos;
    ytCacheTime = Date.now();
    res.json(videos);
  } catch (err) {
    console.error('YouTube feed error:', err.message);
    if (ytCacheData) return res.json(ytCacheData);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
