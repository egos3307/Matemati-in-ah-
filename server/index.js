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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Hesap + cihaz (IP) bazlı yanlış giriş kilidi: aynı hesaba aynı cihazdan 3 kez yanlış
// girilirse sadece o cihaz 10 dakika kilitlenir, diğer cihazlardan girişe dokunulmaz.
// Kayıtlar LoginAttempt tablosunda tutulur (serverless ortamda istekler farklı
// instance'lara düşebildiğinden bellek içi sayaç güvenilir değildir).
const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCK_DURATION_MS = 10 * 60 * 1000;

const getLoginAttemptKey = (userId, ip) => `${userId}:${ip}`;

const getLoginLockRemainingMinutes = async (key) => {
  const record = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!record || !record.lockedUntil) return 0;
  const remainingMs = new Date(record.lockedUntil).getTime() - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0;
};

const registerFailedLoginAttempt = async (key) => {
  const record = await prisma.loginAttempt.findUnique({ where: { key } });
  const nextAttempts = (record?.failedAttempts || 0) + 1;
  const data = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
    ? { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOGIN_LOCK_DURATION_MS) }
    : { failedAttempts: nextAttempts, lockedUntil: null };
  await prisma.loginAttempt.upsert({ where: { key }, update: data, create: { key, ...data } });
};

