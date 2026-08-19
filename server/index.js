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
            price: '2500 TL',
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
            price: '3500 TL',
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Hesap + cihaz (IP) bazlı yanlış giriş kilidi: 3 kez yanlış girilirse 15 dakika kilitlenir.
const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 dakika

// İn-memory kilit deposu (DB gecikmelerine veya baglanti hatalarina karsi aninda kilit)
const MEMORY_LOGIN_ATTEMPTS = new Map();

const getLockoutKeys = (identifier, ip) => {
  const cleanId = (identifier || 'unknown').toString().trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').toString().trim();
  return {
    comboKey: `combo:${cleanId}:${cleanIp}`,
    idKey: `id:${cleanId}`,
    ipKey: `ip:${cleanIp}`
  };
};

const getLoginLockRemainingMinutes = async (identifier, ip) => {
  const keys = getLockoutKeys(identifier, ip);
  const now = Date.now();

  // 1. Memory deposunu kontrol et
  for (const key of [keys.comboKey, keys.idKey, keys.ipKey]) {
    const memRecord = MEMORY_LOGIN_ATTEMPTS.get(key);
    if (memRecord && memRecord.lockedUntil && memRecord.lockedUntil > now) {
      return Math.max(1, Math.ceil((memRecord.lockedUntil - now) / 60000));
    }
  }

  // 2. Veritabanı deposunu kontrol et
  try {
    const records = await prisma.loginAttempt.findMany({
      where: { key: { in: [keys.comboKey, keys.idKey, keys.ipKey] } }
    });
    for (const record of records) {
      if (record && record.lockedUntil) {
        const remainingMs = new Date(record.lockedUntil).getTime() - now;
        if (remainingMs > 0) {
          return Math.max(1, Math.ceil(remainingMs / 60000));
        }
      }
    }
  } catch (err) {
    console.error('getLoginLockRemainingMinutes DB check error:', err.message);
  }

  return 0;
};

const registerFailedLoginAttempt = async (identifier, ip) => {
  const keys = getLockoutKeys(identifier, ip);
  const now = Date.now();
  let maxAttempts = 0;

  for (const key of [keys.comboKey, keys.idKey, keys.ipKey]) {
    const mem = MEMORY_LOGIN_ATTEMPTS.get(key);
    if (mem) {
      if (mem.lockedUntil && mem.lockedUntil > now) {
        maxAttempts = Math.max(maxAttempts, MAX_FAILED_LOGIN_ATTEMPTS);
      } else if (mem.updatedAt && (now - mem.updatedAt > LOGIN_LOCK_DURATION_MS)) {
        MEMORY_LOGIN_ATTEMPTS.delete(key);
      } else {
        maxAttempts = Math.max(maxAttempts, mem.failedAttempts || 0);
      }
    }
  }

  try {
    const records = await prisma.loginAttempt.findMany({
      where: { key: { in: [keys.comboKey, keys.idKey, keys.ipKey] } }
    });
    for (const rec of records) {
      if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now) {
        maxAttempts = Math.max(maxAttempts, MAX_FAILED_LOGIN_ATTEMPTS);
      } else if (rec.updatedAt && (now - new Date(rec.updatedAt).getTime() <= LOGIN_LOCK_DURATION_MS)) {
        maxAttempts = Math.max(maxAttempts, rec.failedAttempts || 0);
      }
    }
  } catch (e) {}

  const nextAttempts = maxAttempts + 1;
  const isLocked = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
  const lockedUntil = isLocked ? (now + LOGIN_LOCK_DURATION_MS) : null;

  for (const key of [keys.comboKey, keys.idKey, keys.ipKey]) {
    MEMORY_LOGIN_ATTEMPTS.set(key, {
      failedAttempts: nextAttempts,
      lockedUntil,
      updatedAt: now
    });
  }

  try {
    const lockDate = lockedUntil ? new Date(lockedUntil) : null;
    for (const key of [keys.comboKey, keys.idKey, keys.ipKey]) {
      await prisma.loginAttempt.upsert({
        where: { key },
        update: { failedAttempts: nextAttempts, lockedUntil: lockDate },
        create: { key, failedAttempts: nextAttempts, lockedUntil: lockDate }
      });
    }
  } catch (err) {
    console.warn('DB loginAttempt upsert fallback:', err.message);
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - nextAttempts);
  return { nextAttempts, isLocked, remainingAttempts, lockedUntil };
};

const clearLoginAttempts = async (identifier, ip) => {
  const keys = getLockoutKeys(identifier, ip);
  for (const key of [keys.comboKey, keys.idKey, keys.ipKey]) {
    MEMORY_LOGIN_ATTEMPTS.delete(key);
  }
  try {
    await prisma.loginAttempt.deleteMany({
      where: { key: { in: [keys.comboKey, keys.idKey, keys.ipKey] } }
    });
  } catch (err) {
    console.error('clearLoginAttempts DB error:', err.message);
  }
};

// Serve static recorded lessons
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Fullematematik API is running...');
});

// Auth Routes
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { email, password, studentCode, loginType } = req.body;
  console.log('Login attempt:', { email, studentCode, loginType }); // Debug log

  try {
    const isStudentLogin = loginType === 'STUDENT';
    const rawIdentifier = isStudentLogin ? studentCode : email;

    if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      return res.status(400).json({ message: 'Geçersiz bilgiler' });
    }

    const normalizedCode = isStudentLogin ? rawIdentifier.trim().toUpperCase() : rawIdentifier.trim().toLowerCase();

    const clientIp = req.headers['x-forwarded-for']
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : (req.ip || req.socket.remoteAddress || '127.0.0.1');

    // 1. KESİN KİLİT KONTROLÜ (Doğru şifre girilse dahi kilitliyken panele sokmaz!)
    const lockedMinutes = await getLoginLockRemainingMinutes(normalizedCode, clientIp);
    if (lockedMinutes > 0) {
      return res.status(429).json({
        message: `Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen ${lockedMinutes} dakika sonra tekrar deneyin.`
      });
    }

    let user;

    if (isStudentLogin) {
      if (normalizedCode.startsWith('FMV')) {
        // Veli girişi
        user = await prisma.user.findUnique({ where: { parentCode: normalizedCode } });
        if (!user) {
          console.log('Parent user not found');
          const attemptInfo = await registerFailedLoginAttempt(normalizedCode, clientIp);
          if (attemptInfo.isLocked) {
            return res.status(429).json({
              message: 'Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen 15 dakika sonra tekrar deneyin.'
            });
          }
          return res.status(400).json({
            message: `Geçersiz bilgiler. (Kalan deneme hakkı: ${attemptInfo.remainingAttempts})`
          });
        }
        user = { ...user, role: 'PARENT' };
      } else {
        // Öğrenci girişi
        user = await prisma.user.findUnique({ where: { studentCode: normalizedCode } });
        if (!user) {
          console.log('Student user not found');
          const attemptInfo = await registerFailedLoginAttempt(normalizedCode, clientIp);
          if (attemptInfo.isLocked) {
            return res.status(429).json({
              message: 'Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen 15 dakika sonra tekrar deneyin.'
            });
          }
          return res.status(400).json({
            message: `Geçersiz bilgiler. (Kalan deneme hakkı: ${attemptInfo.remainingAttempts})`
          });
        }
      }
    } else {
      // Öğretmen / Yönetici girişi
      user = await prisma.user.findUnique({ where: { email: normalizedCode } });
      if (!user) {
        console.log('User not found');
        const attemptInfo = await registerFailedLoginAttempt(normalizedCode, clientIp);
        if (attemptInfo.isLocked) {
          return res.status(429).json({
            message: 'Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen 15 dakika sonra tekrar deneyin.'
          });
        }
        return res.status(400).json({
          message: `Geçersiz bilgiler. (Kalan deneme hakkı: ${attemptInfo.remainingAttempts})`
        });
      }

      if (!password) {
        const attemptInfo = await registerFailedLoginAttempt(normalizedCode, clientIp);
        if (attemptInfo.isLocked) {
          return res.status(429).json({
            message: 'Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen 15 dakika sonra tekrar deneyin.'
          });
        }
        return res.status(400).json({
          message: `Geçersiz bilgiler. (Kalan deneme hakkı: ${attemptInfo.remainingAttempts})`
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch');
        const attemptInfo = await registerFailedLoginAttempt(normalizedCode, clientIp);
        if (attemptInfo.isLocked) {
          return res.status(429).json({
            message: 'Üst üste 3 kez yanlış giriş yapıldığı için sistem 15 dakika kilitlenmiştir. Doğru şifre girilse dahi kilit süresi bitene kadar giriş yapılamaz. Lütfen 15 dakika sonra tekrar deneyin.'
          });
        }
        return res.status(400).json({
          message: `Geçersiz bilgiler. (Kalan deneme hakkı: ${attemptInfo.remainingAttempts})`
        });
      }

      // Auto upgrade specific emails to HEAD_TEACHER
      if ((normalizedCode === 'burakcelik@fullematematigi.com.tr' || normalizedCode === 'test@fulle.com') && user.role !== 'HEAD_TEACHER') {
        user = await prisma.user.update({
          where: { email: normalizedCode },
          data: { role: 'HEAD_TEACHER' }
        });
        console.log(`User ${normalizedCode} automatically upgraded to HEAD_TEACHER in DB`);
      }
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, grade: user.grade },
      secret,
      { expiresIn: '1d' }
    );

    await clearLoginAttempts(normalizedCode, clientIp);
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
    console.error('Login error:', err);
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
    const whereClause = req.user.role === 'HEAD_TEACHER' ? { id, deletedAt: null } : { id, teacherId: req.user.id, deletedAt: null };
    const existing = await prisma.user.findFirst({ where: whereClause });
    if (!existing) return res.status(403).json({ error: 'Bu öğrenciye erişim yetkiniz yok' });

    const timestamp = Date.now();
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: existing.email.includes('_deleted_') ? existing.email : `${existing.email}_deleted_${timestamp}`,
        studentCode: existing.studentCode ? (existing.studentCode.includes('_deleted_') ? existing.studentCode : `${existing.studentCode}_deleted_${timestamp}`) : null,
        parentCode: existing.parentCode ? (existing.parentCode.includes('_deleted_') ? existing.parentCode : `${existing.parentCode}_deleted_${timestamp}`) : null,
      }
    });
    res.json({ success: true, message: 'Öğrenci çöp kutusuna taşındı.' });
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

