import React, { useState, useEffect } from 'react';
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

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('panel'); 
  const [lessons, setLessons] = useState([]);
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
  const { user, logout } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('topics'); 
  const [topicProgress, setTopicProgress] = useState({});
  const [dailyLog, setDailyLog] = useState({ questions: 0, minutes: 0 });
  const [dailyLogInput, setDailyLogInput] = useState({ questions: '', minutes: '' });

  useEffect(() => {
    fetchLessons();
    fetchHomeworks();
    fetchTrials();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSubjects();
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
          minutes: logs[today].minutes.toString()
        });
      }
    }
  }, [user]);

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
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const savedLogs = localStorage.getItem(`fulle_logs_${user?.id}`) ? JSON.parse(localStorage.getItem(`fulle_logs_${user?.id}`)) : {};
    
    const newLog = {
      questions: parseInt(dailyLogInput.questions) || 0,
      minutes: parseInt(dailyLogInput.minutes) || 0
    };
    
    savedLogs[today] = newLog;
    setDailyLog(newLog);
    localStorage.setItem(`fulle_logs_${user?.id}`, JSON.stringify(savedLogs));
    alert('Günlük çalışma günlüğü başarıyla kaydedildi!');
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
    // Grade based subjects from ders.md logic
    const gradeSubjects = {
      "5": ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce"],
      "6": ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce"],
      "7": ["Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce"],
      "8": ["Türkçe", "Matematik", "Fen Bilimleri", "T.C. İnkılap Tarihi ve Atatürkçülük", "İngilizce"],
      "9": ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "İngilizce"],
      "10": ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "İngilizce"],
      "11": ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "İngilizce"],
      "12": ["Türk Dili ve Edebiyatı", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "İngilizce"]
    };
    
    const userGrade = user?.grade || "5";
    const currentSubjects = gradeSubjects[userGrade] || gradeSubjects["5"];
    setSubjects(currentSubjects);
    
    // Initialize results state
    const initialResults = {};
    currentSubjects.forEach(s => {
      initialResults[s] = { questionCount: 20, correct: 0, wrong: 0, empty: 20, net: 0 };
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
    
    const userGradeNum = parseInt(user?.grade) || 5;
    const coef = userGradeNum <= 8 ? (1/3) : 0.25;
    
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

  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/student/lessons');
      setLessons(res.data);
    } catch (err) {
      console.error(err);
    }
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
    
    // Calculate net: LGS (grade <= 8) is 3 wrong = 1 correct, YKS (grade >= 9) is 4 wrong = 1 correct
    const userGradeNum = parseInt(user?.grade) || 5;
    const coef = userGradeNum <= 8 ? (1/3) : 0.25;
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
    if (!aiQuestion.trim()) return;
    const userMessage = { role: 'user', content: aiQuestion };
    setAiChat(prev => [...prev, userMessage]);
    setAiQuestion('');
    setLoadingAi(true);
    try {
      const res = await axios.post('/api/ai/ask', { question: aiQuestion });
      setAiChat(prev => [...prev, { role: 'ai', content: res.data.answer }]);
    } catch (err) {
      setAiChat(prev => [...prev, { role: 'ai', content: 'Hata oluştu.' }]);
    } finally {
      setLoadingAi(false);
    }
  };

  const isLise = parseInt(user?.grade) >= 9;

  const mathTopics = isLise ? [
    'Temel Kavramlar ve Sayılar',
    'Bölme ve Bölünebilme',
    'Rasyonel Sayılar',
    'Birinci Dereceden Denklemler',
    'Üslü ve Köklü Sayılar',
    'Çarpanlara Ayırma',
    'Oran-Orantı',
    'Problemler',
    'Kümeler ve Fonksiyonlar',
    'Polinomlar ve İkinci Dereceden Denklemler',
    'Trigonometri',
    'Logaritma ve Diziler',
    'Limit, Türev, İntegral',
    'Geometri (Üçgenler ve Çokgenler)'
  ] : [
    'Sayılar ve İşlemler',
    'Üslü ve Köklü İfadeler',
    'Cebirsel İfadeler',
    'Denklemler ve Eşitsizlikler',
    'Geometri ve Ölçme',
    'Veri İşleme',
    'Olasılık'
  ];

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
          <h1 className="text-lg font-black text-slate-900">Fullematematik</h1>
        </div>
        <button onClick={logout} className="p-2 text-slate-400">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* PANEL */}
        {activeTab === 'panel' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black text-slate-900 capitalize">Selam, {user?.name.split(' ')[0]}!</h2>
              <p className="text-slate-500 font-medium">{user?.grade}. Sınıf öğrencisi</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-primary/10 rounded-3xl border border-primary/5">
                <span className="material-symbols-outlined text-primary text-4xl mb-2">trending_up</span>
                <p className="text-sm font-bold text-slate-500">Ortalama Net</p>
                <h3 className="text-xl font-black text-slate-900">
                  {trials.length > 0 ? (trials.reduce((acc, curr) => acc + curr.totalNet, 0) / trials.length).toFixed(2) : "0.00"}
                </h3>
              </div>
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <span className="material-symbols-outlined text-blue-500 text-4xl mb-2">assignment_turned_in</span>
                <p className="text-sm font-bold text-slate-500">Çözülen Deneme</p>
                <h3 className="text-xl font-black text-slate-900">{trials.length}</h3>
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
                    <button type="submit" className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all text-sm cursor-pointer">
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
                <div className="flex gap-2 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <input 
                    type="text" 
                    placeholder="Yeni Ders Adı (Örn: Din Kültürü)" 
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 outline-none"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="bg-primary text-white px-5 py-3 rounded-2xl text-xs font-black hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Ders Ekle
                  </button>
                  <button 
                    type="button"
                    onClick={loadSubjects}
                    className="bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                    title="Varsayılan Dersleri Yükle"
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    Sıfırla
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center">
                    <div className="col-span-3">Ders</div>
                    <div className="col-span-1 text-center">Sil</div>
                    <div className="col-span-2 text-center">Soru S.</div>
                    <div className="col-span-2 text-center">Doğru</div>
                    <div className="col-span-2 text-center">Yanlış</div>
                    <div className="col-span-2 text-right">Net</div>
                  </div>
                  {subjects.map(subject => (
                    <div key={subject} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="col-span-3 font-bold text-slate-700 text-sm truncate" title={subject}>{subject}</div>
                      <div className="col-span-1 text-center">
                        <button 
                          type="button"
                          onClick={() => handleRemoveSubject(subject)}
                          className="text-red-400 hover:text-red-600 transition-all flex items-center justify-center mx-auto cursor-pointer"
                          title={`${subject} dersini çıkar`}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number"
                          placeholder="Soru"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          value={newTrial.results[subject]?.questionCount ?? ''}
                          onChange={(e) => handleResultChange(subject, 'questionCount', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number"
                          placeholder="D"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          value={newTrial.results[subject]?.correct ?? ''}
                          onChange={(e) => handleResultChange(subject, 'correct', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="number"
                          placeholder="Y"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                          value={newTrial.results[subject]?.wrong ?? ''}
                          onChange={(e) => handleResultChange(subject, 'wrong', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 text-right font-black text-primary text-sm">
                        {newTrial.results[subject]?.net?.toFixed(2) || "0.00"}
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
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-2xl font-black text-slate-900">{t.totalNet.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Toplam Net</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-400">
                          {expandedTrialId === t.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </div>

                    {expandedTrialId === t.id && (
                      <div className="mt-6 pt-6 border-t border-slate-200/60 space-y-2 animate-in fade-in duration-300">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 pb-2">
                          <div className="col-span-4">Ders</div>
                          <div className="col-span-2 text-center">Soru</div>
                          <div className="col-span-2 text-center">Doğru</div>
                          <div className="col-span-2 text-center">Yanlış</div>
                          <div className="col-span-2 text-right">Net</div>
                        </div>
                        {Object.entries(t.results || {}).map(([subject, res]) => (
                          <div key={subject} className="grid grid-cols-12 gap-2 py-2 px-2 hover:bg-slate-200/50 rounded-xl transition-all items-center">
                            <div className="col-span-4 font-bold text-slate-700 text-xs truncate" title={subject}>{subject}</div>
                            <div className="col-span-2 text-center font-bold text-slate-600 text-xs">{res.questionCount !== undefined ? res.questionCount : '-'}</div>
                            <div className="col-span-2 text-center font-bold text-green-600 text-xs">{res.correct}</div>
                            <div className="col-span-2 text-center font-bold text-red-500 text-xs">{res.wrong}</div>
                            <div className="col-span-2 text-right font-black text-primary text-xs">{res.net !== undefined ? res.net.toFixed(2) : (res.correct - (res.wrong * 0.25)).toFixed(2)}</div>
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
          <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {aiChat.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                    <span className="material-symbols-outlined text-5xl">smart_toy</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Matematik Asistanın!</h3>
                  <p className="text-sm text-slate-500">Sınıf seviyene uygun tüm soruları sorabilirsin.</p>
                </div>
              )}
              {aiChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAiAsk} className="relative mt-4">
              <input value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} placeholder="Sorunu sor..." className="w-full bg-slate-50 border border-slate-200 rounded-full py-4 pl-6 pr-16 outline-none"/>
              <button type="submit" className="absolute right-2 top-2 h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined">send</span></button>
            </form>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900">Derslerin</h2>
            <div className="space-y-4">
              {lessons.map(lesson => {
                const isPast = new Date(lesson.date).getTime() + 7200000 < Date.now();
                return (
                  <div key={lesson.id} className="p-6 bg-white rounded-3xl border border-primary/10 flex items-center justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-slate-900">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{new Date(lesson.date).toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isPast ? (
                        <>
                          {lesson.recordingRequested ? (
                            lesson.recordingUrl ? (
                              <a 
                                href={lesson.recordingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-base">play_circle</span>
                                Kaydı İzle
                              </a>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                Kayıt Talep Edildi
                              </span>
                            )
                          ) : (
                            <button 
                              onClick={() => handleRequestRecording(lesson.id)} 
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border border-slate-200 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-base">video_library</span>
                              Kayıt Talep Et
                            </button>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={() => setActiveMeeting(lesson)} 
                          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer shadow-sm hover:bg-primary/95 transition-all"
                        >
                          Katıl
                        </button>
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary/10 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => setActiveTab('panel')} className={`flex flex-col items-center gap-1 ${activeTab === 'panel' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Panel</span>
        </button>
        <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center gap-1 ${activeTab === 'tracking' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">task_alt</span>
          <span className="text-[10px] font-bold">Ders Takip</span>
        </button>
        <button onClick={() => setActiveTab('lessons')} className={`flex flex-col items-center gap-1 ${activeTab === 'lessons' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">school</span>
          <span className="text-[10px] font-bold">Dersler</span>
        </button>
        <button onClick={() => setActiveTab('trials')} className={`flex flex-col items-center gap-1 ${activeTab === 'trials' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">monitoring</span>
          <span className="text-[10px] font-bold">Deneme</span>
        </button>
        <button onClick={() => setActiveTab('ai')} className={`flex flex-col items-center gap-1 ${activeTab === 'ai' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">smart_toy</span>
          <span className="text-[10px] font-bold">Zeka</span>
        </button>
      </nav>
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
                userEmail={user?.email || 'info@fullematematik.com'}
                onClose={() => setActiveMeeting(null)}
              />
            );
          })()
        ) : (
          <LiveMeeting
            lessonId={activeMeeting.id}
            role="STUDENT"
            userName={user?.name || 'Öğrenci'}
            onClose={() => setActiveMeeting(null)}
          />
        )
      )}
    </div>
  );
};

export default StudentDashboard;
