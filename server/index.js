const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('./middleware/auth');
const crypto = require('crypto');
const { AccessToken } = require('livekit-server-sdk');


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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static recorded lessons
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Fullematematik API is running...');
});

app.get('/api/debug', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const debugInfo = {
    cwd: process.cwd(),
    dirname: __dirname,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL: process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED',
      SERVER_TIME: new Date().toISOString(),
      LIVEKIT_API_KEY_EXISTS: !!process.env.LIVEKIT_API_KEY,
      LIVEKIT_API_KEY_PREVIEW: process.env.LIVEKIT_API_KEY ? `${process.env.LIVEKIT_API_KEY.substring(0, 5)}...${process.env.LIVEKIT_API_KEY.slice(-5)}` : 'N/A',
      LIVEKIT_API_SECRET_EXISTS: !!process.env.LIVEKIT_API_SECRET,
      LIVEKIT_API_SECRET_PREVIEW: process.env.LIVEKIT_API_SECRET ? `${process.env.LIVEKIT_API_SECRET.substring(0, 5)}...${process.env.LIVEKIT_API_SECRET.slice(-5)}` : 'N/A',
      LIVEKIT_URL_EXISTS: !!process.env.LIVEKIT_URL,
      LIVEKIT_URL_VALUE: process.env.LIVEKIT_URL || 'N/A'
    },
    exists: {
      dirname_devDb: fs.existsSync(path.resolve(__dirname, 'dev.db')),
      cwd_server_devDb: fs.existsSync(path.join(process.cwd(), 'server', 'dev.db')),
      cwd_devDb: fs.existsSync(path.join(process.cwd(), 'dev.db')),
      tmp_devDb: fs.existsSync('/tmp/dev.db'),
      prisma_schema: fs.existsSync(path.join(process.cwd(), 'server', 'prisma', 'schema.prisma')),
      cwd_files: [],
      dirname_files: []
    }
  };

  try {
    debugInfo.exists.cwd_files = fs.readdirSync(process.cwd());
  } catch (e) {
    debugInfo.exists.cwd_files = [e.message];
  }

  try {
    debugInfo.exists.dirname_files = fs.readdirSync(__dirname);
  } catch (e) {
    debugInfo.exists.dirname_files = [e.message];
  }

  res.json(debugInfo);
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
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
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_123';
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
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teacher/student/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { email, name, grade, parentName, parentTel, studentTel, serviceProvided, paymentStatus, paymentDay, paymentAmount, paymentNote } = req.body;
  try {
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
        paymentNote
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teacher/student/:id', auth, checkRole('TEACHER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    // Cascade delete relations
    await prisma.trial.deleteMany({ where: { studentId: id } });
    await prisma.studentHomework.deleteMany({ where: { studentId: id } });
    await prisma.lesson.updateMany({
      where: { studentId: id },
      data: { studentId: null }
    });

    const deleted = await prisma.user.delete({ where: { id } });
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teacher/create-lesson', auth, checkRole('TEACHER'), async (req, res) => {
  const { title, description, date, studentId, zoomJoinUrl } = req.body;
  try {
    let finalUrl = zoomJoinUrl;
    if (!finalUrl) {
      // Try to create a Daily.co room
      finalUrl = await createDailyRoom();
    }
    // Fallback to Jitsi Meet if no Daily.co API key or call fails
    if (!finalUrl) {
      const uniqueId = Math.random().toString(36).substring(2, 9);
      finalUrl = `https://meet.jit.si/FulleMatematik_${uniqueId}`;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        date: new Date(date),
        teacherId: req.user.id,
        studentId: studentId ? parseInt(studentId) : null,
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


app.get('/api/teacher/lessons', auth, checkRole('TEACHER'), async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: req.user.id },
      orderBy: { date: 'asc' },
      include: { student: { select: { id: true, name: true } } }
    });
    res.json(lessons);
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

app.post('/api/teacher/lessons/:id/upload-chunk', auth, checkRole('TEACHER'), async (req, res) => {
  const lessonId = parseInt(req.params.id);
  const chunkIndex = parseInt(req.headers['x-chunk-index']);
  const totalChunks = parseInt(req.headers['x-total-chunks']);

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

      // Concat the chunks buffer in memory (zero filesystem write!)
      const buffersToConcat = chunks.map(c => c.data);
      const assembledBuffer = Buffer.concat(buffersToConcat);

      console.log(`Assembled video buffer size: ${assembledBuffer.length} bytes. Uploading from backend to Catbox...`);

      let catboxRes;
      try {
        // Try native FormData + Blob first (supported in Node 18+)
        const fileBlob = new Blob([assembledBuffer], { type: 'video/webm' });
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', fileBlob, `lesson_${lessonId}.webm`);

        catboxRes = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          body: formData
        });
      } catch (err) {
        console.warn("Global FormData failed, falling back to manual boundary buffer:", err);
        // Fallback: manual buffer multipart construction (zero dependency)
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const parts = [];
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n`));
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="lesson_${lessonId}.webm"\r\nContent-Type: video/webm\r\n\r\n`));
        parts.push(assembledBuffer);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        
        const payload = Buffer.concat(parts);

        catboxRes = await fetch('https://catbox.moe/user/api.php', {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          body: payload
        });
      }

      if (!catboxRes.ok) {
        throw new Error('Dosya bulut sunucusuna yüklenemedi. Status: ' + catboxRes.statusText);
      }

      const fileUrl = await catboxRes.text();
      const cleanUrl = fileUrl.trim();
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
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
    res.json(students);
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
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { studentId: req.user.id },
          { studentId: null }
        ]
      },
      orderBy: { date: 'asc' },
      include: { teacher: { select: { name: true } } }
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
    if (lesson.studentId !== req.user.id && lesson.studentId !== null) {
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
    const lesson = await prisma.lesson.findUnique({
      where: { id }
    });
    if (!lesson) {
      return res.status(404).json({ error: 'Ders bulunamadı.' });
    }
    if (lesson.studentId !== req.user.id && lesson.studentId !== null) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    const updated = await prisma.lesson.update({
      where: { id },
      data: { 
        recordingRequested: true
      }
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
        studentName,
        email,
        phone,
        grade,
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
        name,
        phone,
        email,
        message: message || ''
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
  const { meetingNumber, role } = req.body;
  const sdkKey = process.env.ZOOM_SDK_KEY || 'YOUR_SDK_KEY';
  const sdkSecret = process.env.ZOOM_SDK_SECRET || 'YOUR_SDK_SECRET';

  if (!meetingNumber) {
    return res.status(400).json({ error: 'Toplantı numarası gereklidir.' });
  }

  try {
    // role: 1 for host (teacher), 0 for participant (student)
    const zoomRole = role === 'TEACHER' ? 1 : 0;
    
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

// Parent Routes
app.get('/api/parent/student', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.user.id }
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
      paymentNote: student.paymentNote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/parent/lessons', auth, checkRole('PARENT'), async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { studentId: req.user.id },
          { studentId: null }
        ]
      },
      orderBy: { date: 'asc' },
      include: { teacher: { select: { name: true } } }
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

    // Clean up legacy YouTube or external URLs in recordingUrl database entries
    const externalLessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { recordingUrl: { contains: 'youtube.com' } },
          { recordingUrl: { contains: 'youtu.be' } },
          { recordingUrl: { contains: 'google.com' } }
        ]
      }
    });

    for (const lesson of externalLessons) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          recordingUrl: `/uploads/lesson_${lesson.id}.webm`
        }
      });
      console.log(`Migrated legacy YouTube/external link to local storage path for lesson ${lesson.id}`);
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

module.exports = app;