// Her hafta aynı gün/saatte tekrar eden ders serisi oluşturur (ör. 10 hafta boyunca her Pazartesi 18:00)
app.post('/api/teacher/create-recurring-lessons', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, dayOfWeek, time, weeks, studentIds, zoomJoinUrl, startDate } = req.body;
  try {
    const weekCount = parseInt(weeks);
    const targetDay = parseInt(dayOfWeek);
    const [hours, minutes] = (time || '12:00').split(':').map(Number);

    if (isNaN(weekCount) || weekCount < 1 || weekCount > 52) {
      return res.status(400).json({ error: 'Hafta sayısı 1 ile 52 arasında olmalıdır.' });
    }

    let targetIds = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetIds = studentIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    }
    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'Lütfen bu ders serisi için en az bir öğrenci seçin.' });
    }

    let finalUrl = zoomJoinUrl;
    if (!finalUrl) {
      finalUrl = await createDailyRoom();
    }
    if (!finalUrl) {
      const uniqueId = Math.random().toString(36).substring(2, 9);
      finalUrl = `https://meet.jit.si/FulleMatematik_${uniqueId}`;
    }

    // İlk dersin tarihini bul: seçilen başlangıç tarihi varsa ondan başlar, yoksa gün farkı ile hesaplar
    let firstDate;
    if (startDate) {
      firstDate = new Date(startDate);
      firstDate.setHours(hours, minutes, 0, 0);
    } else {
      if (isNaN(targetDay) || targetDay < 0 || targetDay > 6) {
        return res.status(400).json({ error: 'Geçersiz gün seçimi.' });
      }
      firstDate = new Date();
      firstDate.setHours(hours, minutes, 0, 0);
      const currentDay = new Date().getDay();
      let dayDiff = (targetDay - currentDay + 7) % 7;
      if (dayDiff === 0 && firstDate.getTime() <= Date.now()) {
        dayDiff = 7; // Bugünün saati zaten geçtiyse bir sonraki haftaya kaydır
      }
      firstDate.setDate(firstDate.getDate() + dayDiff);
    }

    const seriesId = crypto.randomUUID();
    const lessons = [];
    for (let i = 0; i < weekCount; i++) {
      const lessonDate = new Date(firstDate);
      lessonDate.setDate(lessonDate.getDate() + i * 7);
      const lesson = await prisma.lesson.create({
        data: {
          title,
          description,
          date: lessonDate,
          teacherId: req.user.id,
          studentId: targetIds[0],
          studentIds: JSON.stringify(targetIds),
          zoomJoinUrl: finalUrl,
          seriesId,
        },
      });
      lessons.push(lesson);
    }

    res.json({ success: true, seriesId, lessons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CLASSROOM (SINIFLAR) ROUTES ──────────────────────────────────────────

app.get('/api/teacher/classrooms', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const where = req.user.role === 'HEAD_TEACHER' ? {} : { teacherId: req.user.id };
    const classrooms = await prisma.classroom.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    const parsed = classrooms.map(c => ({
      ...c,
      studentIds: JSON.parse(c.studentIds || '[]')
    }));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/classrooms', auth, checkRole('TEACHER'), async (req, res) => {
  const { name, studentIds } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Sınıf adı zorunludur.' });
  }
  try {
    const ids = Array.isArray(studentIds) ? studentIds.map(Number).filter(id => !isNaN(id)) : [];
    const classroom = await prisma.classroom.create({
      data: {
        name: name.trim(),
        teacherId: req.user.id,
        studentIds: JSON.stringify(ids)
      }
    });
    res.json({ ...classroom, studentIds: ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/classrooms/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, studentIds } = req.body;
  try {
    const ids = Array.isArray(studentIds) ? studentIds.map(Number).filter(id => !isNaN(id)) : [];
    const classroom = await prisma.classroom.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        studentIds: JSON.stringify(ids)
      }
    });
    res.json({ ...classroom, studentIds: ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/classrooms/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.classroom.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



app.delete('/api/teacher/lessons/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const deleted = await prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true, deleted, message: 'Ders çöp kutusuna taşındı.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tekrarlayan bir ders serisindeki tüm gelecek/geçmiş dersleri çöp kutusuna taşır
app.delete('/api/teacher/lesson-series/:seriesId', auth, checkRole('TEACHER'), async (req, res) => {
  const { seriesId } = req.params;
  try {
    const deleted = await prisma.lesson.updateMany({
      where: { seriesId },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true, count: deleted.count, message: 'Ders serisi çöp kutusuna taşındı.' });
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
        where: { deletedAt: null },
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
        where: { teacherId: req.user.id, deletedAt: null },
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
    try {
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

      if (res.ok) {
        const data = await res.json();
        return { token: data.access_token, type: 'OAuth2' };
      }
      const errorText = await res.text();
      console.warn(`[Drive] Google OAuth2 Refresh Token hatası: ${errorText}. Service Account deneniyor...`);
    } catch (err) {
      console.warn(`[Drive] Google OAuth2 hatası: ${err.message}. Service Account deneniyor...`);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    console.warn('[Drive] Google credentials (OAuth2 veya Service Account) eksik veya geçersiz. Skipped Google Drive upload.');
    return null;
  }

  try {
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
      console.error(`[Drive] Google Service Account token isteği başarısız: ${errorText}`);
      return null;
    }

    const data = await res.json();
    return { token: data.access_token, type: 'ServiceAccount' };
  } catch (err) {
    console.error(`[Drive] Service Account kimlik doğrulama hatası: ${err.message}`);
    return null;
  }
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
        '-preset ultrafast',
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

async function verifyDriveFolder(accessToken, folderId) {
  if (!folderId) return false;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType&supportsAllDrives=true`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Drive] Klasör doğrulama başarısız (${folderId}): ${err}`);
      return false;
    }
    const data = await res.json();
    console.log(`[Drive] Klasör doğrulandı: "${data.name}" (${data.id})`);
    return true;
  } catch (e) {
    console.warn(`[Drive] Klasör doğrulama hatası: ${e.message}`);
    return false;
  }
}

async function uploadToGoogleDrive(assembledBuffer, fileName, folderId, mimeType = 'video/webm') {
  const authData = await getGoogleDriveAccessToken();
  if (!authData || !authData.token) {
    console.warn('[Drive] Access token alınamadı. Yükleme atlanıyor.');
    return null;
  }

  const { token: accessToken, type: authType } = authData;

  // Klasör erişilebilir mi kontrol et
  let resolvedFolderId = folderId;
  if (folderId) {
    const folderOk = await verifyDriveFolder(accessToken, folderId);
    if (!folderOk) {
      console.warn(`[Drive] Klasör erişilemez veya izin yetersiz (${folderId}).`);
      resolvedFolderId = null;
    }
  }

  // Service Account root yüklemesi yapamaz (Google Kota Kısıtlaması). Klasör zorunludur.
  if (authType === 'ServiceAccount' && !resolvedFolderId) {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    console.error(`[Drive HATA] Service Account ile yükleme yapabilmek için Google Drive'da bir klasör oluşturup ` +
      `service account e-postasına ("${serviceEmail}") "Düzenleyen" (Editor) izni vermelisiniz ` +
      `ve bu klasörün ID'sini GOOGLE_DRIVE_FOLDER_ID olarak .env dosyasına eklemelisiniz.`);
    throw new Error(`Google Drive yükleme hatası: Service Account için paylaşılan klasör izni eksik veya klasör ID geçersiz.`);
  }

  const metadata = {
    name: fileName,
    parents: resolvedFolderId ? [resolvedFolderId] : []
  };

  console.log(`Uploading assembled video (${assembledBuffer.length} bytes) to Google Drive (${authType})${resolvedFolderId ? ` (klasör: ${resolvedFolderId})` : ' (root)'}...`);

  // Büyük dosyalar (>5MB) için Resumable Upload kullanımı (daha kararlı ve kesintisiz aktarım)
  if (assembledBuffer.length > 5 * 1024 * 1024) {
    try {
      console.log(`[Drive] Büyük dosya tespit edildi (${(assembledBuffer.length / 1024 / 1024).toFixed(2)} MB). Resumable Upload başlatılıyor...`);
      const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': String(assembledBuffer.length)
        },
        body: JSON.stringify(metadata)
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error(`Resumable upload başlatılamadı (${initRes.status}): ${errText}`);
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) {
        throw new Error('Google Drive resumable upload URL alınamadı.');
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(assembledBuffer.length)
        },
        body: assembledBuffer
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Büyük dosya aktarımı başarısız (${uploadRes.status}): ${errText}`);
      }

      const fileData = await uploadRes.json();
      console.log(`Successfully uploaded large video to Google Drive (Resumable). File ID: ${fileData.id}`);
      return `drive:${fileData.id}`;
    } catch (resumableErr) {
      console.warn(`Resumable upload başarısız oldu, multipart deneniyor: ${resumableErr.message}`);
    }
  }

  // Küçük dosyalar veya yedek yöntem (<5MB) için Multipart Upload
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`));
  parts.push(assembledBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  
  const payload = Buffer.concat(parts);
  
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
    throw new Error(`Google Drive upload API failed (${response.status}): ${errorText}`);
  }
  
  const fileData = await response.json();
  const fileId = fileData.id;
  console.log(`Successfully uploaded to Google Drive. File ID: ${fileId}`);
  
  return `drive:${fileId}`;
}

// 🔒 Güvenli Drive Video Endpoint'i
app.get('/api/drive/stream/:fileId', auth, async (req, res) => {
  const { fileId } = req.params;

  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return res.status(400).json({ error: 'Geçersiz dosya ID.' });
  }

  try {
    const authData = await getGoogleDriveAccessToken();
    if (!authData || !authData.token) {
      return res.status(503).json({ error: 'Drive erişimi yapılandırılmamış.' });
    }
    const accessToken = authData.token;

    // Range header'ı destekle (video seeking için şart)
    const rangeHeader = req.headers['range'];
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        },
      }
    );

    if (!driveRes.ok) {
      const err = await driveRes.text();
      console.error(`Drive stream hatası (${fileId}):`, err);
      return res.status(driveRes.status).json({ error: 'Dosyaya erişilemedi.' });
    }

    // Drive'dan gelen header'ları öğrenciye ilet
    const contentType = driveRes.headers.get('content-type') || 'video/mp4';
    const contentLength = driveRes.headers.get('content-length');
    const contentRange = driveRes.headers.get('content-range');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, no-store'); // Önbelleğe alınmasın
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    res.status(rangeHeader ? 206 : 200);

    // Stream et — tüm videoyu belleğe alma
    const { Readable } = require('stream');
    Readable.fromWeb(driveRes.body).pipe(res);

  } catch (err) {
    console.error('Drive stream hatası:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Sunucu hatası.' });
    }
  }
});

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
        if (assembledBuffer.length > 40 * 1024 * 1024) {
          console.log(`Büyük video (${(assembledBuffer.length / 1024 / 1024).toFixed(2)} MB), CPU ve zaman aşımını önlemek için doğrudan WebM olarak yükleniyor.`);
        } else {
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
        where: { role: 'STUDENT', deletedAt: null },
        select: { id: true, email: true, name: true, grade: true, parentName: true, parentTel: true, studentTel: true, serviceProvided: true, paymentStatus: true, paymentDay: true, paymentAmount: true, paymentNote: true, paymentType: true, totalLessons: true, studentCode: true, parentCode: true, role: true, teacherId: true, createdAt: true, teacher: { select: { id: true, name: true } } }
      });
    } else {
      students = await prisma.user.findMany({
        where: { role: 'STUDENT', teacherId: req.user.id, deletedAt: null },
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
      where: { role: 'TEACHER', deletedAt: null },
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
    const existing = await prisma.user.findFirst({ where: { id, role: 'TEACHER', deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Öğretmen bulunamadı.' });

    const timestamp = Date.now();
    const deleted = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        email: existing.email.includes('_deleted_') ? existing.email : `${existing.email}_deleted_${timestamp}`
      }
    });
    res.json({ success: true, deleted, message: 'Öğretmen hesabı çöp kutusuna taşındı. Dersleri korundu.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRASH / ÇÖP KUTUSU ENDPOINTS ---
app.get('/api/teacher/trash', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const isHead = req.user.role === 'HEAD_TEACHER';
    const studentsWhere = isHead ? { role: 'STUDENT', NOT: { deletedAt: null } } : { role: 'STUDENT', teacherId: req.user.id, NOT: { deletedAt: null } };
    const teachersWhere = isHead ? { role: 'TEACHER', NOT: { deletedAt: null } } : { id: -1 };
    const lessonsWhere = isHead ? { NOT: { deletedAt: null } } : { teacherId: req.user.id, NOT: { deletedAt: null } };

    const students = await prisma.user.findMany({ where: studentsWhere, select: { id: true, name: true, email: true, role: true, deletedAt: true, grade: true, studentCode: true } });
    const teachers = await prisma.user.findMany({ where: teachersWhere, select: { id: true, name: true, email: true, role: true, deletedAt: true } });
    const lessons = await prisma.lesson.findMany({ where: lessonsWhere, include: { student: { select: { name: true } }, teacher: { select: { name: true } } } });

    res.json({ students, teachers, lessons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/trash/restore-user/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.deletedAt) return res.status(404).json({ error: 'Çöp kutusunda kullanıcı bulunamadı.' });

    const cleanEmail = user.email.replace(/_deleted_\d+$/, '');
    const cleanStudentCode = user.studentCode ? user.studentCode.replace(/_deleted_\d+$/, '') : null;
    const cleanParentCode = user.parentCode ? user.parentCode.replace(/_deleted_\d+$/, '') : null;

    const restored = await prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        email: cleanEmail,
        studentCode: cleanStudentCode,
        parentCode: cleanParentCode
      }
    });
    res.json({ success: true, restored, message: 'Kullanıcı başarıyla geri yüklendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/trash/restore-lesson/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson || !lesson.deletedAt) return res.status(404).json({ error: 'Çöp kutusunda ders bulunamadı.' });

    const restored = await prisma.lesson.update({
      where: { id },
      data: { deletedAt: null }
    });
    res.json({ success: true, restored, message: 'Ders başarıyla geri yüklendi.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/trash/restore-all', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const deletedUsers = await prisma.user.findMany({ where: { NOT: { deletedAt: null } } });
    for (const u of deletedUsers) {
      const cleanEmail = u.email.replace(/_deleted_\d+$/, '');
      const cleanStudentCode = u.studentCode ? u.studentCode.replace(/_deleted_\d+$/, '') : null;
      const cleanParentCode = u.parentCode ? u.parentCode.replace(/_deleted_\d+$/, '') : null;
      await prisma.user.update({
        where: { id: u.id },
        data: { deletedAt: null, email: cleanEmail, studentCode: cleanStudentCode, parentCode: cleanParentCode }
      });
    }

    await prisma.lesson.updateMany({
      where: { NOT: { deletedAt: null } },
      data: { deletedAt: null }
    });

    res.json({ success: true, message: 'Çöp kutusundaki tüm veri ve dersler başarıyla geri yüklendi!' });
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
  const { title, description, type, imageUrl, studentIds, deadline } = req.body;
  try {
    const targetIds = Array.isArray(studentIds) ? studentIds.map(Number).filter(id => !isNaN(id)) : [];
    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'En az bir öğrenci seçmelisiniz.' });
    }
    const homework = await prisma.homework.create({
      data: {
        title: title || (type === 'QUESTION' ? 'Soru' : 'Ödev'),
        description: description || '',
        type: type || 'HOMEWORK',
        imageUrl: imageUrl || null,
        teacherId: req.user.id,
        deadline: deadline ? new Date(deadline) : null,
        students: {
          create: targetIds.map(id => ({ studentId: id }))
        }
      },
      include: { students: true }
    });
    res.json(homework);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/student/:id/homeworks', auth, checkRole('TEACHER'), async (req, res) => {
  const studentId = parseInt(req.params.id);
  try {
    const items = await prisma.studentHomework.findMany({
      where: { studentId },
      include: { homework: true },
      orderBy: { id: 'desc' }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/homework/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.studentHomework.deleteMany({ where: { homeworkId: id } });
    await prisma.homework.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Routes
app.get('/api/student/lessons', auth, checkRole('STUDENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const allLessons = await prisma.lesson.findMany({
      where: { deletedAt: null },
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
      include: { homework: true },
      orderBy: { id: 'desc' }
    });
    res.json(homeworks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student/homework/:id/complete', auth, checkRole('STUDENT'), async (req, res) => {
  const homeworkId = parseInt(req.params.id);
  const { submissionImage, submissionNote } = req.body;
  try {
    const updated = await prisma.studentHomework.updateMany({
      where: {
        studentId: req.user.id,
        homeworkId: homeworkId
      },
      data: {
        status: 'COMPLETED',
        submissionImage: submissionImage || null,
        submissionNote: submissionNote || null,
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

let DEFAULT_PDF_NOTES = [];

// PDF Note Routes
app.get('/api/pdf-notes', async (req, res) => {
  try {
    const notes = await prisma.pdfNote.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } }
    });
    res.json(notes.length > 0 ? notes : DEFAULT_PDF_NOTES);
  } catch (err) {
    console.error('Error fetching pdf notes:', err.message);
    res.json(DEFAULT_PDF_NOTES);
  }
});

app.post('/api/teacher/pdf-notes', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, category, pdfUrl, fileName } = req.body;
  if (!title || !pdfUrl) {
    return res.status(400).json({ error: 'Lütfen ders notu başlığı ve PDF dosyası giriniz.' });
  }
  try {
    const note = await prisma.pdfNote.create({
      data: {
        title,
        description: description || '',
        category: category || 'Genel',
        pdfUrl,
        fileName: fileName || 'ders-notu.pdf',
        authorId: req.user?.id || null
      }
    });
    DEFAULT_PDF_NOTES.unshift(note);
    res.json({ success: true, note });
  } catch (err) {
    console.error('PDF note save fallback:', err.message);
    const note = {
      id: Date.now(),
      title,
      description: description || '',
      category: category || 'Genel',
      pdfUrl,
      fileName: fileName || 'ders-notu.pdf',
      createdAt: new Date().toISOString()
    };
    DEFAULT_PDF_NOTES.unshift(note);
    res.json({ success: true, note });
  }
});

app.delete('/api/teacher/pdf-notes/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.pdfNote.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  } catch (err) {
    console.error('PDF note delete fallback:', err.message);
  }
  DEFAULT_PDF_NOTES = DEFAULT_PDF_NOTES.filter(n => n.id !== id);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────
// 🎥 KONU ANLATIMI VİDEOLARI (Topic Lectures)
// ─────────────────────────────────────────────────────────

let MEMORY_TOPIC_LECTURES = [];

app.post('/api/teacher/topic-lectures', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, videoUrl, studentIds, targetGrades } = req.body;
  if (!title || !videoUrl) {
    return res.status(400).json({ error: 'Başlık ve video URL / yüklemesi zorunludur.' });
  }

  const sIds = Array.isArray(studentIds) ? JSON.stringify(studentIds) : (studentIds || '[]');
  const tGrades = Array.isArray(targetGrades) ? JSON.stringify(targetGrades) : (targetGrades || '[]');

  try {
    const lecture = await prisma.topicLecture.create({
      data: {
        title,
        description: description || '',
        videoUrl,
        teacherId: req.user.id,
        studentIds: sIds,
        targetGrades: tGrades
      }
    });
    return res.json({ success: true, topicLecture: lecture });
  } catch (err) {
    console.warn('Prisma topicLecture.create failed, using memory fallback:', err.message);
    const lecture = {
      id: Date.now(),
      title,
      description: description || '',
      videoUrl,
      teacherId: req.user.id,
      studentIds: sIds,
      targetGrades: tGrades,
      createdAt: new Date()
    };
    MEMORY_TOPIC_LECTURES.unshift(lecture);
    return res.json({ success: true, topicLecture: lecture });
  }
});

app.get('/api/teacher/topic-lectures', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const lectures = await prisma.topicLecture.findMany({
      where: { teacherId: req.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(lectures);
  } catch (err) {
    console.warn('Prisma topicLecture.findMany fallback:', err.message);
    return res.json(MEMORY_TOPIC_LECTURES.filter(l => l.teacherId === req.user.id));
  }
});

app.delete('/api/teacher/topic-lectures/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.topicLecture.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  } catch (err) {
    MEMORY_TOPIC_LECTURES = MEMORY_TOPIC_LECTURES.filter(l => l.id !== id);
  }
  return res.json({ success: true });
});

app.get('/api/student/topic-lectures', auth, checkRole('STUDENT'), async (req, res) => {
  const studentId = req.user.id;
  const studentGrade = (req.user.grade || '').trim();

  let allLectures = [];
  try {
    allLectures = await prisma.topicLecture.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  } catch (err) {
    allLectures = MEMORY_TOPIC_LECTURES;
  }

  const assigned = allLectures.filter(l => {
    let sIds = [];
    let tGrades = [];
    try { sIds = typeof l.studentIds === 'string' ? JSON.parse(l.studentIds) : (l.studentIds || []); } catch {}
    try { tGrades = typeof l.targetGrades === 'string' ? JSON.parse(l.targetGrades) : (l.targetGrades || []); } catch {}

    const isStudentAssigned = sIds.includes(studentId) || sIds.map(Number).includes(studentId);
    const isGradeAssigned = tGrades.includes(studentGrade) || tGrades.includes('ALL');

    return isStudentAssigned || isGradeAssigned || (sIds.length === 0 && tGrades.length === 0);
  });

  return res.json(assigned);
});

// ─────────────────────────────────────────────────────────
// 📝 ÖZEL TEST OLUŞTURMA & ÇÖZME (Custom Tests)
// ─────────────────────────────────────────────────────────

let MEMORY_CUSTOM_TESTS = [];
let MEMORY_TEST_SUBMISSIONS = [];

app.post('/api/teacher/custom-tests', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, optionCount, studentIds, targetGrades, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Test başlığı ve en az 1 soru zorunludur.' });
  }

  const optCount = parseInt(optionCount) === 5 ? 5 : 4;
  const sIds = Array.isArray(studentIds) ? JSON.stringify(studentIds) : (studentIds || '[]');
  const tGrades = Array.isArray(targetGrades) ? JSON.stringify(targetGrades) : (targetGrades || '[]');

  try {
    const newTest = await prisma.customTest.create({
      data: {
        title,
        description: description || '',
        optionCount: optCount,
        teacherId: req.user.id,
        studentIds: sIds,
        targetGrades: tGrades,
        questions: {
          create: questions.map((q, idx) => ({
            order: idx + 1,
            imageUrl: q.imageUrl || null,
            questionType: q.questionType === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
            correctAnswer: q.correctAnswer || null
          }))
        }
      },
      include: { questions: true }
    });
    return res.json({ success: true, test: newTest });
  } catch (err) {
    console.warn('Prisma customTest.create failed, using memory fallback:', err.message);
    const testId = Date.now();
    const formattedQuestions = questions.map((q, idx) => ({
      id: testId + idx + 1,
      testId,
      order: idx + 1,
      imageUrl: q.imageUrl || null,
      questionType: q.questionType === 'OPEN_ENDED' ? 'OPEN_ENDED' : 'MULTIPLE_CHOICE',
      correctAnswer: q.correctAnswer || null
    }));

    const newTest = {
      id: testId,
      title,
      description: description || '',
      optionCount: optCount,
      teacherId: req.user.id,
      studentIds: sIds,
      targetGrades: tGrades,
      questions: formattedQuestions,
      createdAt: new Date()
    };
    MEMORY_CUSTOM_TESTS.unshift(newTest);
    return res.json({ success: true, test: newTest });
  }
});

app.get('/api/teacher/custom-tests', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const tests = await prisma.customTest.findMany({
      where: { teacherId: req.user.id, deletedAt: null },
      include: { questions: true, submissions: { select: { id: true, studentId: true, submittedAt: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(tests);
  } catch (err) {
    console.warn('Prisma customTest.findMany fallback:', err.message);
    return res.json(MEMORY_CUSTOM_TESTS.filter(t => t.teacherId === req.user.id));
  }
});

app.get('/api/teacher/custom-tests/:id/submissions', auth, checkRole('TEACHER'), async (req, res) => {
  const testId = parseInt(req.params.id);
  try {
    const submissions = await prisma.testSubmission.findMany({
      where: { testId },
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { submittedAt: 'desc' }
    });
    return res.json(submissions);
  } catch (err) {
    return res.json(MEMORY_TEST_SUBMISSIONS.filter(s => s.testId === testId));
  }
});

app.delete('/api/teacher/custom-tests/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.customTest.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  } catch (err) {
    MEMORY_CUSTOM_TESTS = MEMORY_CUSTOM_TESTS.filter(t => t.id !== id);
  }
  return res.json({ success: true });
});

app.get('/api/student/custom-tests', auth, checkRole('STUDENT'), async (req, res) => {
  const studentId = req.user.id;
  const studentGrade = (req.user.grade || '').trim();

  let allTests = [];
  try {
    allTests = await prisma.customTest.findMany({
      where: { deletedAt: null },
      include: {
        questions: { select: { id: true } },
        submissions: { where: { studentId } }
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (err) {
    allTests = MEMORY_CUSTOM_TESTS.map(t => ({
      ...t,
      submissions: MEMORY_TEST_SUBMISSIONS.filter(s => s.testId === t.id && s.studentId === studentId)
    }));
  }

  const assigned = allTests.filter(t => {
    let sIds = [];
    let tGrades = [];
    try { sIds = typeof t.studentIds === 'string' ? JSON.parse(t.studentIds) : (t.studentIds || []); } catch {}
    try { tGrades = typeof t.targetGrades === 'string' ? JSON.parse(t.targetGrades) : (t.targetGrades || []); } catch {}

    const isStudentAssigned = sIds.includes(studentId) || sIds.map(Number).includes(studentId);
    const isGradeAssigned = tGrades.includes(studentGrade) || tGrades.includes('ALL');

    return isStudentAssigned || isGradeAssigned || (sIds.length === 0 && tGrades.length === 0);
  });

  const formatted = assigned.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    optionCount: t.optionCount || 4,
    questionCount: t.questions ? t.questions.length : 0,
    isSubmitted: t.submissions && t.submissions.length > 0,
    submittedAt: t.submissions && t.submissions.length > 0 ? t.submissions[0].submittedAt : null,
    createdAt: t.createdAt
  }));

  return res.json(formatted);
});

app.get('/api/student/custom-tests/:id', auth, checkRole('STUDENT'), async (req, res) => {
  const testId = parseInt(req.params.id);
  const studentId = req.user.id;

  try {
    const test = await prisma.customTest.findUnique({
      where: { id: testId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        submissions: { where: { studentId } }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test bulunamadı.' });
    }

    return res.json({
      id: test.id,
      title: test.title,
      description: test.description,
      optionCount: test.optionCount || 4,
      questions: test.questions.map(q => ({
        id: q.id,
        order: q.order,
        imageUrl: q.imageUrl,
        questionType: q.questionType
      })),
      isSubmitted: test.submissions && test.submissions.length > 0,
      submission: test.submissions && test.submissions.length > 0 ? test.submissions[0] : null
    });
  } catch (err) {
    const memTest = MEMORY_CUSTOM_TESTS.find(t => t.id === testId);
    if (!memTest) return res.status(404).json({ error: 'Test bulunamadı.' });

    const memSub = MEMORY_TEST_SUBMISSIONS.find(s => s.testId === testId && s.studentId === studentId);
    return res.json({
      id: memTest.id,
      title: memTest.title,
      description: memTest.description,
      optionCount: memTest.optionCount || 4,
      questions: memTest.questions,
      isSubmitted: !!memSub,
      submission: memSub || null
    });
  }
});

app.post('/api/student/custom-tests/:id/submit', auth, checkRole('STUDENT'), async (req, res) => {
  const testId = parseInt(req.params.id);
  const studentId = req.user.id;
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Geçersiz cevap formatı.' });
  }

  const answersStr = JSON.stringify(answers);

  try {
    const submission = await prisma.testSubmission.create({
      data: {
        testId,
        studentId,
        answers: answersStr,
        status: 'SUBMITTED'
      }
    });
    return res.json({ success: true, submission });
  } catch (err) {
    console.warn('Prisma testSubmission.create fallback:', err.message);
    const sub = {
      id: Date.now(),
      testId,
      studentId,
      answers: answersStr,
      status: 'SUBMITTED',
      submittedAt: new Date()
    };
    MEMORY_TEST_SUBMISSIONS.push(sub);
    return res.json({ success: true, submission: sub });
  }
});


// Camp / Course Routes
app.get('/api/camps', async (req, res) => {
  const { category } = req.query;
  try {
    const camps = await prisma.camp.findMany({
      orderBy: { createdAt: 'desc' }
    });
    if (category) {
      const filtered = camps.filter(c => {
        if (c.category) {
          if (c.category.includes(category)) return true;
          try {
            const parsed = JSON.parse(c.category);
            if (Array.isArray(parsed) && parsed.includes(category)) return true;
          } catch (e) {}
        }
        if (category === 'LGS 2027' && (c.badge?.includes('LGS') || c.title?.includes('LGS') || c.title?.includes('Ortaokul'))) return true;
        if (category === 'KPSS 2027' && (c.badge?.includes('KPSS') || c.title?.includes('KPSS'))) return true;
        if (category === 'YKS 2027' && (c.badge?.includes('YKS') || c.title?.includes('YKS') || c.title?.includes('Lisans'))) return true;
        if (category === 'MAARIF' && (c.badge?.includes('Maarif') || c.title?.includes('Maarif'))) return true;
        return false;
      });
      return res.json(filtered.length > 0 ? filtered : camps);
    }
    res.json(camps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/camps', auth, checkRole('TEACHER'), async (req, res) => {
  const { badge, title, subtitle, image, details, description, highlights, price, whatsappLink, category } = req.body;
  try {
    const catStr = typeof category === 'string' ? category : JSON.stringify(category || ['YKS 2027']);
    const camp = await prisma.camp.create({
      data: {
        badge,
        title,
        subtitle,
        image,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        description,
        highlights: typeof highlights === 'string' ? highlights : JSON.stringify(highlights),
        price,
        whatsappLink,
        category: catStr
      }
    });
    res.json(camp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/camps/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { badge, title, subtitle, image, details, description, highlights, price, whatsappLink, category } = req.body;
  try {
    const data = {
      badge,
      title,
      subtitle,
      image,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      description,
      highlights: typeof highlights === 'string' ? highlights : JSON.stringify(highlights),
      price,
      whatsappLink
    };
    if (category !== undefined) {
      data.category = typeof category === 'string' ? category : JSON.stringify(category);
    }
    const camp = await prisma.camp.update({
      where: { id },
      data
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

// DEFAULT QUOTA COURSES SEED
const DEFAULT_QUOTA_COURSES = [
  {
    id: 1,
    category: 'YKS 2027',
    title: 'TYT Matematik Canlı Kampı',
    description: 'Baştan sona Temel Matematik, Problem Çözüm Teknikleri ve Yeni Nesil YKS Soruları.',
    published: true,
    tracks: JSON.stringify(['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Yabancı Dil']),
    totalQuota: 25,
    remainingQuota: 6,
    price: '3.500 TL',
    image: '/IMG_2943.jpeg',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20YKS%202027%20TYT%20Matematik%20Kampı%20hakkında%20bilgi%20ve%20kontenjan%20ayırtmak%20istiyorum.'
  },
  {
    id: 2,
    category: 'YKS 2027',
    title: 'AYT Matematik Derece Kampı',
    description: 'İleri Seviye Fonksiyonlar, LTİ (Limit-Türev-İntegral), Trigonometri ve ÖSYM Soru Tipleri.',
    published: true,
    tracks: JSON.stringify(['Sayısal', 'Eşit Ağırlık']),
    totalQuota: 20,
    remainingQuota: 4,
    price: '4.000 TL',
    image: '/IMG_2999.jpeg',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20YKS%202027%20AYT%20Matematik%20Kampı%20hakkında%20bilgi%20ve%20kontenjan%20ayırtmak%20istiyorum.'
  },
  {
    id: 3,
    category: 'YKS 2027',
    title: 'Geometri Özel Soru Çözüm Grubu',
    description: 'Sıfırdan İleri Seviyeye Analitik Geometri, Üçgenler ve Çember Detaylı Konu & Soru Kampı.',
    published: true,
    tracks: JSON.stringify(['Sayısal', 'Eşit Ağırlık', 'Sözel', 'Yabancı Dil']),
    totalQuota: 15,
    remainingQuota: 3,
    price: '2.500 TL',
    image: '/IMG_3002.png',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20YKS%202027%20Geometri%20Grubu%20hakkında%20bilgi%20almak%20istiyorum.'
  },
  {
    id: 4,
    category: 'LGS 2027',
    title: '8. Sınıf LGS Matematik Şampiyonlar Kampı',
    description: 'LGS Yeni Nesil Mantık & Muhakeme Soruları, Çarpanlar Katlar, Üslü-Köklü İfadeler ve Deneme Çözümleri.',
    published: true,
    tracks: JSON.stringify(['LGS 8. Sınıf', '7. Sınıf Hazırlık']),
    totalQuota: 20,
    remainingQuota: 5,
    price: '3.000 TL',
    image: '/IMG_3001.jpeg',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20LGS%202027%20Matematik%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
  },
  {
    id: 5,
    category: 'KPSS 2027',
    title: 'KPSS Lisans & Ön Lisans Matematik Zirve Kampı',
    description: 'ÖSYM Çıkmış Sorular, Pratik Matematik Metotları ve Tüm KPSS Konu Anlatımı.',
    published: true,
    tracks: JSON.stringify(['Lisans', 'Ön Lisans']),
    totalQuota: 30,
    remainingQuota: 8,
    price: '3.500 TL',
    image: '/IMG_2999.jpeg',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20KPSS%202027%20Matematik%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
  },
  {
    id: 6,
    category: 'MAARIF',
    title: 'Türkiye Yüzyılı Maarif Modeli Yeni Müfredat Matematik Kampı',
    description: 'Yeni müfredat beceri temelli sorular, kavramsal anlama ve yeni nesil soru çözümleri.',
    published: true,
    tracks: JSON.stringify(['Maarif Lise', 'Maarif Ortaokul']),
    totalQuota: 20,
    remainingQuota: 7,
    price: '3.500 TL',
    image: '/IMG_3002.png',
    whatsappLink: 'https://wa.me/905350598950?text=Merhaba,%20Maarif%20Modeli%20Matematik%20Kampı%20hakkında%20bilgi%20almak%20istiyorum.'
  }
];

// Quota Courses & Applications Routes
app.get('/api/quota-courses', async (req, res) => {
  const { category } = req.query;
  try {
    let courses = await prisma.quotaCourse.findMany({
      where: category ? { category, published: true } : { published: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!courses || courses.length === 0) {
      courses = category 
        ? DEFAULT_QUOTA_COURSES.filter(c => c.category === category)
        : DEFAULT_QUOTA_COURSES;
    }
    res.json(courses);
  } catch (err) {
    console.error('Error fetching quota courses:', err);
    const filtered = category 
      ? DEFAULT_QUOTA_COURSES.filter(c => c.category === category)
      : DEFAULT_QUOTA_COURSES;
    res.json(filtered);
  }
});

app.get('/api/teacher/quota-courses', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    let courses = await prisma.quotaCourse.findMany({
      orderBy: { createdAt: 'desc' }
    });
    if (!courses || courses.length === 0) {
      courses = DEFAULT_QUOTA_COURSES;
    }
    res.json(courses);
  } catch (err) {
    console.error('Error fetching teacher quota courses:', err);
    res.json(DEFAULT_QUOTA_COURSES);
  }
});

app.post('/api/teacher/quota-courses', auth, checkRole('TEACHER'), async (req, res) => {
  const { category, title, description, published, tracks, totalQuota, remainingQuota, price, image, whatsappLink } = req.body;
  try {
    const course = await prisma.quotaCourse.create({
      data: {
        category: category || 'YKS 2027',
        title,
        description,
        published: published !== undefined ? published : true,
        tracks: typeof tracks === 'string' ? tracks : JSON.stringify(tracks || []),
        totalQuota: parseInt(totalQuota) || 20,
        remainingQuota: parseInt(remainingQuota) || 5,
        price: price || '3.500 TL',
        image: image || '/IMG_2943.jpeg',
        whatsappLink
      }
    });
    res.json(course);
  } catch (err) {
    console.error('Error creating quota course:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/quota-courses/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { category, title, description, published, tracks, totalQuota, remainingQuota, price, image, whatsappLink } = req.body;
  try {
    const course = await prisma.quotaCourse.update({
      where: { id },
      data: {
        category,
        title,
        description,
        published,
        tracks: typeof tracks === 'string' ? tracks : JSON.stringify(tracks || []),
        totalQuota: parseInt(totalQuota),
        remainingQuota: parseInt(remainingQuota),
        price,
        image,
        whatsappLink
      }
    });
    res.json(course);
  } catch (err) {
    console.error('Error updating quota course:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/quota-courses/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.quotaCourse.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quota course:', err);
    res.status(500).json({ error: err.message });
  }
});

let DEFAULT_QUOTA_APPLICATIONS = [];

// Student Quota Application endpoints
app.post('/api/quota-applications', async (req, res) => {
  const { quotaCourseId, category, courseTitle, track, studentName, phone, email } = req.body;
  try {
    if (!studentName || !phone || !email || !track) {
      return res.status(400).json({ message: 'Lütfen tüm alanları eksiksiz ve doğru doldurun.' });
    }

    // Telefon doğrulaması (Sadece 10 veya 11 hane rakam)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ message: 'Geçersiz telefon numarası. Telefon numarası 10 veya 11 haneli olmalıdır.' });
    }

    // E-posta doğrulaması
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Lütfen geçerli bir e-posta adresi girin.' });
    }

    let application = {
      id: Date.now(),
      quotaCourseId: quotaCourseId ? parseInt(quotaCourseId) : null,
      category: category || 'YKS 2027',
      courseTitle: courseTitle || 'Ders / Kamp',
      track: track || 'Sayısal',
      studentName: studentName.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    try {
      const dbApp = await prisma.quotaApplication.create({
        data: {
          quotaCourseId: application.quotaCourseId,
          category: application.category,
          courseTitle: application.courseTitle,
          track: application.track,
          studentName: application.studentName,
          phone: application.phone,
          email: application.email,
          status: 'PENDING'
        }
      });
      if (dbApp) application = dbApp;
    } catch (dbErr) {
      console.warn('DB QuotaApplication create fallback:', dbErr.message);
    }

    DEFAULT_QUOTA_APPLICATIONS.unshift(application);

    res.json({ success: true, application });
  } catch (err) {
    console.error('Error creating quota application:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teacher/quota-applications', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const apps = await prisma.quotaApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: { quotaCourse: true }
    });
    const combined = [...apps];
    for (const memApp of DEFAULT_QUOTA_APPLICATIONS) {
      if (!combined.some(a => a.id === memApp.id || (a.phone === memApp.phone && a.courseTitle === memApp.courseTitle))) {
        combined.unshift(memApp);
      }
    }
    res.json(combined);
  } catch (err) {
    console.error('Error fetching quota applications:', err);
    res.json(DEFAULT_QUOTA_APPLICATIONS);
  }
});

app.put('/api/teacher/quota-applications/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  try {
    const appRecord = await prisma.quotaApplication.update({
      where: { id },
      data: { status }
    });
    res.json(appRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Access Code Routes (Shopier / Özel Erişim Kodları)
const DEFAULT_ACCESS_CODES = [
  {
    id: 1,
    code: 'SHOP-8A92K',
    personName: 'Ahmet Yılmaz',
    packageName: 'Shopier LGS Matematik Kayıtları',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-'
  },
  {
    id: 2,
    code: 'DEMO123',
    personName: 'Örnek Öğrenci',
    packageName: 'Shopier Özel Matematik Ders Kayıtları (Demo)',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: 3,
    code: '1234',
    personName: 'Örnek Öğrenci',
    packageName: 'Shopier Özel Matematik Ders Kayıtları (Demo)',
    driveUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
];

const normalizeAccessCode = (input) => {
  if (!input) return { raw: '', alphanumeric: '', core: '' };
  const raw = input.toString().trim().toUpperCase();
  const alphanumeric = raw.replace(/[^A-Z0-9]/g, '');
  const core = alphanumeric.replace(/^SHOP/, '');
  return { raw, alphanumeric, core: core || alphanumeric };
};

const matchAccessCode = (inputCode, targetCode) => {
  if (!inputCode || !targetCode) return false;
  const normInput = normalizeAccessCode(inputCode);
  const normTarget = normalizeAccessCode(targetCode);

  return (
    normInput.raw === normTarget.raw ||
    normInput.alphanumeric === normTarget.alphanumeric ||
    (normInput.core !== '' && normTarget.core !== '' && normInput.core === normTarget.core)
  );
};

app.get('/api/access-codes', async (req, res) => {
  try {
    let codes = await prisma.accessCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
    if (!codes || codes.length === 0) {
      const defaultCode = await prisma.accessCode.create({
        data: {
          code: 'SHOP-8A92K',
          personName: 'Ahmet Yılmaz',
          packageName: 'Shopier LGS Matematik Kayıtları',
          driveUrl: 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-'
        }
      }).catch(() => null);
      codes = defaultCode ? [defaultCode] : DEFAULT_ACCESS_CODES;
    }
    res.json(codes);
  } catch (err) {
    console.error('Error fetching access codes:', err);
    res.json(DEFAULT_ACCESS_CODES);
  }
});

app.post('/api/access-codes', async (req, res) => {
  const { code, personName, packageName, driveUrl } = req.body;
  try {
    const rawCode = (code || `SHOP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`).trim().toUpperCase();
    const newCode = await prisma.accessCode.create({
      data: {
        code: rawCode,
        personName: personName?.trim() || 'Öğrenci',
        packageName: packageName?.trim() || 'Ders Kayıt Paketi',
        driveUrl: driveUrl?.trim() || 'https://drive.google.com/drive/u/0/folders/1PwOkf-1M80Ar-ct9TiiwRMdPW5G9d73-'
      }
    });
    res.json(newCode);
  } catch (err) {
    console.error('Error creating access code:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/access-codes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.accessCode.delete({
      where: { id: parseInt(id) }
    }).catch(() => null);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting access code:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/access-codes/verify', async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Lütfen bir erişim kodu girin.' });
  }

  try {
    let dbCodes = await prisma.accessCode.findMany().catch(() => []);
    const allCodes = [...dbCodes, ...DEFAULT_ACCESS_CODES];

    const found = allCodes.find(c => matchAccessCode(code, c.code));

    if (found) {
      return res.json({ success: true, data: found });
    }

    return res.status(404).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş erişim kodu. Lütfen öğretmeninizle iletişime geçin.'
    });
  } catch (err) {
    console.error('Error verifying access code:', err);
    const fallbackMatch = DEFAULT_ACCESS_CODES.find(c => matchAccessCode(code, c.code));
    if (fallbackMatch) {
      return res.json({ success: true, data: fallbackMatch });
    }
    return res.status(404).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş erişim kodu. Lütfen öğretmeninizle iletişime geçin.'
    });
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

// ═══════════════════════════════════════════════════════════
// OPENROUTER AI ENGINE (Tek ve Özel Yapay Zeka Motoru)
// ═══════════════════════════════════════════════════════════

function parseAIJSON(raw) {
  if (!raw) throw new Error('Yapay zeka boş yanıt döndürdü.');
  let str = String(raw).trim();
  // Markdown ```json ... ``` etiketlerini temizle
  str = str.replace(/^```(?:json)?\s*/gi, '').replace(/\s*```$/gi, '').trim();
  return JSON.parse(str);
}

async function executeAI({ systemPrompt, userText, base64Image, jsonFormat = false }) {
  const githubKey = (process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_KEY || '').replace(/['"\s]/g, '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '').replace(/['"\s]/g, '').trim();
  const openrouterKey = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '').replace(/['"\s]/g, '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').replace(/['"\s]/g, '').trim();

  if (!githubKey && !geminiKey && !openrouterKey && !groqKey) {
    throw new Error('HİÇBİR YAPAY ZEKA ANAHTARI BULUNAMADI! Lütfen .env veya Vercel Ortam Değişkenlerine GITHUB_TOKEN (GitHub Öğrenci Hesabı), GEMINI_API_KEY veya OPENROUTER_API_KEY ekleyin.');
  }

  const errorLogs = [];

  // 1. GitHub Student Pack / GitHub Models API (Ücretsiz - GPT-4o, GPT-4o-mini, Llama-3.3-70b)
  if (githubKey) {
    const ghModels = base64Image ? ['gpt-4o', 'gpt-4o-mini'] : ['gpt-4o', 'gpt-4o-mini', 'meta-llama-3.3-70b-instruct'];
    for (const model of ghModels) {
      try {
        const messages = [{ role: 'system', content: systemPrompt }];
        if (base64Image) {
          messages.push({
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: base64Image } },
              { type: 'text', text: userText || 'İçeriği çözümle.' }
            ]
          });
        } else {
          messages.push({ role: 'user', content: userText });
        }

        const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${githubKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.15,
            ...(jsonFormat ? { response_format: { type: 'json_object' } } : {})
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } else {
          const errText = await res.text();
          console.warn(`GitHub Models ${model} error (${res.status}):`, errText.substring(0, 150));
          errorLogs.push(`GitHub Models ${model} (${res.status})`);
        }
      } catch (e) {
        console.warn(`GitHub Models ${model} catch:`, e.message);
        errorLogs.push(`GitHub Models ${model}: ${e.message}`);
      }
    }
  }

  // 2. OpenRouter API
  if (openrouterKey) {
    const openrouterModels = base64Image
      ? [
          'google/gemini-2.0-flash-001',
          'google/gemini-flash-1.5',
          'meta-llama/llama-3.2-11b-vision-instruct'
        ]
      : [
          'meta-llama/llama-3.3-70b-instruct:free',
          'google/gemini-2.0-flash-001',
          'google/gemini-flash-1.5',
          'deepseek/deepseek-chat'
        ];

    for (const model of openrouterModels) {
      try {
        const messages = [{ role: 'system', content: systemPrompt }];
        if (base64Image) {
          messages.push({
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: base64Image } },
              { type: 'text', text: userText || 'İçeriği çözümle.' }
            ]
          });
        } else {
          messages.push({ role: 'user', content: userText });
        }

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://fullematematik.com',
            'X-Title': 'Fullematematik AI'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.15,
            ...(jsonFormat ? { response_format: { type: 'json_object' } } : {})
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        } else {
          const errText = await res.text();
          console.warn(`OpenRouter ${model} error (${res.status}):`, errText.substring(0, 150));
          errorLogs.push(`OpenRouter ${model} (${res.status})`);
        }
      } catch (e) {
        console.warn(`OpenRouter ${model} catch:`, e.message);
        errorLogs.push(`OpenRouter ${model}: ${e.message}`);
      }
    }
  }

  // 3. Gemini Direct API (Google AI Studio Free)
  if (geminiKey) {
    try {
      const parts = [{ text: systemPrompt + '\n\n' + userText }];
      if (base64Image) {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        parts.unshift({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.15,
            ...(jsonFormat ? { responseMimeType: 'application/json' } : {})
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`Gemini Direct API error (${res.status}):`, errText.substring(0, 150));
        errorLogs.push(`Gemini API (${res.status})`);
      }
    } catch (e) {
      console.warn('Gemini Direct API catch:', e.message);
      errorLogs.push(`Gemini API: ${e.message}`);
    }
  }

  throw new Error(`Yapay zeka servislerinden yanıt alınamadı. Hata detayı: ${errorLogs.join(' | ')}`);
}

// OpenRouter AI endpoint
app.post('/api/ai/ask', auth, async (req, res) => {
  const { question, image } = req.body;
  try {
    const systemPrompt = "Sen Fullematematiği Asistanı adında uzman bir matematik öğretmenisin. Öğrencinin gönderdiği matematik sorularını adım adım, anlaşılır ve eğitici bir dille çözmelisin. Eğer gönderilen görsel veya metin matematik ile ilgili değilse, öğrenciye sadece matematik konularında yardımcı olabileceğini kibarca hatırlat. Yanıtını Türkçe olarak ver.";
    const userText = question && question.trim() ? question : "Bu sorunun çözümünü adım adım açıklayarak yapabilir misin?";
    const answer = await executeAI({ systemPrompt, userText, base64Image: image, jsonFormat: false });
    res.json({ answer });
  } catch (err) {
    console.error('AI ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// TEST TARA — Fotoğraftaki soruları OpenRouter AI ile JSON'a çıkarır
app.post('/api/teacher/test-tara', auth, checkRole('TEACHER'), async (req, res) => {
  const { gorsel } = req.body;
  if (!gorsel) return res.status(400).json({ error: 'Görsel gönderilmedi.' });

  const sistemTalimati = `Sen deneyimli bir Türk matematik öğretmenisin. Sana bir test/soru kağıdı fotoğrafı gönderilecek. Fotoğraftaki TÜM soruları tek tek tespit et ve KaTeX/LaTeX formatını ($...$) kullanarak JSON döndür:
{"sorular":[{"no":1,"metin":"...","siklar":["A) ..."],"dogruSik":"","gorselAciklama":""}]}`;

  try {
    const rawContent = await executeAI({
      systemPrompt: sistemTalimati,
      userText: 'Bu fotoğraftaki tüm soruları JSON formatında çıkar.',
      base64Image: gorsel,
      jsonFormat: true
    });
    const ayristirilmis = parseAIJSON(rawContent);
    if (!Array.isArray(ayristirilmis.sorular)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen formatta yanıt vermedi.' });
    }
    res.json(ayristirilmis);
  } catch (err) {
    console.error('test-tara error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ders Notu Oluşturucu — Ham metni fasiküle dönüştürür
app.post('/api/teacher/ders-notu-ai', auth, checkRole('TEACHER'), async (req, res) => {
  const { metin } = req.body;
  if (!metin || !metin.trim()) return res.status(400).json({ error: 'İşlenecek metin gönderilmedi.' });

  const sistemTalimati = `Sen 15 yıllık deneyimli bir matematik öğretmeni ve dizgi grafik yayıncısısın. Sana verilen ham metni / ders notunu inceleyerek her bir öğeyi tam olarak sınıflandırıp harika bir ders fasikülü JSON yapısına dönüştürüyorsun.

İÇERİK SINIFLANDIRMA KURALLARI:
1. "konu": Konu anlatımları, kurallar, tanımlar, formüller, bilgi kutuları.
2. "ornek": Çözümlü örnek sorular veya inceleme örnekleri.
3. "soru": Test soruları, ödev soruları, pekiştirme soruları (varsa şıkları ile).
4. "cozum": Bir örneğin veya sorunun adım adım çözümü.
5. "not": Öğretmen notu, püf noktası, uyarı, dikkat edilmesi gereken hususlar.
6. "baslik": Konu veya ünite başlıkları.
7. "tablo": Veri tabloları veya eşleştirme matrisleri.

GENEL KURALLAR:
- İçeriği ASLA kısaltma veya özetleme.
- Tüm matematiksel ifadeleri $...$ içinde LaTeX formatında yaz (Örn: $x^2 + y^2 = r^2$, $\\frac{a}{b}$).
- Yalnızca aşağıdaki JSON formatını döndür:

{"bloklar":[
  {"tip":"baslik","metin":"...","stil":{"arkaPlan":"transparent","kenarlikRengi":"#1a1a1a","kenarlikTipi":"yok","ikon":"📌","tamGenislik":true}},
  {"tip":"konu","metin":"...","stil":{"arkaPlan":"#f8fafc","kenarlikRengi":"#0284c7","kenarlikTipi":"sol-cizgi","ikon":"💡","tamGenislik":true}},
  {"tip":"ornek","metin":"...","stil":{"arkaPlan":"#f0f9ff","kenarlikRengi":"#2563eb","kenarlikTipi":"sol-cizgi","ikon":"📘","tamGenislik":false}},
  {"tip":"cozum","metin":"...","stil":{"arkaPlan":"#f0fdf4","kenarlikRengi":"#10b981","kenarlikTipi":"sol-cizgi","ikon":"✅","tamGenislik":false}},
  {"tip":"soru","metin":"...","sikkar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":"","sikDuzen":"grid","stil":{"arkaPlan":"#ffffff","kenarlikRengi":"#e67e22","kenarlikTipi":"sol-cizgi","ikon":"❓","tamGenislik":false}},
  {"tip":"not","metin":"...","stil":{"arkaPlan":"#fff7ed","kenarlikRengi":"#f97316","kenarlikTipi":"kesikli","ikon":"⭐","tamGenislik":true}},
  {"tip":"tablo","basliklar":["..."],"satirlar":[["..."]],"stil":{"arkaPlan":"#ffffff","kenarlikRengi":"#cbd5e1","kenarlikTipi":"tam-cerceve","ikon":"","tamGenislik":true}}
]}`;

  try {
    const rawContent = await executeAI({
      systemPrompt: sistemTalimati,
      userText: 'Aşağıdaki metni tam ve eksiksiz oku ve fasikül JSON formatında çıkar:\n\n' + metin,
      jsonFormat: true
    });
    const ayristirilmis = parseAIJSON(rawContent);
    if (!Array.isArray(ayristirilmis.bloklar)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen formatta yanıt vermedi.' });
    }
    res.json(ayristirilmis);
  } catch (err) {
    console.error('ders-notu-ai error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ders Notu Görsel Okuyucu — PDF sayfasının tasarımını, sütun yapısını ve kutu stillerini birebir okur (Resim/foto yapıştırmadan)
app.post('/api/teacher/ders-notu-gorsel', auth, checkRole('TEACHER'), async (req, res) => {
  const { gorsel } = req.body;
  if (!gorsel) return res.status(400).json({ error: 'Görsel gönderilmedi.' });

  const sistemTalimati = `Sen 15 yıllık deneyimli bir matematik grafik yayıncısısın. Sana verilen ders notu / PDF sayfasının HEM METİN İÇERİĞİNİ HEM DE HER ÖĞENİN İŞLEVİNİ (konu anlatımı mı, örnek soru mu, test sorusu mu, çözüm mü, öğretmen notu mu?) VE TASARIMINI tam sadakatle çıkarıyorsun.

ZORUNLU ÖĞE SINIFLANDIRMA VE TASARIM KURALLARI:
1. BLOK TİPİ BELİRLEME (ÇOK ÖNEMLİ):
   - "konu": Konu anlatımı metinleri, kural kutuları, tanımlar, bilgi notları.
   - "ornek": Çözümlü örnek sorular veya inceleme problemleri.
   - "soru": Test soruları, şıklı veya açık uçlu sınav soruları.
   - "cozum": Adım adım çözümler veya açıklama adımları.
   - "not": İpucu, dikkat kutusu, öğretmen notu, püf noktası.
   - "baslik": Konu başlıkları, ünite başlıkları.
   - "tablo": Veri tabloları.
2. SÜTUN DÜZENİ: Sayfa 2 sütunlu düzen mi ("cift-sutun") yoksa tek sütunlu düzen mi ("tek-sutun")? "sayfaDuzeni" alanında MUTLAKA belirt.
3. FOTOĞRAF / GÖRSEL YAPIŞTIRMA YOK: İçeriği pürüzsüz metin, KaTeX matematik formülü ($...$) ve vektörel HTML kutuları olarak dönüştür.
4. KUTU VE RENK TASARIMLARI: Her blok için orijinal PDF'teki tasarım özelliklerini "stil" objesinde belirt:
   - "arkaPlan": Kutu arka plan HEX rengi (örn: "#f8fafc", "#f0f9ff", "#fff7ed", "#f0fdf4", "#ffffff")
   - "kenarlikRengi": Kenarlık HEX rengi (örn: "#0284c7", "#2563eb", "#e67e22", "#10b981", "#f97316")
   - "kenarlikTipi": Kutu kenarlık stili ("sol-cizgi" | "tam-cerceve" | "kesikli" | "yok")
   - "ikon": Kutu başındaki simge/ikon varsa yaz (örn: "📌", "💡", "📘", "✅", "❓", "⭐")
   - "tamGenislik": Başlık veya tablo 2 sütunu da kaplıyorsa true yap.
5. ŞIK DİZİLİMİ: Şıklar yan yana mı ("inline"), 2x2 grid mi ("grid"), alt alta mı ("block")? "sikDuzen" alanında belirt.

Yalnızca aşağıdaki JSON formatını döndür:
{
  "sayfaDuzeni": "cift-sutun",
  "bloklar": [
    {
      "tip": "baslik",
      "metin": "ÜÇGENDE AÇILAR",
      "stil": { "arkaPlan": "transparent", "kenarlikRengi": "#1a1a1a", "kenarlikTipi": "yok", "ikon": "📌", "tamGenislik": true }
    },
    {
      "tip": "konu",
      "metin": "Bir üçgenin iç açıları toplamı $180^\\circ$'dir.",
      "stil": { "arkaPlan": "#f8fafc", "kenarlikRengi": "#0284c7", "kenarlikTipi": "sol-cizgi", "ikon": "💡", "tamGenislik": true }
    },
    {
      "tip": "ornek",
      "metin": "ABC üçgeninde $m(\\hat{A}) = 50^\\circ$ ve $m(\\hat{B}) = 70^\\circ$ ise...",
      "stil": { "arkaPlan": "#f0f9ff", "kenarlikRengi": "#2563eb", "kenarlikTipi": "sol-cizgi", "ikon": "📘", "tamGenislik": false }
    },
    {
      "tip": "cozum",
      "metin": "$m(\\hat{C}) = 180^\\circ - (50^\\circ + 70^\\circ) = 60^\\circ$ bulunur.",
      "stil": { "arkaPlan": "#f0fdf4", "kenarlikRengi": "#10b981", "kenarlikTipi": "sol-cizgi", "ikon": "✅", "tamGenislik": false }
    },
    {
      "tip": "soru",
      "metin": "ABC üçgeninde $m(\\hat{A}) = 60^\\circ$ ise...",
      "sikkar": ["A) 30", "B) 45", "C) 60", "D) 90"],
      "dogruSik": "C",
      "sikDuzen": "inline",
      "stil": { "arkaPlan": "#ffffff", "kenarlikRengi": "#e67e22", "kenarlikTipi": "sol-cizgi", "ikon": "❓", "tamGenislik": false }
    }
  ]
}`;

  try {
    const rawContent = await executeAI({
      systemPrompt: sistemTalimati,
      userText: 'Bu PDF sayfasının tüm metin içeriğini, formüllerini ve ögelerin işlevlerini (konu, örnek, soru, çözüm, not) ve kutu stillerini eksiksiz JSON formatında çıkar.',
      base64Image: gorsel,
      jsonFormat: true
    });
    const ayristirilmis = parseAIJSON(rawContent);
    if (!Array.isArray(ayristirilmis.bloklar)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen formatta yanıt vermedi.' });
    }
    res.json(ayristirilmis);
  } catch (err) {
    console.error('ders-notu-gorsel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GPT İçerik Üretici — OpenRouter AI ile detaylı konu anlatımı veya test oluşturur
app.post('/api/teacher/gpt-uret', auth, checkRole('TEACHER'), async (req, res) => {
  const { konu, sinif, zorluk, tip, soruSayisi } = req.body;
  if (!konu || !konu.trim()) {
    return res.status(400).json({ error: 'Konu / başlık gönderilmedi.' });
  }

  try {
    const sinifStr  = sinif  ? ` (${sinif})` : '';
    const zorlukStr = zorluk === 'karma'  ? 'Karma (başlangıç seviyesinden YKS/LGS zorluğuna kadar)'
                    : zorluk === 'kolay'  ? 'Kolay / Temel seviye'
                    : zorluk === 'zor'    ? 'Zor / YKS-LGS seviyesi, mantık yoğun'
                    :                      'Orta seviye';

    let sistemTalimati, kullaniciMesaji;

    if (tip === 'test') {
      const adet = Math.min(Math.max(parseInt(soruSayisi) || 10, 5), 30);
      const yarimAdet = Math.floor(adet / 2);
      const kalanAdet = adet - yarimAdet;
      sistemTalimati = `Sen 20 yıllık deneyimli bir Türk matematik öğretmenisin. Senden verilen konuda TAM OLARAK ${adet} adet özgün matematik sorusu üretmeni istiyorum.

ZORUNLU KURAL — SORU DAĞILIMI:
- İlk ${yarimAdet} soru: Çoktan seçmeli (A, B, C, D şıklı)
- Son ${kalanAdet} soru: Açık uçlu (şıksız, yazılı cevap gerektiren)
Bu dağılıma kesinlikle uy, farklı yapamazsın.

DİĞER KURALLAR:
- Sorular birbirinden tamamen farklı alt konuları kapsamalı (geniş yelpaze).
- ${zorlukStr} seviyesinde olsun.
- Çoktan seçmeli sorular: A) B) C) D) formatında 4 şık yaz, dogruSik alanını doldur, cevap alanını boş bırak.
- Açık uçlu sorular: siklar alanını BOŞ DİZİ [] bırak, cevap alanına adım adım model çözümü yaz.
- Matematiksel ifadeleri $..$ içinde LaTeX ile yaz (örn: $\\frac{a}{b}$, $\\sqrt{x}$, $x^2$).
- Her soru özgün, gerçekçi ve öğretici olsun.
- Sadece aşağıdaki JSON şemasında yanıt ver, başka hiçbir şey ekleme:

{"sorular":[
  {"no":1,"metin":"Çoktan seçmeli soru metni...","siklar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":"B","gorselAciklama":"","cevap":""},
  {"no":${yarimAdet + 1},"metin":"Açık uçlu soru metni...","siklar":[],"dogruSik":"","gorselAciklama":"","cevap":"Adım adım çözüm: 1) ... 2) ... Sonuç: ..."}
]}`;
      kullaniciMesaji = `Konu: ${konu}${sinifStr}\nZorluk: ${zorlukStr}\nSoru sayısı: ${adet} (${yarimAdet} çoktan seçmeli + ${kalanAdet} açık uçlu)\n\nBu konuda TAM OLARAK ${adet} soru üret: ilk ${yarimAdet} tanesi çoktan seçmeli, son ${kalanAdet} tanesi açık uçlu.`;

    } else {
      sistemTalimati = `Sen 20 yıllık deneyimli bir Türk matematik öğretmenisin. Senden verilen konuda son derece detaylı, kapsamlı ve öğretici bir ders notu / fasikül hazırlamanı istiyorum.

KURALLAR:
- Konuyu MUTLAKA şu pedagojik sırayla işle, sıralamayı bozma ve konular arasında atlama yapma: 1) Tanım ve temel kavramlar, 2) Özellikler ve kurallar, 3) Formüller, 4) İspatlar (gerekiyorsa), 5) Çözümlü örnekler (kolaydan zora doğru), 6) Alıştırma soruları.
- Bir alt konuyu tamamlamadan bir sonrakine geçme; her başlık kendi içinde tam ve bitmiş olmalı.
- Her önemli noktayı ayrı başlık altında ver.
- En az 3-5 çözümlü örnek ekle; HER "ornek" bloğundan hemen sonra o örneğe ait TAM ve eksiksiz bir "cozum" bloğu gelmeli — asla çözümsüz veya yarım bırakılmış bir örnek olmasın.
- En az 5 alıştırma sorusu ekle (soru tipi).
- Matematiksel ifadeleri $..$ içinde LaTeX ile yaz.
- İçeriği asla kısaltma; ne kadar uzun ve detaylı olursa o kadar iyi.
- Sadece aşağıdaki JSON şemasında yanıt ver, şema dışında hiçbir metin ekleme:

{"bloklar":[
  {"tip":"baslik","metin":"..."},
  {"tip":"paragraf","metin":"..."},
  {"tip":"ornek","metin":"Örnek problem metni..."},
  {"tip":"cozum","metin":"Adım adım çözüm..."},
  {"tip":"soru","metin":"...","sikkar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":"A"},
  {"tip":"tablo","basliklar":["Sütun1","Sütun2"],"satirlar":[["...","..."]]}
]}`;
      kullaniciMesaji = `Konu: ${konu}${sinifStr}\nZorluk: ${zorlukStr}\n\nBu konu için son derece detaylı, kapsamlı bir ders notu / fasikül hazırla. Hiçbir şeyi kısaltma, tüm alt konuları, formülleri, örnekleri ve alıştırmaları ekle.`;
    }

    const rawContent = await executeAI({
      systemPrompt: sistemTalimati,
      userText: kullaniciMesaji,
      jsonFormat: true
    });
    const ayristirilmis = parseAIJSON(rawContent);

    if (tip === 'test' && !Array.isArray(ayristirilmis.sorular)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen soru formatında yanıt vermedi.' });
    }
    if (tip !== 'test' && !Array.isArray(ayristirilmis.bloklar)) {
      return res.status(502).json({ error: 'Yapay zeka beklenen blok formatında yanıt vermedi.' });
    }

    res.json(ayristirilmis);
  } catch (err) {
    console.error('gpt-uret error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PDF Metninden Test Sorusu Çıkarıcı (Vercel & ChatGPT Uyumlu)
app.post('/api/teacher/pdf-test-ai', auth, checkRole('TEACHER'), async (req, res) => {
  const { metin } = req.body;
  if (!metin || !metin.trim()) return res.status(400).json({ error: 'İşlenecek metin gönderilmedi.' });

  const sistemTalimati = `Sen 20 yıllık deneyimli bir Türk matematik öğretmenisin. Sana verilen metin parçası veya PDF sayfasındaki tüm matematik sorularını tespit edip tam ve eksiksiz olarak JSON formatında çıkarıyorsun.

KURALLAR:
1. Metinde soru kalıpları, problemler veya alıştırmalar varsa bunları eksiksiz olarak soru formatında çıkar.
2. Eğer metin düz konu anlatımı veya bilgi metni ise, o metindeki bilgileri kullanarak öğretmen için özgün çoktan seçmeli veya açık uçlu matematik soruları türet.
3. Çoktan seçmeli sorular için şıkları ("A) ...", "B) ...", "C) ...", "D) ...") siklar dizisine ekle ve dogruSik alanını (A, B, C, D harfi) belirle.
4. Açık uçlu sorular için siklar dizisini [] boş bırak, cevap alanına çözüm/cevap ekle.
5. Tüm matematiksel ifadeleri $...$ içinde LaTeX olarak yaz.
6. Yalnızca aşağıdaki JSON formatını döndür:

{"sorular":[
  {"no":1,"metin":"Soru metni...","siklar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":"A","gorselAciklama":"","cevap":""}
]}`;

  try {
    const rawContent = await executeAI({
      systemPrompt: sistemTalimati,
      userText: 'Aşağıdaki metindeki matematik sorularını eksiksiz olarak çıkar veya sorular oluştur:\n\n' + metin,
      jsonFormat: true
    });
    const ayristirilmis = parseAIJSON(rawContent);
    let sorular = [];
    if (Array.isArray(ayristirilmis.sorular)) {
      sorular = ayristirilmis.sorular;
    } else if (Array.isArray(ayristirilmis)) {
      sorular = ayristirilmis;
    } else if (ayristirilmis && typeof ayristirilmis === 'object') {
      const keys = Object.keys(ayristirilmis);
      for (const k of keys) {
        if (Array.isArray(ayristirilmis[k])) {
          sorular = ayristirilmis[k];
          break;
        }
      }
    }
    res.json({ sorular });
  } catch (err) {
    console.error('pdf-test-ai error:', err);
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

// ─────────────────────────────────────────────────────────
// 🗑️ Otomatik Kayıt Silme — 8 aydan eski ders kayıtları
// ─────────────────────────────────────────────────────────

async function deleteFromGoogleDrive(fileId) {
  try {
    const authData = await getGoogleDriveAccessToken();
    if (!authData || !authData.token) return;
    const accessToken = authData.token;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (res.status === 204 || res.status === 200) {
      console.log(`🗑️ Drive dosyası silindi: ${fileId}`);
    } else {
      const err = await res.text();
      console.warn(`Drive silme uyarısı (${fileId}): ${err}`);
    }
  } catch (err) {
    console.error(`Drive silme hatası (${fileId}):`, err.message);
  }
}

async function cleanupOldRecordings() {
  try {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);

    // 8 aydan eski, kaydı olan dersleri bul
    const oldLessons = await prisma.lesson.findMany({
      where: {
        recordingUrl: { not: null },
        date: { lt: eightMonthsAgo },
      },
      select: { id: true, title: true, date: true, recordingUrl: true },
    });

    if (oldLessons.length === 0) {
      console.log('🗑️ Silinecek eski ders kaydı bulunamadı.');
      return;
    }

    console.log(`🗑️ ${oldLessons.length} adet 8 aydan eski ders kaydı temizlenecek...`);

    for (const lesson of oldLessons) {
      // Drive'dan sil (drive:FILEID formatındaysa)
      if (lesson.recordingUrl?.startsWith('drive:')) {
        const fileId = lesson.recordingUrl.replace('drive:', '');
        await deleteFromGoogleDrive(fileId);
      }

      // DB'den kaydı temizle
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { recordingUrl: null },
      });

      console.log(`🗑️ Ders kaydı temizlendi: [${lesson.id}] ${lesson.title} (${lesson.date.toLocaleDateString('tr-TR')})`);
    }

    console.log(`✅ Eski kayıt temizleme tamamlandı. ${oldLessons.length} kayıt silindi.`);
  } catch (err) {
    console.error('Kayıt temizleme hatası:', err.message);
  }
}

// Sunucu başlayınca bir kez çalıştır, sonra her 24 saatte bir kontrol et
cleanupOldRecordings();
setInterval(cleanupOldRecordings, 24 * 60 * 60 * 1000);


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


// ─── HATA DEFTERİ ROUTES ───────────────────────────────────────────────────

// Öğrenci: fotoğraf yükle
app.post('/api/student/hata-defteri', auth, checkRole('STUDENT'), async (req, res) => {
  const { imageData, note } = req.body;
  if (!imageData) return res.status(400).json({ error: 'Fotoğraf verisi eksik.' });
  // Boyut kontrolü: max ~4MB base64
  if (imageData.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Fotoğraf boyutu çok büyük. Lütfen daha küçük bir fotoğraf seçin.' });
  }
  try {
    const entry = await prisma.hataDefteri.create({
      data: { studentId: req.user.id, imageData, note: note || null }
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Öğrenci: kendi kayıtlarını getir
app.get('/api/student/hata-defteri', auth, checkRole('STUDENT'), async (req, res) => {
  try {
    const entries = await prisma.hataDefteri.findMany({
      where: { studentId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageData: true, note: true, createdAt: true }
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Öğrenci: kendi kaydını sil
app.delete('/api/student/hata-defteri/:id', auth, checkRole('STUDENT'), async (req, res) => {
  const { id } = req.params;
  try {
    const entry = await prisma.hataDefteri.findUnique({ where: { id: parseInt(id) } });
    if (!entry || entry.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Bu kaydı silme yetkiniz yok.' });
    }
    await prisma.hataDefteri.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Öğretmen: öğrencinin hata defterini görüntüle
app.get('/api/teacher/student/:id/hata-defteri', auth, checkRole('TEACHER'), async (req, res) => {
  const { id } = req.params;
  try {
    const entries = await prisma.hataDefteri.findMany({
      where: { studentId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageData: true, note: true, createdAt: true }
    });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── END HATA DEFTERİ ROUTES ───────────────────────────────────────────────

module.exports = app;
