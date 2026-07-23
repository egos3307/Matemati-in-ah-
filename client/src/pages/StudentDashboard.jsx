import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LiveMeeting from '../components/LiveMeeting';
import ZoomMeeting from '../components/ZoomMeeting';

const parseZoomUrl = (url) => {
  if (!url) return { meetingNumber: '', password: '' };
  const numberMatch = url.match(/\/j\/(\d+)/) || url.match(/\/s\/(\d+)/) || url.match(/\b\d{9,11}\b/);
  const meetingNumber = numberMatch ? numberMatch[1] || numberMatch[0] : '';
  const pwdMatch = url.match(/pwd=([^&]+)/) || url.match(/[\?&]pwd=(\w+)/);
  const password = pwdMatch ? pwdMatch[1] : '';
  return { meetingNumber, password };
};

const compressImage = (file, callback) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      callback(compressedDataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('panel'); 
  const [lessons, setLessons] = useState([]);
  const notifiedLessonsRef = useRef(new Set());
  const [homeworks, setHomeworks] = useState([]);
  const [trials, setTrials] = useState([]);
  const [newTrial, setNewTrial] = useState({ name: '', type: 'GENEL', results: {} });
  const [subjects, setSubjects] = useState([]);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [expandedTrialId, setExpandedTrialId] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChat, setAiChat] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [searchLessonId, setSearchLessonId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const { user, logout } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('topics'); 
  const [topicProgress, setTopicProgress] = useState({});
  const [dailyLog, setDailyLog] = useState({ questions: 0, minutes: 0, notes: '' });
  const [dailyLogInput, setDailyLogInput] = useState({ questions: '', minutes: '', notes: '' });

  // Hata Defteri states
  const [hataDefteri, setHataDefteri] = useState([]);
  const [hataNote, setHataNote] = useState('');
  const [hataUploading, setHataUploading] = useState(false);
  const [hataLightbox, setHataLightbox] = useState(null);
  
  // Study Timer (Sayaç) States & Effects
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [studyHistory, setStudyHistory] = useState([]);

  // Motivational Profile & Goals (Hedefler) States
  const [profileBanner, setProfileBanner] = useState('');
  const [profileMotto, setProfileMotto] = useState('Matematikte zirveye ulaşmak için her gün bir adım daha!');
  const [goals, setGoals] = useState([]);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [aiImage, setAiImage] = useState('');
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowInstallPopup(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval = null;
    if (timerIsActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerIsActive]);

  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const userGrade = user?.grade || "5";

  const loadStudyHistory = () => {
    if (!user) return;
    const savedLogs = localStorage.getItem(`fulle_logs_${user?.id}`);
    if (savedLogs) {
      const logs = JSON.parse(savedLogs);
      const sortedHistory = Object.keys(logs)
        .map(date => ({ date, ...logs[date] }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setStudyHistory(sortedHistory);
    } else {
      setStudyHistory([]);
    }
  };



  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/student/lessons');
      setLessons(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHomeworks = async () => {
    try {
      const res = await axios.get('/api/student/homeworks');
      setHomeworks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrials = async () => {
    try {
      const res = await axios.get('/api/student/trials');
      setTrials(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHataDefteri = async () => {
    try {
      const res = await axios.get('/api/student/hata-defteri');
      setHataDefteri(res.data);
    } catch (err) {
      console.error('Hata defteri yüklenemedi:', err);
    }
  };

  const handleHataUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setHataUploading(true);
    compressImage(file, async (base64) => {
      try {
        await axios.post('/api/student/hata-defteri', { imageData: base64, note: hataNote || null });
        setHataNote('');
        await fetchHataDefteri();
      } catch (err) {
        alert(err.response?.data?.error || 'Fotoğraf yüklenirken hata oluştu.');
      } finally {
        setHataUploading(false);
        e.target.value = '';
      }
    });
  };

  const handleHataDelete = async (id) => {
    if (!window.confirm('Bu fotoğrafı silmek istediğine emin misin?')) return;
    try {
      await axios.delete(`/api/student/hata-defteri/${id}`);
      setHataDefteri(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert('Silinemedi.');
    }
  };

  useEffect(() => {
    if (!user) return;
    loadSubjects();
    loadStudyHistory();
    fetchLessons();
    fetchHataDefteri();
    fetchHomeworks();
    fetchTrials();

    // Load profile customizations & goals
    const savedBanner = localStorage.getItem(`fulle_profile_banner_${user?.id}`);
    if (savedBanner) setProfileBanner(savedBanner);
    const savedMotto = localStorage.getItem(`fulle_profile_motto_${user?.id}`);
    if (savedMotto) setProfileMotto(savedMotto);
    const savedGoals = localStorage.getItem(`fulle_goals_${user?.id}`);
    if (savedGoals) setGoals(JSON.parse(savedGoals));

    const savedProgress = localStorage.getItem(`fulle_progress_${user?.id}`);
    if (savedProgress) {
      setTopicProgress(JSON.parse(savedProgress));
    }
    const today = new Date().toISOString().split('T')[0];
    const savedLogs = localStorage.getItem(`fulle_logs_${user?.id}`);
    if (savedLogs) {
      const logs = JSON.parse(savedLogs);
      if (logs[today]) {
        setDailyLog(logs[today]);
        setDailyLogInput({
          questions: logs[today].questions.toString(),
          minutes: logs[today].minutes.toString(),
          notes: logs[today].notes || ''
        });
      }
    }
  }, [user]);

  // Request Notification Permission & Check for starting lessons
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!lessons || lessons.length === 0) return;

    const checkLessonsForNotification = () => {
      const now = new Date().getTime();
      lessons.forEach(lesson => {
        const lessonTime = new Date(lesson.date).getTime();
        const diffMinutes = (lessonTime - now) / (1000 * 60);

        // If lesson starts in next 5 minutes and hasn't been notified yet in this session
        if (diffMinutes > 0 && diffMinutes <= 5 && !notifiedLessonsRef.current.has(lesson.id)) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Canlı Dersiniz Başlıyor!", {
              body: `"${lesson.title}" dersiniz 5 dakika içinde başlayacaktır. Katılmak için tıklayınız.`,
              icon: '/logo.png'
            });
            notifiedLessonsRef.current.add(lesson.id);
          }
        }
      });
    };

    checkLessonsForNotification();
    const interval = setInterval(checkLessonsForNotification, 60000);
    return () => clearInterval(interval);
  }, [lessons]);

  const handleAddGoal = (e) => {
    if (e) e.preventDefault();
    if (!newGoalInput.trim()) return;
    const updatedGoals = [...goals, { id: Date.now(), text: newGoalInput.trim(), completed: false }];
    setGoals(updatedGoals);
    localStorage.setItem(`fulle_goals_${user?.id}`, JSON.stringify(updatedGoals));
    setNewGoalInput('');
  };

  const handleToggleGoal = (goalId) => {
    const updatedGoals = goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    setGoals(updatedGoals);
    localStorage.setItem(`fulle_goals_${user?.id}`, JSON.stringify(updatedGoals));
  };

  const handleDeleteGoal = (goalId) => {
    const updatedGoals = goals.filter(g => g.id !== goalId);
    setGoals(updatedGoals);
    localStorage.setItem(`fulle_goals_${user?.id}`, JSON.stringify(updatedGoals));
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (compressedBase64) => {
      setProfileBanner(compressedBase64);
      localStorage.setItem(`fulle_profile_banner_${user?.id}`, compressedBase64);
    });
  };

  const handleSaveMotto = () => {
    localStorage.setItem(`fulle_profile_motto_${user?.id}`, profileMotto);
    setIsEditingMotto(false);
  };

  const handleToggleTopic = (topic, type) => {
    const updated = {
      ...topicProgress,
      [topic]: {
        ...topicProgress[topic],
        [type]: !topicProgress[topic]?.[type]
      }
    };
    setTopicProgress(updated);
    localStorage.setItem(`fulle_progress_${user?.id}`, JSON.stringify(updated));
  };

  const handleSaveDailyLog = (e) => {
    if (e) e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const savedLogs = localStorage.getItem(`fulle_logs_${user?.id}`) ? JSON.parse(localStorage.getItem(`fulle_logs_${user?.id}`)) : {};
    
    const newLog = {
      questions: parseInt(dailyLogInput.questions) || 0,
      minutes: parseInt(dailyLogInput.minutes) || 0,
      notes: dailyLogInput.notes || ''
    };
    
    savedLogs[today] = newLog;
    setDailyLog(newLog);
    localStorage.setItem(`fulle_logs_${user?.id}`, JSON.stringify(savedLogs));
    loadStudyHistory();
    alert('Günlük çalışma günlüğü başarıyla kaydedildi!');
  };

  const handleSaveTimerToLog = () => {
    const elapsedMinutes = Math.round(timerSeconds / 60);
    if (elapsedMinutes < 1 && timerSeconds > 0) {
      alert("Çalışma süreniz en az 1 dakika olmalıdır.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const savedLogs = localStorage.getItem(`fulle_logs_${user?.id}`) ? JSON.parse(localStorage.getItem(`fulle_logs_${user?.id}`)) : {};
    const existingLog = savedLogs[today] || { questions: 0, minutes: 0, notes: '' };
    
    const newLog = {
      ...existingLog,
      minutes: (existingLog.minutes || 0) + (elapsedMinutes || 1)
    };
    
    savedLogs[today] = newLog;
    setDailyLog(newLog);
    setDailyLogInput(prev => ({
      ...prev,
      minutes: newLog.minutes.toString()
    }));
    localStorage.setItem(`fulle_logs_${user?.id}`, JSON.stringify(savedLogs));
    setTimerSeconds(0);
    setTimerIsActive(false);
    loadStudyHistory();
    alert(`Çalışma süreniz (${elapsedMinutes || 1} dk) başarıyla günlüğe eklendi!`);
  };

  const handleCompleteHomework = async (homeworkId) => {
    try {
      await axios.post(`/api/student/homework/${homeworkId}/complete`);
      alert('Ödev tamamlandı olarak işaretlendi!');
      fetchHomeworks();
    } catch (err) {
      alert('Ödev tamamlanırken hata oluştu.');
    }
  };

  const loadSubjects = () => {
    const gradeSubjects = {
      "5": [
        { name: "Türkçe", count: 20 },
        { name: "Matematik", count: 20 },
        { name: "Fen Bilimleri", count: 20 },
        { name: "Sosyal Bilgiler", count: 20 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "6": [
        { name: "Türkçe", count: 20 },
        { name: "Matematik", count: 20 },
        { name: "Fen Bilimleri", count: 20 },
        { name: "Sosyal Bilgiler", count: 20 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "7": [
        { name: "Türkçe", count: 20 },
        { name: "Matematik", count: 20 },
        { name: "Fen Bilimleri", count: 20 },
        { name: "Sosyal Bilgiler", count: 20 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "8": [
        { name: "Türkçe", count: 20 },
        { name: "Matematik", count: 20 },
        { name: "Fen Bilimleri", count: 20 },
        { name: "T.C. İnkılap Tarihi ve Atatürkçülük", count: 10 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü ve Ahlak Bilgisi", count: 10 }
      ],
      "9": [
        { name: "Türk Dili ve Edebiyatı", count: 30 },
        { name: "Matematik", count: 30 },
        { name: "Fizik", count: 15 },
        { name: "Kimya", count: 15 },
        { name: "Biyoloji", count: 15 },
        { name: "Tarih", count: 15 },
        { name: "Coğrafya", count: 15 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "10": [
        { name: "Türk Dili ve Edebiyatı", count: 30 },
        { name: "Matematik", count: 30 },
        { name: "Fizik", count: 15 },
        { name: "Kimya", count: 15 },
        { name: "Biyoloji", count: 15 },
        { name: "Tarih", count: 15 },
        { name: "Coğrafya", count: 15 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "11": [
        { name: "Türk Dili ve Edebiyatı", count: 30 },
        { name: "Matematik", count: 30 },
        { name: "Fizik", count: 15 },
        { name: "Kimya", count: 15 },
        { name: "Biyoloji", count: 15 },
        { name: "Tarih", count: 15 },
        { name: "Coğrafya", count: 15 },
        { name: "Felsefe", count: 10 },
        { name: "İngilizce", count: 10 },
        { name: "Din Kültürü", count: 10 }
      ],
      "12": [
        { name: "Türkçe (TYT)", count: 40 },
        { name: "Matematik (TYT)", count: 40 },
        { name: "Fizik (TYT)", count: 7 },
        { name: "Kimya (TYT)", count: 7 },
        { name: "Biyoloji (TYT)", count: 6 },
        { name: "Tarih (TYT)", count: 5 },
        { name: "Coğrafya (TYT)", count: 5 },
        { name: "Felsefe (TYT)", count: 5 },
        { name: "Din Kültürü (TYT)", count: 5 }
      ],
      "Mezun": [
        { name: "Türkçe (TYT)", count: 40 },
        { name: "Matematik (TYT)", count: 40 },
        { name: "Fizik (TYT)", count: 7 },
        { name: "Kimya (TYT)", count: 7 },
        { name: "Biyoloji (TYT)", count: 6 },
        { name: "Tarih (TYT)", count: 5 },
        { name: "Coğrafya (TYT)", count: 5 },
        { name: "Felsefe (TYT)", count: 5 },
        { name: "Din Kültürü (TYT)", count: 5 }
      ],
      "KPSS": [
        { name: "Türkçe", count: 30 },
        { name: "Matematik ve Geometri", count: 30 },
        { name: "Tarih", count: 27 },
        { name: "Coğrafya", count: 18 },
        { name: "Vatandaşlık", count: 9 },
        { name: "Güncel Bilgiler", count: 6 }
      ]
    };
    
    const userGrade = user?.grade || "5";
    const currentSubjectsData = gradeSubjects[userGrade] || gradeSubjects["5"];
    
    const subjectNames = currentSubjectsData.map(s => s.name);
    setSubjects(subjectNames);
    
    const initialResults = {};
    currentSubjectsData.forEach(s => {
      initialResults[s.name] = { questionCount: s.count, correct: 0, wrong: 0, empty: s.count, net: 0 };
    });
    setNewTrial({ name: '', type: 'GENEL', results: initialResults });
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectName.trim()) return;
    const name = customSubjectName.trim();
    if (subjects.includes(name)) {
      alert('Bu ders zaten ekli!');
      return;
    }
    setSubjects(prev => [...prev, name]);
    
    setNewTrial(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [name]: { questionCount: 20, correct: 0, wrong: 0, empty: 20, net: 0 }
      }
    }));
    setCustomSubjectName('');
  };

  const handleRemoveSubject = (subjectName) => {
    setSubjects(prev => prev.filter(s => s !== subjectName));
    setNewTrial(prev => {
      const updatedResults = { ...prev.results };
      delete updatedResults[subjectName];
      return {
        ...prev,
        results: updatedResults
      };
    });
  };



  const handleRequestRecording = async (lessonId) => {
    try {
      await axios.put(`/api/student/lessons/${lessonId}/request-recording`);
      fetchLessons();
      alert('Ders kaydı başarıyla talep edildi. Öğretmeniniz ders kaydını eklediğinde buradan izleyebilirsiniz.');
    } catch (err) {
      console.error('Error requesting recording:', err);
      alert('Ders kaydı talep edilirken bir hata oluştu.');
    }
  };

  const handleSearchLessonById = async (e) => {
    e.preventDefault();
    setSearchError('');
    const idVal = parseInt(searchLessonId.trim());
    if (isNaN(idVal)) {
      setSearchError('Lütfen geçerli bir sayısal Ders ID girin.');
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await axios.get(`/api/student/lessons/${idVal}`);
      const lesson = response.data;
      if (lesson.recordingUrl) {
        navigate(`/ogrenci/kayit-izle?url=${encodeURIComponent(lesson.recordingUrl)}&title=${encodeURIComponent(lesson.title || 'Ders Kaydı')}`);
      } else {
        setSearchError('Bu derse ait bir ders kaydı bulunamadı.');
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 404) {
        setSearchError('Bu ID numarasına sahip ders bulunamadı.');
      } else if (err.response && err.response.status === 403) {
        setSearchError('Bu ders kaydını izleme yetkiniz bulunmamaktadır.');
      } else {
        setSearchError('Ders aranırken bir hata oluştu.');
      }
    } finally {
      setSearchLoading(false);
    }
  };



  const handleResultChange = (subject, field, value) => {
    const val = parseInt(value) || 0;
    const currentSubject = { 
      questionCount: 20, 
      correct: 0, 
      wrong: 0, 
      ...newTrial.results[subject], 
      [field]: val 
    };
    
    // Ensure values are not negative
    currentSubject.questionCount = Math.max(0, currentSubject.questionCount);
    currentSubject.correct = Math.max(0, currentSubject.correct);
    currentSubject.wrong = Math.max(0, currentSubject.wrong);

    // Calculate empty
    currentSubject.empty = Math.max(0, currentSubject.questionCount - (currentSubject.correct + currentSubject.wrong));
    
    // Calculate net: LGS (grade <= 8 veya 'LGS') is 3 wrong = 1 correct, YKS/KPSS/ALES/DGS/AGS/Mezun is 4 wrong = 1 correct
    const userGrade = user?.grade || "5";
    let coef = 0.25;
    if (!['KPSS', 'Mezun', 'ALES', 'DGS', 'AGS'].includes(userGrade)) {
      if (userGrade === 'LGS' || parseInt(userGrade) <= 8) {
        coef = 1/3;
      }
    }
    currentSubject.net = Math.max(0, currentSubject.correct - (currentSubject.wrong * coef));
    
    setNewTrial({
      ...newTrial,
      results: {
        ...newTrial.results,
        [subject]: currentSubject
      }
    });
  };

  const handleAddTrial = async (e) => {
    e.preventDefault();
    // Validate that correct + wrong does not exceed questionCount for any subject
    const invalidSubject = Object.entries(newTrial.results).find(([sub, res]) => (res.correct + res.wrong) > res.questionCount);
    if (invalidSubject) {
      alert(`Hata: ${invalidSubject[0]} dersinde Doğru + Yanlış sayısı Soru Sayısı'ndan fazla olamaz!`);
      return;
    }

    const totalNet = Object.values(newTrial.results).reduce((acc, curr) => acc + (curr.net || 0), 0);
    try {
      await axios.post('/api/student/trials', {
        ...newTrial,
        totalNet
      });
      alert('Deneme başarıyla kaydedildi!');
      fetchTrials();
      // Reset form
      loadSubjects();
    } catch (err) {
      alert('Hata oluştu.');
    }
  };

  const handleAiAsk = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() && !aiImage) return;
    
    const userMessage = { 
      role: 'user', 
      content: aiQuestion,
      image: aiImage 
    };
    
    setAiChat(prev => [...prev, userMessage]);
    const questionText = aiQuestion;
    const selectedImage = aiImage;
    
    setAiQuestion('');
    setAiImage('');
    setLoadingAi(true);
    
    try {
      const res = await axios.post('/api/ai/ask', { 
        question: questionText, 
        image: selectedImage 
      });
      setAiChat(prev => [...prev, { role: 'ai', content: res.data.answer }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Hata oluştu. Lütfen tekrar deneyin.';
      setAiChat(prev => [...prev, { role: 'ai', content: errMsg }]);
    } finally {
      setLoadingAi(false);
    }
  };

  const isLise = parseInt(user?.grade) >= 9;

  const getTodayLessons = () => {
    const today = new Date();
    return lessons.filter(lesson => {
      if (!lesson.date) return false;
      const d = new Date(lesson.date);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    });
  };

  const topicsByGrade = {
    "5": [
      "Doğal Sayılar",
      "Doğal Sayılarla İşlemler",
      "Kesirler",
      "Ondalık Gösterimler",
      "Yüzdeler",
      "Temel Geometrik Kavramlar",
      "Geometrik Şekiller",
      "Uzunluk ve Çevre Ölçme",
      "Alan Ölçme",
      "Veri Toplama ve Veri Analizi"
    ],
    "6": [
      "Doğal Sayılarla İşlemler",
      "Çarpanlar ve Katlar",
      "Kümeler",
      "Tam Sayılar",
      "Kesirlerle İşlemler",
      "Ondalık Gösterimler",
      "Oran",
      "Cebirsel İfadeler",
      "Veri Analizi",
      "Açılar",
      "Alan Ölçme",
      "Çember"
    ],
    "7": [
      "Tam Sayılarla İşlemler",
      "Rasyonel Sayılar ve Rasyonel Sayılarla İşlemler",
      "Cebirsel İfadeler ve Denklem Çözme",
      "Eşitlik ve Denklem",
      "Oran ve Orantı",
      "Yüzdeler",
      "Doğrular ve Açılar",
      "Çokgenler",
      "Çember ve Daire",
      "Veri Analizi",
      "Cisimlerin Farklı Yönlerden Görünümleri"
    ],
    "8": [
      "Çarpanlar ve Katlar",
      "Üslü İfadeler",
      "Kareköklü İfadeler",
      "Veri Analizi",
      "Basit Olayların Olma Olasılığı",
      "Cebirsel İfadeler ve Özdeşlikler",
      "Doğrusal Denklemler",
      "Eşitsizlikler",
      "Üçgenler",
      "Eşlik ve Benzerlik",
      "Dönüşüm Geometrisi",
      "Geometrik Cisimler"
    ],
    "9": [
      "Sayılar",
      "Nicelikler ve Değişimler",
      "Algoritma ve Bilişim",
      "Geometrik Şekiller",
      "Analitik İnceleme",
      "İstatistiksel Araştırma Süreci",
      "Veriden Olasılığa"
    ],
    "10": [
      "Sayılar",
      "Nicelikler ve Değişimler",
      "Sayma, Algoritma ve Bilişim",
      "Geometrik Şekiller",
      "Analitik İnceleme",
      "İstatistiksel Araştırma Süreci",
      "Veriden Olasılığa"
    ],
    "11": [
      "Trigonometri (Yönlü Açılar, Fonksiyonlar, Grafikler, Teoremler)",
      "Analitik Geometri (Doğrunun Analitik İncelenmesi)",
      "Fonksiyonlarda Uygulamalar (Artan/Azalan, Parabol, Dönüşümler)",
      "İkinci Dereceden Denklem ve Eşitsizlik Sistemleri",
      "Çember ve Daire (Açı, Teğet, Uzunluk ve Alan)",
      "Uzay Geometri (Katı Cisimler: Silindir, Koni, Küre)",
      "Koşullu Olasılık ve Deneysel/Teorik Olasılık"
    ],
    "12": [
      "— TYT Matematik —",
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Basit Eşitsizlikler",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Oran – Orantı",
      "Denklemler",
      "Sayı Problemleri",
      "Kesir Problemleri",
      "Yaş Problemleri",
      "Hareket Problemleri",
      "İşçi-Havuz Problemleri",
      "Karışım Problemleri",
      "Kâr-Zarar Problemleri",
      "Kümeler ve Kartezyen Çarpım",
      "Mantık",
      "Fonksiyonlar (TYT)",
      "Permütasyon",
      "Kombinasyon",
      "Binom",
      "Olasılık",
      "Veri – İstatistik",
      "Temel Geometri",
      "Doğruda Açılar",
      "Üçgenler",
      "Çokgenler",
      "Dörtgenler",
      "Çember ve Daire",
      "Analitik Geometri (TYT)",
      "Katı Cisimler",
      "— AYT Matematik —",
      "Fonksiyonlar (AYT)",
      "Polinomlar",
      "İkinci Dereceden Denklemler ve Parabol",
      "Karmaşık Sayılar",
      "Eşitsizlikler",
      "Trigonometri",
      "Logaritma",
      "Diziler",
      "Limit",
      "Süreklilik",
      "Türev",
      "Türevin Uygulamaları",
      "İntegral",
      "İntegralin Uygulamaları",
      "Analitik Geometri (AYT)",
      "Doğrunun Analitiği",
      "Çemberin Analitiği",
      "Dönüşüm Geometrisi",
      "Permütasyon (AYT)",
      "Kombinasyon (AYT)",
      "Binom (AYT)",
      "Olasılık (AYT)"
    ],
    "Mezun": [
      "— TYT Matematik —",
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Basit Eşitsizlikler",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Oran – Orantı",
      "Denklemler",
      "Sayı Problemleri",
      "Kesir Problemleri",
      "Yaş Problemleri",
      "Hareket Problemleri",
      "İşçi-Havuz Problemleri",
      "Karışım Problemleri",
      "Kâr-Zarar Problemleri",
      "Kümeler ve Kartezyen Çarpım",
      "Mantık",
      "Fonksiyonlar (TYT)",
      "Permütasyon",
      "Kombinasyon",
      "Binom",
      "Olasılık",
      "Veri – İstatistik",
      "Temel Geometri",
      "Doğruda Açılar",
      "Üçgenler",
      "Çokgenler",
      "Dörtgenler",
      "Çember ve Daire",
      "Analitik Geometri (TYT)",
      "Katı Cisimler",
      "— AYT Matematik —",
      "Fonksiyonlar (AYT)",
      "Polinomlar",
      "İkinci Dereceden Denklemler ve Parabol",
      "Karmaşık Sayılar",
      "Eşitsizlikler",
      "Trigonometri",
      "Logaritma",
      "Diziler",
      "Limit",
      "Süreklilik",
      "Türev",
      "Türevin Uygulamaları",
      "İntegral",
      "İntegralin Uygulamaları",
      "Analitik Geometri (AYT)",
      "Doğrunun Analitiği",
      "Çemberin Analitiği",
      "Dönüşüm Geometrisi",
      "Permütasyon (AYT)",
      "Kombinasyon (AYT)",
      "Binom (AYT)",
      "Olasılık (AYT)"
    ],
    "KPSS": [
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Basit Eşitsizlikler",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Oran – Orantı",
      "Denklemler",
      "Problemler",
      "Kümeler",
      "Fonksiyonlar",
      "İşlem",
      "Modüler Aritmetik",
      "Permütasyon – Kombinasyon – Olasılık",
      "Grafik ve Tablo Yorumlama",
      "Temel Geometri"
    ],
    "DGS": [
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Basit Eşitsizlikler",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Oran – Orantı",
      "Denklemler",
      "Problemler",
      "Kümeler",
      "Fonksiyonlar",
      "Permütasyon – Kombinasyon – Olasılık",
      "Sayısal Mantık",
      "Grafik ve Tablo Yorumlama",
      "Temel Geometri"
    ],
    "ALES": [
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Denklemler",
      "Problemler",
      "Sayısal Mantık",
      "Kümeler",
      "Fonksiyonlar",
      "Grafik ve Tablo Yorumlama",
      "Temel Geometri"
    ],
    "AGS": [
      "Temel Kavramlar",
      "Sayı Basamakları",
      "Bölme ve Bölünebilme",
      "EBOB – EKOK",
      "Rasyonel Sayılar",
      "Basit Eşitsizlikler",
      "Mutlak Değer",
      "Üslü Sayılar",
      "Köklü Sayılar",
      "Çarpanlara Ayırma",
      "Oran – Orantı",
      "Denklemler",
      "Problemler",
      "Kümeler",
      "Fonksiyonlar",
      "Permütasyon – Kombinasyon – Olasılık",
      "Grafik ve Tablo Yorumlama",
      "Temel Geometri"
    ]
  };


  const mathTopics = topicsByGrade[userGrade] || topicsByGrade["5"];


  // Calculate topic curriculum completion rate
  const totalTasks = mathTopics.length * 3;
  const completedTasks = Object.values(topicProgress).reduce((acc, curr) => {
    let count = 0;
    if (curr.work) count++;
    if (curr.solve) count++;
    if (curr.review) count++;
    return acc + count;
  }, 0);
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0 md:pt-4">
      {/* Mobile Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 md:hidden bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8" />
          <h1 className="text-lg font-black text-slate-900">Fullematematiği</h1>
        </div>
        <button onClick={logout} className="p-2 text-slate-400">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* PANEL */}
        {activeTab === 'panel' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* TODAY'S LESSON ALERT WIDGET */}
            {getTodayLessons().length > 0 && (
              <div className="p-6 bg-gradient-to-r from-primary to-indigo-950 rounded-3xl border border-primary/20 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/15">
                    <span className="material-symbols-outlined text-2xl text-amber-300 animate-pulse">videocam</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm tracking-wide">Bugün Canlı Dersin Var!</h4>
                    <p className="text-xs text-white/80 font-semibold mt-0.5">
                      {getTodayLessons()[0].title} • {new Date(getTodayLessons()[0].date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveMeeting(getTodayLessons()[0])}
                  className="bg-white hover:bg-slate-50 text-slate-900 px-6 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer hover:scale-102 transition-all self-start md:self-center uppercase tracking-wider"
                >
                  Derse Katıl
                </button>
              </div>
            )}

            {/* MOTIVATIONAL COVER BANNER (FOTO VE YAZI YERI) */}
            <div className="relative h-48 md:h-56 w-full rounded-3xl overflow-hidden shadow-md border border-slate-100 group">
              {/* Banner Image or Default Mathematical Gradient */}
              {profileBanner ? (
                <img src={profileBanner} alt="Kişisel Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-indigo-950 to-primary flex items-center justify-center relative">
                  {/* Subtle math decorations */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <span className="text-[120px] font-black text-white/5 absolute -bottom-10 -right-10 pointer-events-none select-none">∑</span>
                  <span className="text-[90px] font-black text-white/5 absolute -top-5 -left-5 pointer-events-none select-none">π</span>
                </div>
              )}
              
              {/* Banner Overlay for Text & Editing */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent flex flex-col justify-end p-6 md:p-8 text-white">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2 max-w-xl">
                    <span className="text-[9px] font-black text-primary bg-primary/20 border border-primary/20 px-2.5 py-1 rounded-md uppercase tracking-widest inline-block">
                      Bugünkü Motivasyonum & Hedefim
                    </span>
                    {isEditingMotto ? (
                      <div className="flex gap-2 items-center">
                        <input 
                          type="text"
                          className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-primary w-full md:w-80 font-medium"
                          value={profileMotto}
                          onChange={(e) => setProfileMotto(e.target.value)}
                        />
                        <button 
                          onClick={handleSaveMotto}
                          className="bg-primary text-white p-2 rounded-xl text-xs font-black shadow-md hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">save</span>
                        </button>
                      </div>
                    ) : (
                      <h2 
                        onClick={() => setIsEditingMotto(true)}
                        className="text-lg md:text-xl font-bold tracking-tight leading-snug cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 group/motto"
                      >
                        "{profileMotto}"
                        <span className="material-symbols-outlined text-xs text-slate-400 opacity-0 group-hover/motto:opacity-100 transition-opacity">edit</span>
                      </h2>
                    )}
                    <p className="text-[11px] text-slate-300 font-bold">
                      {user?.name} • {(['KPSS', 'Mezun', 'LGS', 'ALES', 'DGS', 'AGS'].includes(user?.grade)) ? `${user?.grade} Öğrencisi` : `${user?.grade}. Sınıf Öğrencisi`}
                    </p>
                  </div>

                  {/* Banner Photo Upload Button */}
                  <label className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer self-start md:self-end hover:scale-105 transition-all shadow-lg select-none">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Fotoğraf Yükle
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleBannerUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* ÖDEME BİLGİSİ BANNERI */}
            {user?.paymentAmount && (
              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                    user.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                    user.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">payments</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Aylık Ödeme Takibi</h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      Ücret: <span className="text-slate-700">{user.paymentAmount}</span> 
                      {user.paymentDay && <span> • Ödeme Günü: <span className="text-slate-700">{user.paymentDay}</span></span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                    user.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                    user.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                    {user.paymentStatus === 'PAID' ? 'Bu Ayki Ödeme Yapıldı' :
                     user.paymentStatus === 'PARTIAL' ? 'Kısmi Ödeme Yapıldı' :
                     'Ödeme Bekleniyor'}
                  </span>
                  {user.paymentNote && (
                    <span className="text-xs text-slate-400 font-medium italic">({user.paymentNote})</span>
                  )}
                </div>
              </div>
            )}

            {/* HEDEFLERİM (PERSONAL GOALS TRACKER) */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">flag</span>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Kişisel Hedeflerim</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Kendi hedeflerini ekle ve tamamla</p>
                  </div>
                </div>
                {goals.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tamamlanma Oranı:</span>
                    <span className="text-xs font-black text-primary">
                      {Math.round((goals.filter(g => g.completed).length / goals.length) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Goal Progress Bar */}
              {goals.length > 0 && (
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${(goals.filter(g => g.completed).length / goals.length) * 100}%` }}
                  ></div>
                </div>
              )}

              {/* Input for new goals */}
              <form onSubmit={handleAddGoal} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Örn: Bugün 80 Soru çözülecek, Matematikten 35 net yapmak vb."
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 font-bold outline-none focus:border-primary/40 text-xs"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  required
                />
                <button type="submit" className="bg-primary hover:bg-primary/95 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <span className="material-symbols-outlined text-sm">add</span> Hedef Ekle
                </button>
              </form>

              {/* Goals list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                {goals.length === 0 ? (
                  <div className="col-span-full text-center py-6 text-slate-400 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">tour</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Henüz hedef eklemedin. Hemen yukarıdan ekle!</p>
                  </div>
                ) : (
                  goals.map(g => (
                    <div key={g.id} className={`p-3.5 bg-white rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-all ${g.completed ? 'border-green-100 bg-green-50/20 opacity-80' : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input 
                          type="checkbox" 
                          checked={g.completed}
                          onChange={() => handleToggleGoal(g.id)}
                          className="h-4 w-4 rounded-md border-slate-300 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                        />
                        <span className={`text-xs font-bold truncate ${g.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {g.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* HATA DEFTERİ */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                    <span className="text-xl">📒</span>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Fulle Matematiği Hata Defteri</h4>
                    <p className="text-[10px] text-slate-400 font-bold">Hatalı soruların fotoğrafını ekle, takip et</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{hataDefteri.length} kayıt</span>
              </div>

              <div className="p-6 space-y-5">
                {/* Saydamlı Uyarı */}
                <div className="flex items-start gap-2.5 bg-amber-50/80 border border-amber-200/60 rounded-2xl px-4 py-3">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 flex-shrink-0">visibility</span>
                  <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                    Yüklediğin sorular <strong>öğretmenin tarafından görülebilir.</strong> Anlamadığın soruları buraya ekle, öğretmenin seni takip etsin! 🎯
                  </p>
                </div>

                {/* Upload Area */}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Not ekle (isteğe bağlı) — örn: 9. soruda hatalı düşündüm"
                    value={hataNote}
                    onChange={(e) => setHataNote(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-primary/40 focus:bg-white transition-all"
                  />
                  <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-2xl py-4 cursor-pointer transition-all ${
                    hataUploading
                      ? 'border-primary/30 bg-primary/5 text-primary cursor-wait'
                      : 'border-slate-200 hover:border-primary/40 hover:bg-primary/5 text-slate-400 hover:text-primary'
                  }`}>
                    {hataUploading ? (
                      <>
                        <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                        <span className="text-xs font-bold">Yükleniyor...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xl">add_a_photo</span>
                        <span className="text-xs font-bold">Fotoğraf Çek veya Galeriden Seç</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleHataUpload}
                      disabled={hataUploading}
                    />
                  </label>
                </div>

                {/* Photo Grid */}
                {hataDefteri.length === 0 ? (
                  <div className="text-center py-8 text-slate-300">
                    <span className="text-4xl">📒</span>
                    <p className="text-xs font-bold mt-2 text-slate-400">Henüz hata fotoğrafı eklenmemiş</p>
                    <p className="text-[10px] text-slate-300 mt-1">Hatalı soruların fotoğrafını ekleyerek takip edebilirsin</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {hataDefteri.map(entry => (
                      <div key={entry.id} className="relative group rounded-xl overflow-hidden border border-slate-100 shadow-sm aspect-square bg-slate-50">
                        <img
                          src={entry.imageData}
                          alt={entry.note || 'Hata fotoğrafı'}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setHataLightbox(entry)}
                        />
                        {/* Delete button */}
                        <button
                          onClick={() => handleHataDelete(entry.id)}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                        {/* Note badge */}
                        {entry.note && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <p className="text-[9px] text-white font-medium truncate">{entry.note}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lightbox */}
            {hataLightbox && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setHataLightbox(null)}
              >
                <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                  <img
                    src={hataLightbox.imageData}
                    alt={hataLightbox.note || 'Hata fotoğrafı'}
                    className="w-full rounded-2xl shadow-2xl"
                  />
                  {hataLightbox.note && (
                    <div className="mt-3 bg-white/10 rounded-xl px-4 py-2.5">
                      <p className="text-white text-sm font-medium">{hataLightbox.note}</p>
                    </div>
                  )}
                  <p className="text-white/40 text-xs mt-2 text-center">
                    {new Date(hataLightbox.createdAt).toLocaleString('tr-TR')}
                  </p>
                  <button
                    onClick={() => setHataLightbox(null)}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 font-black flex items-center justify-center shadow-lg"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-primary/10 rounded-3xl border border-primary/5 shadow-sm">
                <span className="material-symbols-outlined text-primary text-3xl mb-1.5">trending_up</span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ortalama Net</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {trials.length > 0 ? (trials.reduce((acc, curr) => acc + curr.totalNet, 0) / trials.length).toFixed(2) : "0.00"}
                </h3>
              </div>
              <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 shadow-sm">
                <span className="material-symbols-outlined text-blue-500 text-3xl mb-1.5">assignment_turned_in</span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Çözülen Deneme</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{trials.length}</h3>
              </div>
              <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-sm">
                <span className="material-symbols-outlined text-emerald-600 text-3xl mb-1.5">timer</span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bugünkü Çalışma</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{dailyLog.minutes || 0} dk</h3>
              </div>
              <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 shadow-sm">
                <span className="material-symbols-outlined text-amber-500 text-3xl mb-1.5">quiz</span>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bugün Çözülen Soru</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{dailyLog.questions || 0} Soru</h3>
              </div>
            </div>

            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Study Timer & Log Form */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Visual Study Timer Widget */}
                <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-xl border-l border-b border-primary/10">
                    Çalışma Odası
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Çalışma Süresi Sayacı</span>
                  <div className="text-4xl md:text-5xl font-black font-mono tracking-wider text-primary mb-6">
                    {formatTime(timerSeconds)}
                  </div>
                  <div className="flex gap-3">
                    {!timerIsActive ? (
                      <button 
                        onClick={() => setTimerIsActive(true)}
                        className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer uppercase tracking-wider"
                      >
                        <span className="material-symbols-outlined text-sm">play_arrow</span> Başlat
                      </button>
                    ) : (
                      <button 
                        onClick={() => setTimerIsActive(false)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer uppercase tracking-wider"
                      >
                        <span className="material-symbols-outlined text-sm">pause</span> Durdur
                      </button>
                    )}
                    <button 
                      onClick={() => { setTimerSeconds(0); setTimerIsActive(false); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-2xl text-xs font-bold border border-slate-700/50 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span> Sıfırla
                    </button>
                    {timerSeconds > 0 && (
                      <button 
                        onClick={handleSaveTimerToLog}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer uppercase tracking-wider"
                      >
                        <span className="material-symbols-outlined text-sm">done</span> Süreyi Kaydet
                      </button>
                    )}
                  </div>
                </div>

                {/* Today's Study Log Form */}
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-xl">edit_calendar</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Bugün Ne Çalıştım?</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Günlük çalışma verilerini güncelleyin</p>
                    </div>
                  </div>
                  <form onSubmit={handleSaveDailyLog} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Çözülen Soru</label>
                        <input 
                          type="number" 
                          placeholder="Örn: 40 Soru"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-primary/40 text-xs"
                          value={dailyLogInput.questions}
                          onChange={(e) => setDailyLogInput({...dailyLogInput, questions: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Çalışılan Süre (dk)</label>
                        <input 
                          type="number" 
                          placeholder="Örn: 90 dk"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold outline-none focus:border-primary/40 text-xs"
                          value={dailyLogInput.minutes}
                          onChange={(e) => setDailyLogInput({...dailyLogInput, minutes: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bugün Ne Çalıştım? (Notlar / Detaylar)</label>
                      <textarea 
                        placeholder="Örn: Rasyonel Sayılar soru çözümü ve YKS Matematik konu tekrarı yaptım."
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 font-medium outline-none focus:border-primary/40 text-xs resize-none"
                        value={dailyLogInput.notes}
                        onChange={(e) => setDailyLogInput({...dailyLogInput, notes: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="w-full py-3.5 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all text-xs cursor-pointer uppercase tracking-wider">
                      Çalışmayı Kaydet
                    </button>
                  </form>
                </div>

              </div>

              {/* Right Column: History Timeline */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Study History Card */}
                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-5 h-full flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-xl">history</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Çalışma Günlüğüm</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Geçmiş çalışma geçmişiniz</p>
                    </div>
                  </div>
                  
                  {/* Timeline list */}
                  <div className="space-y-4 overflow-y-auto max-h-[360px] flex-1 pr-1">
                    {studyHistory.length === 0 ? (
                      <div className="text-center py-10 flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">calendar_today</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Henüz çalışma kaydı eklenmedi.</p>
                      </div>
                    ) : (
                      studyHistory.map(log => (
                        <div key={log.date} className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2 relative group hover:bg-slate-100/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })}
                            </span>
                            <div className="flex gap-2 text-[10px] font-black text-slate-500">
                              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">timer</span> {log.minutes} dk</span>
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">quiz</span> {log.questions} S</span>
                            </div>
                          </div>
                          {log.notes ? (
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic pr-2">
                              "{log.notes}"
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Not eklenmemiş.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* DERS TAKİP */}
        {activeTab === 'tracking' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black text-slate-900">Ders Çalışma Takibi</h2>
              <p className="text-slate-500 font-medium">Çalışma planını, ödevlerini ve günlük ilerlemeni takip et</p>
            </div>

            {/* Sub-tabs Nav */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
              <button 
                onClick={() => setActiveSubTab('topics')}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'topics' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50'}`}
              >
                <span className="material-symbols-outlined text-sm">bookmark</span>
                Konu Takibi
              </button>
              <button 
                onClick={() => setActiveSubTab('homeworks')}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'homeworks' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50'}`}
              >
                <span className="material-symbols-outlined text-sm">assignment</span>
                Ödev Takibi
              </button>
              <button 
                onClick={() => setActiveSubTab('study-log')}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${activeSubTab === 'study-log' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50'}`}
              >
                <span className="material-symbols-outlined text-sm">edit_calendar</span>
                Çalışma Günlüğü
              </button>
            </div>

            {/* Sub-tab: TOPICS */}
            {activeSubTab === 'topics' && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Matematik Müfredat İlerlemen</span>
                    <span className="text-sm font-black text-primary">{Math.round(completionRate)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
                  </div>
                </div>

                {/* Topics list */}
                <div className="space-y-3">
                  {mathTopics.map(topic => {
                    const prog = topicProgress[topic] || { work: false, solve: false, review: false };
                    return (
                      <div key={topic} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <span className="font-bold text-slate-800 text-sm">{topic}</span>
                        <div className="flex gap-2 self-start md:self-center">
                          <button 
                            onClick={() => handleToggleTopic(topic, 'work')}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer uppercase tracking-wider ${prog.work ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                          >
                            📖 Çalıştım
                          </button>
                          <button 
                            onClick={() => handleToggleTopic(topic, 'solve')}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer uppercase tracking-wider ${prog.solve ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                          >
                            📝 Çözdüm
                          </button>
                          <button 
                            onClick={() => handleToggleTopic(topic, 'review')}
                            className={`px-3.5 py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer uppercase tracking-wider ${prog.review ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                          >
                            🔄 Tekrar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-tab: HOMEWORKS */}
            {activeSubTab === 'homeworks' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Yapılacak Ödevler</h3>
                  {homeworks.filter(h => h.status === 'PENDING').length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-slate-100">
                      <span className="material-symbols-outlined text-green-500 text-4xl mb-2 animate-bounce">celebration</span>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Bekleyen ödevin yok. Tebrikler! 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {homeworks.filter(h => h.status === 'PENDING').map(h => (
                        <div key={h.id} className="p-6 bg-white rounded-3xl border border-primary/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-black text-slate-900 text-base">{h.homework.title}</h4>
                            <p className="text-sm text-slate-500 mt-1">{h.homework.description}</p>
                            {h.homework.deadline && (
                              <span className="text-[10px] font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-md mt-3 inline-block uppercase tracking-wider">
                                Son Teslim: {new Date(h.homework.deadline).toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => handleCompleteHomework(h.homeworkId)}
                            className="bg-primary hover:bg-primary/95 text-white px-6 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-primary/20 transition-all cursor-pointer whitespace-nowrap self-end md:self-center"
                          >
                            Tamamlandı Olarak İşaretle
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Tamamlanan Ödevler</h3>
                  {homeworks.filter(h => h.status === 'COMPLETED').length === 0 ? (
                    <p className="text-xs font-black text-slate-400 py-6 uppercase tracking-widest text-center">Henüz tamamlanan ödev bulunmuyor.</p>
                  ) : (
                    <div className="space-y-4">
                      {homeworks.filter(h => h.status === 'COMPLETED').map(h => (
                        <div key={h.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 opacity-85">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-700 line-through text-base">{h.homework.title}</h4>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-md uppercase tracking-wider">✓ Tamamlandı</span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{h.homework.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab: STUDY LOG */}
            {activeSubTab === 'study-log' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                    Bugünkü Çalışmanı Kaydet
                  </h4>
                  <form onSubmit={handleSaveDailyLog} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bugün Çözülen Matematik Sorusu</label>
                      <input 
                        type="number" 
                        placeholder="Örn: 40 Soru"
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        value={dailyLogInput.questions}
                        onChange={(e) => setDailyLogInput({...dailyLogInput, questions: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bugün Matematik Çalışılan Süre (Dakika)</label>
                      <input 
                        type="number" 
                        placeholder="Örn: 90 Dakika"
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        value={dailyLogInput.minutes}
                        onChange={(e) => setDailyLogInput({...dailyLogInput, minutes: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bugün Ne Çalıştım? (Notlar / Detaylar)</label>
                      <textarea 
                        placeholder="Örn: Rasyonel Sayılar soru çözümü ve YKS Matematik konu tekrarı yaptım."
                        rows={3}
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                        value={dailyLogInput.notes}
                        onChange={(e) => setDailyLogInput({...dailyLogInput, notes: e.target.value})}
                      />
                    </div>
                    <button type="submit" className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-sm cursor-pointer uppercase tracking-wider">
                      Günlüğü Kaydet
                    </button>
                  </form>
                </div>

                {/* Gauge Info Card */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Bugünün Özet Karnesi</p>
                    <h4 className="text-lg font-black mb-6">Matematik Çalışma Günlüğün</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="material-symbols-outlined text-primary text-3xl mb-1">task</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Çözülen Soru</p>
                      <h5 className="text-2xl font-black">{dailyLog.questions} Soru</h5>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="material-symbols-outlined text-blue-400 text-3xl mb-1">schedule</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Çalışma Süresi</p>
                      <h5 className="text-2xl font-black">{dailyLog.minutes} Dk</h5>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest text-center">Düzenli çalışma hedeflerine yaklaştırır!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRIALS */}
        {activeTab === 'trials' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Deneme Girişi</h2>
              {isLise && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {['TYT', 'AYT', 'GENEL'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setNewTrial({...newTrial, type: t})}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${newTrial.type === t ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-primary/10 p-6 shadow-2xl shadow-primary/5">
              <form onSubmit={handleAddTrial} className="space-y-6">
                <input 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Deneme Sınavı Adı (Örn: Altın Karma #1)"
                  value={newTrial.name}
                  onChange={(e) => setNewTrial({...newTrial, name: e.target.value})}
                  required
                />
                
                {/* Ders Ekleme Alanı */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <input 
                    type="text" 
                    placeholder="Yeni Ders Adı (Örn: Din Kültürü)" 
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="flex-1 sm:flex-none bg-primary text-white px-5 py-3 rounded-2xl text-xs font-black hover:scale-105 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Ders Ekle
                    </button>
                    <button 
                      type="button"
                      onClick={loadSubjects}
                      className="flex-1 sm:flex-none bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Varsayılan Dersleri Yükle"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      Sıfırla
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-12 gap-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center">
                    <div className="col-span-3">Ders</div>
                    <div className="col-span-1 text-center">Sil</div>
                    <div className="col-span-2 text-center">Soru S.</div>
                    <div className="col-span-2 text-center">Doğru</div>
                    <div className="col-span-2 text-center">Yanlış</div>
                    <div className="col-span-2 text-right">Net</div>
                  </div>
                  {subjects.map(subject => (
                    <div key={subject} className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-2 items-stretch md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between md:col-span-4">
                        <div className="font-bold text-slate-700 text-sm truncate" title={subject}>{subject}</div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveSubject(subject)}
                          className="text-red-400 hover:text-red-650 transition-all flex items-center justify-center cursor-pointer p-1"
                          title={`${subject} dersini çıkar`}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 md:contents">
                        <div>
                          <label className="block md:hidden text-[9px] font-bold text-slate-400 uppercase mb-1">Soru</label>
                          <input 
                            type="number"
                            placeholder="Soru"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={newTrial.results[subject]?.questionCount ?? ''}
                            onChange={(e) => handleResultChange(subject, 'questionCount', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block md:hidden text-[9px] font-bold text-slate-400 uppercase mb-1">Doğru</label>
                          <input 
                            type="number"
                            placeholder="D"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={newTrial.results[subject]?.correct ?? ''}
                            onChange={(e) => handleResultChange(subject, 'correct', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block md:hidden text-[9px] font-bold text-slate-400 uppercase mb-1">Yanlış</label>
                          <input 
                            type="number"
                            placeholder="Y"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={newTrial.results[subject]?.wrong ?? ''}
                            onChange={(e) => handleResultChange(subject, 'wrong', e.target.value)}
                          />
                        </div>
                        <div className="text-right flex flex-col justify-end items-end md:block">
                          <label className="block md:hidden text-[9px] font-bold text-slate-400 uppercase mb-1">Net</label>
                          <div className="font-black text-primary text-sm h-9 flex items-center justify-end">
                            {newTrial.results[subject]?.net?.toFixed(2) || "0.00"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-primary p-6 rounded-3xl text-white shadow-xl shadow-primary/30">
                  <div>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Toplam Net</p>
                    <h3 className="text-3xl font-black">
                      {Object.values(newTrial.results).reduce((acc, curr) => acc + (curr.net || 0), 0).toFixed(2)}
                    </h3>
                  </div>
                  <button type="submit" className="bg-white text-primary px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all cursor-pointer">
                    Kaydet
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900">Geçmiş Denemeler</h3>
              {trials.length === 0 ? (
                <p className="text-slate-500 text-sm font-medium">Henüz kayıtlı deneme sınavınız bulunmamaktadır.</p>
              ) : (
                trials.map(t => (
                  <div key={t.id} className="p-6 bg-slate-50 hover:bg-slate-100/50 rounded-3xl border border-slate-100 transition-all">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedTrialId(expandedTrialId === t.id ? null : t.id)}
                    >
                      <div>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">{t.type}</span>
                        <h4 className="font-bold text-slate-900">{t.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-primary">{t.totalNet?.toFixed(2) || '0.00'} Net</span>
                        <span className="material-symbols-outlined text-slate-400">{expandedTrialId === t.id ? 'expand_less' : 'expand_more'}</span>
                      </div>
                    </div>

                    {expandedTrialId === t.id && (
                      <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-300">
                        <div className="hidden md:grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 pb-2">
                          <div className="col-span-4">Ders</div>
                          <div className="col-span-2 text-center">Soru</div>
                          <div className="col-span-2 text-center">Doğru</div>
                          <div className="col-span-2 text-center">Yanlış</div>
                          <div className="col-span-2 text-right">Net</div>
                        </div>
                        {Object.entries(t.results || {}).map(([subject, res]) => (
                          <div key={subject} className="flex flex-col md:grid md:grid-cols-12 gap-2 py-3 md:py-2 px-3 md:px-2 hover:bg-slate-200/50 rounded-xl transition-all items-stretch md:items-center border-b border-slate-100 md:border-none">
                            <div className="font-bold text-slate-700 text-xs md:col-span-4 truncate" title={subject}>{subject}</div>
                            <div className="grid grid-cols-4 gap-1 text-center md:contents">
                              <div className="md:col-span-2">
                                <span className="block md:hidden text-[8px] font-bold text-slate-400 uppercase">Soru</span>
                                <span className="font-bold text-slate-650 text-xs">{res.questionCount !== undefined ? res.questionCount : '-'}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="block md:hidden text-[8px] font-bold text-slate-400 uppercase">Doğru</span>
                                <span className="font-bold text-green-600 text-xs">{res.correct}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="block md:hidden text-[8px] font-bold text-slate-400 uppercase">Yanlış</span>
                                <span className="font-bold text-red-500 text-xs">{res.wrong}</span>
                              </div>
                              <div className="md:col-span-2 text-right">
                                <span className="block md:hidden text-[8px] font-bold text-slate-400 uppercase">Net</span>
                                <span className="font-black text-primary text-xs">
                                  {(() => {
                                    const userGrade = user?.grade || "5";
                                    let coef = 0.25;
                                    if (!['KPSS', 'Mezun', 'ALES', 'DGS', 'AGS'].includes(userGrade)) {
                                      if (userGrade === 'LGS' || parseInt(userGrade) <= 8) coef = 1/3;
                                    }
                                    const calculatedNet = res.net !== undefined ? res.net : (res.correct - (res.wrong * coef));
                                    return Math.max(0, calculatedNet).toFixed(2);
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AI, LESSONS sekmeleri benzer şekilde... (içerik korunur) */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100dvh-17rem)] md:h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {aiChat.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                    <span className="material-symbols-outlined text-5xl">smart_toy</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Matematik Asistanın!</h3>
                  <p className="text-sm text-slate-500">Fotoğraf yükleyerek veya yazarak matematik sorularını sorabilirsin.</p>
                </div>
              )}
              {aiChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none shadow-md shadow-primary/10' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                    {msg.image && (
                      <img src={msg.image} alt="Gönderilen Görsel" className="max-w-full max-h-[220px] rounded-lg mb-2 object-contain block border border-white/10" />
                    )}
                    {msg.content && (
                      <p className="whitespace-pre-wrap text-xs md:text-sm font-medium leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Image Preview */}
            {aiImage && (
              <div className="relative inline-block mb-3 self-start p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <img src={aiImage} alt="Seçilen Soru" className="h-16 w-16 object-contain rounded-xl" />
                <button 
                  type="button" 
                  onClick={() => setAiImage('')}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleAiAsk} className="mt-2 flex items-center gap-3">
              {/* Photo Upload Button */}
              <label className="flex h-[52px] w-[52px] shrink-0 bg-primary/10 hover:bg-primary/20 text-primary rounded-full items-center justify-center cursor-pointer transition-all border border-primary/10 shadow-sm hover:scale-105 active:scale-95 select-none">
                <span className="material-symbols-outlined text-2xl notranslate" translate="no">photo_camera</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    compressImage(file, (compressedBase64) => {
                      setAiImage(compressedBase64);
                    });
                  }}
                />
              </label>

              {/* Text Input and Send Button Container */}
              <div className="relative flex-1">
                <input 
                  value={aiQuestion} 
                  onChange={(e) => setAiQuestion(e.target.value)} 
                  placeholder="Sorunu yaz veya fotoğraf yükle..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-6 pr-14 outline-none text-xs font-bold"
                />
                
                {/* Send Button */}
                <button type="submit" className="absolute right-2 top-2 h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"><span className="material-symbols-outlined">send</span></button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900">Derslerin</h2>

            {/* Ders ID ile Kayıt İzle Card */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-2xl">movie</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Ders ID'si ile Kayıt İzle</h3>
                  <p className="text-xs text-slate-400">Veritabanımızda kayıtlı olan derslerin ID'sini girerek doğrudan izleyin.</p>
                </div>
              </div>
              <form onSubmit={handleSearchLessonById} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ders ID girin (Örn: 42)"
                  value={searchLessonId}
                  onChange={(e) => setSearchLessonId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-primary text-slate-100 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {searchLoading ? 'Aranıyor...' : 'Kaydı Oynat'}
                </button>
              </form>
              {searchError && (
                <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {searchError}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {lessons.map(lesson => {
                const isPast = new Date(lesson.date).getTime() + 7200000 < Date.now();
                return (
                  <div key={lesson.id} className="p-6 bg-white rounded-3xl border border-primary/10 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900">{lesson.title}</h4>
                        <span className="bg-slate-150 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-slate-200 shadow-sm">
                          ID: {lesson.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{new Date(lesson.date).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* Katıl button is always visible so students can join the classroom */}
                      <button 
                        onClick={() => setActiveMeeting(lesson)} 
                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer shadow-sm hover:bg-primary/95 transition-all"
                      >
                        Katıl
                      </button>

                      {lesson.recordingUrl ? (
                        <button 
                          onClick={() => navigate(`/ogrenci/kayit-izle?url=${encodeURIComponent(lesson.recordingUrl)}&title=${encodeURIComponent(lesson.title || 'Ders Kaydı')}`)} 
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">play_circle</span>
                          Kaydı İzle
                        </button>
                      ) : (
                        isPast && (
                          <span className="bg-slate-100 text-slate-400 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                            Kayıt Yok
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary/10 px-2 py-2 sm:py-3 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('panel')} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all ${activeTab === 'panel' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === 'panel' ? 'scale-110' : ''}`}>dashboard</span>
          <span className="text-[9px] sm:text-[10px] font-bold truncate">Panel</span>
        </button>
        <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all ${activeTab === 'tracking' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === 'tracking' ? 'scale-110' : ''}`}>task_alt</span>
          <span className="text-[9px] sm:text-[10px] font-bold truncate">Takip</span>
        </button>
        <button onClick={() => setActiveTab('lessons')} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all ${activeTab === 'lessons' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === 'lessons' ? 'scale-110' : ''}`}>school</span>
          <span className="text-[9px] sm:text-[10px] font-bold truncate">Dersler</span>
        </button>
        <button onClick={() => setActiveTab('trials')} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all ${activeTab === 'trials' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === 'trials' ? 'scale-110' : ''}`}>monitoring</span>
          <span className="text-[9px] sm:text-[10px] font-bold truncate">Deneme</span>
        </button>
        <button onClick={() => setActiveTab('ai')} className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 px-1 py-1 rounded-xl transition-all ${activeTab === 'ai' ? 'text-primary' : 'text-slate-400'}`}>
          <span className={`material-symbols-outlined text-2xl transition-transform ${activeTab === 'ai' ? 'scale-110' : ''}`}>smart_toy</span>
          <span className="text-[9px] sm:text-[10px] font-bold truncate">Fulle AI</span>
        </button>
      </nav>
      {/* Safari Install Popup */}
      {showInstallPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="relative">
              <button
                onClick={() => setShowInstallPopup(false)}
                className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-slate-600 rounded-full p-1.5 shadow transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
              <img
                src="/safari-install.png"
                alt="Uygulamayı Ana Ekrana Ekle"
                className="w-full object-contain max-h-80"
              />
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                Panelinize daha hızlı erişmek için ekrandaki talimatları uygulayınız.
              </p>
              <button
                onClick={() => setShowInstallPopup(false)}
                className="w-full py-3 bg-primary text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Class Overlay / Modal */}
      {activeMeeting && (
        activeMeeting.zoomJoinUrl && activeMeeting.zoomJoinUrl.includes('zoom.us') ? (
          (() => {
            const { meetingNumber, password } = parseZoomUrl(activeMeeting.zoomJoinUrl);
            return (
              <ZoomMeeting
                meetingNumber={meetingNumber}
                meetingPassword={password}
                role="STUDENT"
                userName={user?.name || 'Öğrenci'}
                userEmail={user?.email || 'info@fullematematigi.com.tr'}
                onClose={() => setActiveMeeting(null)}
              />
            );
          })()
        ) : (
          <LiveMeeting
            lessonId={activeMeeting.id}
            role="STUDENT"
            userName={user?.name || 'Öğrenci'}
            userId={user?.id || user?.studentCode || user?.email}
            onClose={() => setActiveMeeting(null)}
          />
        )
      )}

    </div>
  );
};

export default StudentDashboard;