const clearLoginAttempts = async (key) => {
  await prisma.loginAttempt.deleteMany({ where: { key } });
};

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
        const attemptKey = getLoginAttemptKey(user.id, req.ip);
        const lockedMinutes = await getLoginLockRemainingMinutes(attemptKey);
        if (lockedMinutes > 0) {
          return res.status(429).json({ message: `Çok fazla yanlış giriş denemesi. Lütfen ${lockedMinutes} dakika sonra tekrar deneyin.` });
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
        const attemptKey = getLoginAttemptKey(user.id, req.ip);
        const lockedMinutes = await getLoginLockRemainingMinutes(attemptKey);
        if (lockedMinutes > 0) {
          return res.status(429).json({ message: `Çok fazla yanlış giriş denemesi. Lütfen ${lockedMinutes} dakika sonra tekrar deneyin.` });
        }
      }
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log('User not found');
        return res.status(400).json({ message: 'Geçersiz bilgiler' });
      }
      const attemptKey = getLoginAttemptKey(user.id, req.ip);
      const lockedMinutes = await getLoginLockRemainingMinutes(attemptKey);
      if (lockedMinutes > 0) {
        return res.status(429).json({ message: `Çok fazla yanlış giriş denemesi. Lütfen ${lockedMinutes} dakika sonra tekrar deneyin.` });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch');
        await registerFailedLoginAttempt(attemptKey);
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

    await clearLoginAttempts(getLoginAttemptKey(user.id, req.ip));
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

// Tekrarlayan bir ders serisindeki tüm gelecek/geçmiş dersleri toplu siler
app.delete('/api/teacher/lesson-series/:seriesId', auth, checkRole('TEACHER'), async (req, res) => {
  const { seriesId } = req.params;
  try {
    await prisma.homework.updateMany({
      where: { lesson: { seriesId } },
      data: { lessonId: null }
    });

    const deleted = await prisma.lesson.deleteMany({
      where: { seriesId }
    });
    res.json({ success: true, count: deleted.count });
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
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`, {
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
  const accessToken = await getGoogleDriveAccessToken();
  if (!accessToken) {
    return null;
  }

  // Klasör erişilebilir mi kontrol et; yoksa root'a yükle
  let resolvedFolderId = folderId;
  if (folderId) {
    const folderOk = await verifyDriveFolder(accessToken, folderId);
    if (!folderOk) {
      console.warn(`[Drive] Klasör erişilemez (${folderId}), root'a yüklenecek.`);
      resolvedFolderId = null;
    }
  }

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const metadata = {
    name: fileName,
    parents: resolvedFolderId ? [resolvedFolderId] : []
  };
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`));
  parts.push(assembledBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  
  const payload = Buffer.concat(parts);
  
  console.log(`Uploading assembled video (${assembledBuffer.length} bytes) to Google Drive${resolvedFolderId ? ` (klasör: ${resolvedFolderId})` : ' (root)'}...`);
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
  
  // Dosyayı herkese açık YAPMA — URL sadece API üzerinden token ile verilecek
  // Bu sayede öğrenci URL'yi paylaşsa bile başkası erişemez

  return `drive:${fileId}`;
}

// 🔒 Güvenli Drive Video Endpoint'i
// JWT token zorunlu — token'ı olmayan biri bu endpoint'i tetikleyemez.
// Google'ın dokümante edilmemiş yönlendirme linkleri (indirme linki, access_token
// query param) güvenilmez çıktı; video verisini kendi sunucumuzdan, doğru
// Content-Type/Range başlıklarıyla akıtıyoruz. Uzun kayıtlarda Vercel'in fonksiyon
// süre sınırına takılmaması için vercel.json'da maxDuration yükseltilmiştir.
app.get('/api/drive/stream/:fileId', auth, async (req, res) => {
  const { fileId } = req.params;

  // Sadece harf, rakam, tire ve alt çizgi — injection koruması
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return res.status(400).json({ error: 'Geçersiz dosya ID.' });
  }

  try {
    const accessToken = await getGoogleDriveAccessToken();
    if (!accessToken) {
      return res.status(503).json({ error: 'Drive erişimi yapılandırılmamış.' });
    }

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
  const { badge, title, subtitle, image, details, description, highlights, price, whatsappLink } = req.body;
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
        price,
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
  const { badge, title, subtitle, image, details, description, highlights, price, whatsappLink } = req.body;
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
        price,
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

// Groq Multimodal AI endpoint
app.post('/api/ai/ask', auth, async (req, res) => {
  const { question, image } = req.body;
  
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Yapay zeka anahtarı (GROQ_API_KEY) tanımlanmamış. Lütfen ekleyin.' });
    }

    console.log(`Using GROQ_API_KEY prefix: ${apiKey.substring(0, 6)}...`);

    const messages = [
      {
        role: "system",
        content: "Sen Fulematematiği Asistanı adında uzman bir matematik öğretmenisin. Öğrencinin gönderdiği matematik sorularını adım adım, anlaşılır ve eğitici bir dille çözmelisin. Eğer gönderilen görsel veya metin matematik ile ilgili değilse, öğrenciye sadece matematik konularında yardımcı olabileceğini kibarca hatırlat. Yanıtını Türkçe olarak ver."
      }
    ];

    const userContent = [];
    
    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    if (question && question.trim()) {
      userContent.push({ type: "text", text: question });
    } else if (!image) {
      userContent.push({ type: "text", text: "Bu sorunun çözümünü adım adım açıklayarak yapabilir misin?" });
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: imageData ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile',
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
        if (parsedErr.error?.message) errorMsg = `Groq API Hatası: ${parsedErr.error.message}`;
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

// TEST TARA — Fotoğraftaki soruları Groq / Gemini Vision ile JSON'a çıkarır
app.post('/api/teacher/test-tara', auth, checkRole('TEACHER'), async (req, res) => {
  const { gorsel } = req.body; // base64 data URL
  if (!gorsel) {
    return res.status(400).json({ error: 'Görsel gönderilmedi.' });
  }

  const sistemTalimati = `Sen deneyimli bir Türk matematik öğretmenisin. Sana bir test/soru kağıdı fotoğrafı gönderilecek.
Bu fotoğraftaki TÜM soruları tek tek tespit et ve aşağıdaki JSON formatında döndür.

KURALLAR:
- Fotoğraftaki her soruyu eksiksiz, kelimesi kelimesine al.
- Matematiksel ifadeleri $...$ arasında LaTeX olarak yaz.
- Şıkları A) B) C) D) E) formatında ayrı dizi elemanı olarak yaz.
- EĞER SORU AÇIK UÇLUYSA (şık yoksa, boşluk doldurma, yazılı cevap gerektiriyorsa) siklar alanını BOŞ DİZİ olarak bırak: "siklar": [].
- Eğer doğru şık işaretliyse dogruSik alanını doldur (örn: "A"), değilse boş bırak "".
- Görsel içeriyorsa (grafik, şekil, sayı doğrusu, koordinat ekseni, tablo vs.) gorselAciklama alanına görseli tam olarak betimle: eksenlerin aralığı, işaretli noktalar, değerler, şeklin özellikleri.
- Sadece aşağıdaki JSON şemasında yanıt ver, başka hiçbir açıklama ekleme:

{"sorular":[
  {
    "no": 1,
    "metin": "Soru metni buraya",
    "siklar": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "dogruSik": "",
    "gorselAciklama": ""
  },
  {
    "no": 2,
    "metin": "Açık uçlu soru örneği",
    "siklar": [],
    "dogruSik": "",
    "gorselAciklama": ""
  }
]}`;

  try {
    // 1. Gemini Vision dene (varsa)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const mimeMatch = gorsel.match(/^data:(image\/[a-zA-Z]+|application\/pdf);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = gorsel.replace(/^data:[^;]+;base64,/, '');

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: sistemTalimati + "\n\nBu fotoğraftaki soruları JSON formatında çıkar." }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: "application/json"
            }
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const ayristirilmis = JSON.parse(rawContent);
          if (Array.isArray(ayristirilmis.sorular)) {
            return res.json(ayristirilmis);
          }
        }
      } catch (e) {
        console.warn('Gemini test-tara catch hatası:', e.message);
      }
    }

    // 2. Groq Vision
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY veya GROQ_API_KEY tanımlanmamış.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
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
// Büyük metinler otomatik olarak parçalara bölünür ve bloklar birleştirilir
app.post('/api/teacher/ders-notu-ai', auth, checkRole('TEACHER'), async (req, res) => {
  const { metin } = req.body;
  if (!metin || !metin.trim()) {
    return res.status(400).json({ error: 'İşlenecek metin gönderilmedi.' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Yapay zeka anahtarı (GROQ_API_KEY) tanımlanmamış. Lütfen ekleyin.' });
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

    // Büyük metinleri parçalara böl (her parça ~6000 karakter, satır sınırında kes)
    const MAX_PARCA = 6000;
    const parcalar = [];
    if (metin.length <= MAX_PARCA) {
      parcalar.push(metin.trim());
    } else {
      const satirlar = metin.split('\n');
      let parca = '';
      for (const satir of satirlar) {
        if (parca.length + satir.length + 1 > MAX_PARCA && parca.length > 0) {
          parcalar.push(parca.trim());
          parca = '';
        }
        parca += satir + '\n';
      }
      if (parca.trim()) parcalar.push(parca.trim());
    }

    const tumBloklar = [];

    for (let pi = 0; pi < parcalar.length; pi++) {
      const parca = parcalar[pi];
      const parcaEtiketi = parcalar.length > 1 ? ` (Parça ${pi + 1}/${parcalar.length})` : '';
      console.log(`Groq ders-notu-ai: işleniyor${parcaEtiketi} — ${parca.length} karakter`);

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
            { role: 'user', content: parca }
          ],
          temperature: 0.2,
          max_tokens: 8000,
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
      const choice = data.choices?.[0];
      const rawContent = choice?.message?.content || '{}';

      // Model token limitine ulaşıp JSON'u kestiyse uyar
      if (choice?.finish_reason === 'length') {
        console.warn(`Groq ders-notu-ai${parcaEtiketi}: finish_reason=length — JSON kesilebilir!`);
      }

      let ayristirilmis;
      try {
        ayristirilmis = JSON.parse(rawContent);
      } catch (e) {
        console.error(`Groq JSON ayrıştırma hatası${parcaEtiketi}:`, rawContent.substring(0, 300));
        return res.status(502).json({ error: `Yapay zeka geçerli bir JSON döndürmedi${parcaEtiketi}. Lütfen tekrar deneyin.` });
      }

      if (Array.isArray(ayristirilmis.bloklar)) {
        tumBloklar.push(...ayristirilmis.bloklar);
      }
    }

    if (tumBloklar.length === 0) {
      return res.status(502).json({ error: 'Yapay zeka beklenen formatta yanıt vermedi.' });
    }

    res.json({ bloklar: tumBloklar });
  } catch (err) {
    console.error('Ders notu AI error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ders Notu Görsel Okuyucu — PDF sayfasının görselini Vision AI ile okuyup blok JSON döndürür
// (PDF metin çıkarımı yetersiz kaldığında devreye girer)
app.post('/api/teacher/ders-notu-gorsel', auth, checkRole('TEACHER'), async (req, res) => {
  const { gorsel } = req.body;
  if (!gorsel) {
    return res.status(400).json({ error: 'Görsel gönderilmedi.' });
  }

  const sistemTalimati = `Sen 15 yıllık deneyimli bir matematik öğretmenisin. Sana bir ders notu veya soru kağıdı fotoğrafı/görseli gönderiliyor.
