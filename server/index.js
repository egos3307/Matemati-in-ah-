const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { auth, checkRole } = require('./middleware/auth');

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

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Fullematematiği API is running...');
});
// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password, studentCode, loginType } = req.body;
  console.log('Login attempt:', { email, studentCode, loginType }); // Debug log
  try {
    let user;
    if (loginType === 'STUDENT') {
      user = await prisma.user.findUnique({ where: { studentCode } });
      if (!user) {
        console.log('User not found');
        return res.status(400).json({ message: 'Geçersiz bilgiler' });
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

    console.log('Login successful for:', user.email || user.studentCode);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        studentCode: user.studentCode,
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
  const { email, password, name, grade, parentName, parentTel, studentTel } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || 'student', 10);
    
    // Generate unique FMXXX code
    let studentCode;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
      studentCode = `FM${randomNum}`;
      const existing = await prisma.user.findUnique({ where: { studentCode } });
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
        role: 'STUDENT' 
      },
    });
    res.json(student);
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

// Mock AI endpoint
app.post('/api/ai/ask', auth, async (req, res) => {
  const { question } = req.body;
  res.json({ answer: `Bu harika bir soru! "${question}" hakkında çalışmaya devam etmelisin. Yakında gerçek AI desteği eklenecek.` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