Görseldeki içeriği eksiksiz oku ve aşağıdaki JSON formatında fasikül bloklarına dönüştür.

KURALLAR:
- Tüm içeriği eksiksiz al; hiçbir şeyi kısaltma veya atlama.
- Matematiksel ifadeleri $...$ arasında LaTeX olarak yaz (örn: $x^2+5x+6=0$).
- Konu başlıklarını "baslik" tipine al.
- Çoktan seçmeli soruları "soru" tipine al; şıkları A) B) C) D) formatında yaz.
- Çözümlü örnekleri "ornek" + "cozum" tipine al.
- Tabloları "tablo" tipine al.
- Düz açıklama metinleri "paragraf" tipine al.
- Yalnızca aşağıdaki JSON şemasında yanıt ver, başka hiçbir açıklama ekleme:

{"bloklar":[
  {"tip":"baslik","metin":"..."},
  {"tip":"paragraf","metin":"..."},
  {"tip":"ornek","metin":"Örnek problemin metni..."},
  {"tip":"cozum","metin":"Örneğin çözüm adımları..."},
  {"tip":"soru","metin":"...","sikkar":["A) ...","B) ...","C) ...","D) ..."],"dogruSik":""},
  {"tip":"tablo","basliklar":["Sütun1","Sütun2"],"satirlar":[["...","..."]]}
]}`;

  try {
    // 1. Önce Gemini 1.5 Flash Vision API ile tara (varsa)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const mimeMatch = gorsel.match(/^data:(image\/[a-zA-Z]+|application\/pdf);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const base64Data = gorsel.replace(/^data:[^;]+;base64,/, '');

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Data } },
                { text: sistemTalimati + "\n\nBu görseldeki ders notu / soru kağıdı içeriğini eksiksiz oku ve belirtilen JSON formatında yanıt ver." }
              ]
            }],
            generationConfig: {
              temperature: 0.15,
              response_mime_type: "application/json"
            }
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const ayristirilmis = JSON.parse(rawContent);
          if (Array.isArray(ayristirilmis.bloklar)) {
            console.log('Gemini 1.5 Flash Vision AI ile görsel/PDF başarıyla taranarak ayrıştırıldı.');
            return res.json(ayristirilmis);
          }
        } else {
          console.warn('Gemini Flash API hatası, Groq ile devam ediliyor:', await geminiRes.text());
        }
      } catch (e) {
        console.warn('Gemini Flash catch hatası, Groq ile devam ediliyor:', e.message);
      }
    }

    // 2. Gemini yoksa veya hata verdiyse Groq Vision ile tara
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY veya GROQ_API_KEY tanımlanmamış.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          { role: 'system', content: sistemTalimati },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: gorsel } },
              { type: 'text', text: 'Bu görseldeki ders notu / soru kağıdı içeriğini JSON formatında çıkar.' }
            ]
          }
        ],
        temperature: 0.15,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq ders-notu-gorsel error:', errText);
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
      console.error('Groq ders-notu-gorsel JSON parse error:', rawContent);
      return res.status(502).json({ error: 'AI geçerli JSON döndürmedi, tekrar deneyin.' });
    }

    if (!Array.isArray(ayristirilmis.bloklar)) {
      return res.status(502).json({ error: 'AI beklenen formatta yanıt vermedi.' });
    }

    res.json(ayristirilmis);
  } catch (err) {
    console.error('ders-notu-gorsel error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GPT İçerik Üretici — Cerebras API (gpt-oss-120b) ile detaylı konu anlatımı veya test oluşturur
// CEREBRAS_API_KEY ortam değişkenine eklenmeli
app.post('/api/teacher/gpt-uret', auth, checkRole('TEACHER'), async (req, res) => {
  const { konu, sinif, zorluk, tip, soruSayisi } = req.body;
  if (!konu || !konu.trim()) {
    return res.status(400).json({ error: 'Konu / başlık gönderilmedi.' });
  }

  try {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'CEREBRAS_API_KEY Vercel ortam değişkenlerine eklenmemiş. Lütfen ekleyin.' });
    }

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

    const cerebrasCagir = async (mesajlar) => {
      const yanit = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-oss-120b',
          messages: mesajlar,
          temperature: 0.7,
          max_tokens: 16000,
          response_format: { type: 'json_object' }
        })
      });

      if (!yanit.ok) {
        const errText = await yanit.text();
        console.error('Cerebras gpt-uret error:', errText);
        let errorMsg = 'Cerebras servisi yanıt vermedi.';
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) errorMsg = `Cerebras: ${parsed.error.message}`;
        } catch(e) {}
        const hata = new Error(errorMsg);
        hata.status = yanit.status;
        throw hata;
      }

      const data = await yanit.json();
      const choice = data.choices?.[0];
      return { rawContent: choice?.message?.content || '{}', finishReason: choice?.finish_reason };
    };

    let ayristirilmis;

    if (tip === 'test') {
      const { rawContent } = await cerebrasCagir([
        { role: 'system', content: sistemTalimati },
        { role: 'user',   content: kullaniciMesaji }
      ]);

      try {
        ayristirilmis = JSON.parse(rawContent);
      } catch(e) {
        console.error('Cerebras JSON parse error:', rawContent.substring(0, 500));
        return res.status(502).json({ error: 'Model geçerli JSON döndürmedi, tekrar deneyin.' });
      }

      if (!Array.isArray(ayristirilmis.sorular)) {
        return res.status(502).json({ error: 'Model beklenen soru formatında yanıt vermedi.' });
      }
    } else {
      // Ders notu tek seferde token limitine takılıp yarıda kalabiliyor.
      // finish_reason 'length' geldiğinde kalan içeriği otomatik olarak devam ettirip birleştiriyoruz.
      const MAX_DEVAM = 2;
      const mesajlar = [
        { role: 'system', content: sistemTalimati },
        { role: 'user',   content: kullaniciMesaji }
      ];
      const tumBloklar = [];

      for (let devamSayaci = 0; devamSayaci <= MAX_DEVAM; devamSayaci++) {
        const { rawContent, finishReason } = await cerebrasCagir(mesajlar);

        let parcaBloklar = [];
        try {
          const parcaJson = JSON.parse(rawContent);
          if (Array.isArray(parcaJson.bloklar)) parcaBloklar = parcaJson.bloklar;
        } catch(e) {
          console.error('Cerebras JSON parse error:', rawContent.substring(0, 500));
          if (tumBloklar.length === 0) {
            return res.status(502).json({ error: 'Model geçerli JSON döndürmedi, tekrar deneyin.' });
          }
          break;
        }

        if (finishReason === 'length' && parcaBloklar.length > 0) {
          // Token limitine takılan son blok muhtemelen yarım kalmıştır, devam isteğinde yeniden ürettirilecek.
          parcaBloklar = parcaBloklar.slice(0, -1);
        }

        tumBloklar.push(...parcaBloklar);

        if (finishReason !== 'length' || devamSayaci === MAX_DEVAM) break;

        console.warn(`gpt-uret ders notu: finish_reason=length, devam isteği gönderiliyor (${devamSayaci + 1}/${MAX_DEVAM})`);
        mesajlar.push({ role: 'assistant', content: rawContent });
        mesajlar.push({
          role: 'user',
          content: 'Yanıtın token limiti nedeniyle yarıda kesildi. Önceki blokları TEKRARLAMADAN, konu anlatımının/örneklerin/alıştırmaların KALAN kısmıyla devam et. Aynı JSON şemasını kullanarak sadece yeni blokları {"bloklar":[...]} formatında döndür.'
        });
      }

      if (tumBloklar.length === 0) {
        return res.status(502).json({ error: 'Model beklenen blok formatında yanıt vermedi.' });
      }

      ayristirilmis = { bloklar: tumBloklar };
    }

    res.json(ayristirilmis);
  } catch (err) {
    console.error('gpt-uret error:', err);
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
    const accessToken = await getGoogleDriveAccessToken();
    if (!accessToken) return;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
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
