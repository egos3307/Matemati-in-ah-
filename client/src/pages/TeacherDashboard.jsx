import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import LiveMeeting from '../components/LiveMeeting';

const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ email: '', password: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '' });
  const [newLesson, setNewLesson] = useState({ title: '', description: '', date: '' });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentTrials, setStudentTrials] = useState([]);
  const [expandedTrialId, setExpandedTrialId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { user } = useAuth();

  // Calendar states
  const [lessons, setLessons] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [lessonTime, setLessonTime] = useState('12:00');
  const [newLessonStudentId, setNewLessonStudentId] = useState('');
  const [newLessonZoomUrl, setNewLessonZoomUrl] = useState('');
  const [activeMeeting, setActiveMeeting] = useState(null);

  const trMonths = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const trDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getWhatsAppLink = (phone) => {
    if (!phone) return '#';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `https://wa.me/90${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('0')) return `https://wa.me/90${cleaned.substring(1)}`;
    return `https://wa.me/${cleaned}`;
  };

  useEffect(() => {
    fetchStudents();
    fetchLessons();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/teacher/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchLessons = async () => {
    try {
      const res = await axios.get('/api/teacher/lessons');
      setLessons(res.data);
    } catch (err) {
      console.error('Error fetching lessons:', err);
    }
  };

  const fetchStudentTrials = async (student) => {
    try {
      const res = await axios.get(`/api/teacher/student/${student.id}/trials`);
      setStudentTrials(res.data);
      setSelectedStudent(student);
      setExpandedTrialId(null);
      setActiveTab('student-detail');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/teacher/add-student', newStudent);
      setNewStudent({ email: '', password: '', name: '', grade: '', parentName: '', parentTel: '', studentTel: '' });
      fetchStudents();
      setShowAddModal(false);
      alert(`Öğrenci Kaydedildi!\nKod: ${res.data.studentCode}`);
    } catch (err) {
      console.error('Error adding student:', err);
      const message = err.response?.data?.error || err.response?.data?.message || 'Öğrenci eklenirken bir hata oluştu.';
      alert(`Hata: ${message}`);
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!newLessonStudentId) {
      alert('Lütfen bu ders için bir öğrenci seçin.');
      return;
    }
    try {
      const dateObj = new Date(selectedDate);
      const [hours, minutes] = lessonTime.split(':');
      dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await axios.post('/api/teacher/create-lesson', {
        title: newLesson.title,
        description: newLesson.description,
        date: dateObj.toISOString(),
        studentId: parseInt(newLessonStudentId),
        zoomJoinUrl: newLessonZoomUrl
      });
      setNewLesson({ title: '', description: '', date: '' });
      setLessonTime('12:00');
      setNewLessonStudentId('');
      setNewLessonZoomUrl('');
      fetchLessons();
      alert('Ders başarıyla oluşturuldu!');
    } catch (err) {
      alert('Ders oluşturulurken hata oluştu.');
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; 
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const daysArray = [];
    for (let i = 0; i < startOffset; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(new Date(year, month, i));
    }
    return daysArray;
  };

  const getLessonsForDate = (date) => {
    if (!date) return [];
    return lessons.filter(lesson => {
      const d = new Date(lesson.date);
      return d.getDate() === date.getDate() &&
             d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900">
      {/* Side Navigation */}
      <aside className="w-72 border-r border-primary/10 bg-slate-50/50 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <img src="/logo.png" alt="Fulle Matematik Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-black leading-none">Fulle Matematik</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Öğretmen Paneli</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => { setActiveTab('students'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'students' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">group</span>
            <span>Öğrencilerim</span>
          </button>
          <button 
            onClick={() => { setActiveTab('new-lesson'); setSelectedStudent(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'new-lesson' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-slate-500'}`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Derslerim</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-24 border-b border-primary/5 flex items-center justify-between px-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'student-detail' ? `Öğrenci Detayı` : `Hoş Geldiniz, ${user?.name.split(' ')[0]}`}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Fulle Matematik Yönetim Sistemi</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Yeni Öğrenci
            </button>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary text-white rounded-2xl">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-bold">Toplam Öğrenci</p>
                  <h3 className="text-4xl font-black text-slate-900">{students.length}</h3>
                </div>
                {/* Diğer kartlar... */}
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-slate-900">Son Kayıtlı Öğrenciler</h3>
                  <button onClick={() => setActiveTab('students')} className="text-primary text-xs font-black uppercase tracking-widest">Tümünü Gör</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Öğrenci</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giriş Kodu</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sınıf</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Veli</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.slice(0, 5).map(student => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => fetchStudentTrials(student)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">{student.name.charAt(0)}</div>
                              <div className="font-bold text-slate-900">{student.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><code className="bg-slate-100 px-2 py-1 rounded text-primary font-black text-xs">{student.studentCode}</code></td>
                          <td className="px-6 py-4 font-bold text-slate-500">{student.grade}. Sınıf</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-medium">{student.parentName || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(student => (
                    <div key={student.id} onClick={() => fetchStudentTrials(student)} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black">{student.name.charAt(0)}</div>
                        <code className="text-[10px] font-black bg-slate-50 px-2 py-1 rounded text-slate-400">{student.studentCode}</code>
                      </div>
                      <h4 className="font-black text-slate-900 text-lg group-hover:text-primary transition-colors">{student.name}</h4>
                      <p className="text-sm text-slate-400 font-bold mb-4">{student.grade}. Sınıf</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
                        <span className="material-symbols-outlined text-sm">call</span>
                        {student.parentTel || 'Telefon yok'}
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {activeTab === 'student-detail' && selectedStudent && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('students')} className="h-12 w-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 transition-all">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">{selectedStudent.name}</h3>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs font-bold text-primary uppercase tracking-widest">{selectedStudent.grade}. Sınıf</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kod: {selectedStudent.studentCode}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                      <h4 className="font-black text-slate-900 mb-8">Deneme Performansı</h4>
                      <div className="h-64 flex items-end justify-between gap-3 px-2">
                        {studentTrials.map((t, i) => (
                          <div key={i} className="w-full flex flex-col items-center gap-4 group relative">
                            <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl">
                              {t.name}: {t.totalNet} Net
                            </div>
                            <div className="w-full bg-primary/10 rounded-2xl relative overflow-hidden h-full">
                              <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl transition-all duration-1000" style={{ height: `${(t.totalNet / 40) * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap rotate-45">{t.name.substring(0, 10)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="font-black text-slate-900 mb-4">Deneme Detayları</h4>
                      {studentTrials.length === 0 ? (
                        <p className="text-slate-500 text-sm font-medium">Bu öğrenciye ait kayıtlı deneme bulunmamaktadır.</p>
                      ) : (
                        <div className="space-y-4">
                          {studentTrials.map(t => (
                            <div key={t.id} className="p-6 bg-slate-50 hover:bg-slate-100/50 rounded-3xl border border-slate-100 transition-all">
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedTrialId(expandedTrialId === t.id ? null : t.id)}
                              >
                                <div>
                                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">{t.type || 'GENEL'}</span>
                                  <h5 className="font-bold text-slate-900">{t.name}</h5>
                                  <p className="text-xs text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</p>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div>
                                    <p className="text-xl font-black text-slate-900">{t.totalNet.toFixed(2)}</p>
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
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-8 bg-slate-900 rounded-3xl text-white shadow-2xl">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Ortalama Net</p>
                      <h3 className="text-5xl font-black">
                        {studentTrials.length > 0 ? (studentTrials.reduce((acc, curr) => acc + curr.totalNet, 0) / studentTrials.length).toFixed(2) : "0.00"}
                      </h3>
                      <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs font-bold">Veli Adı</span>
                          <span className="text-xs font-black">{selectedStudent.parentName || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Veli Tel</span>
                            <span className="text-xs font-black text-primary">{selectedStudent.parentTel || '-'}</span>
                          </div>
                          {selectedStudent.parentTel && (
                            <div className="flex justify-end gap-2">
                              <a 
                                href={`tel:${selectedStudent.parentTel}`} 
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-xs">call</span>
                                Ara
                              </a>
                              <a 
                                href={getWhatsAppLink(selectedStudent.parentTel)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs font-bold">Öğrenci Tel</span>
                            <span className="text-xs font-black text-primary">{selectedStudent.studentTel || '-'}</span>
                          </div>
                          {selectedStudent.studentTel && (
                            <div className="flex justify-end gap-2">
                              <a 
                                href={`tel:${selectedStudent.studentTel}`} 
                                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-xs">call</span>
                                Ara
                              </a>
                              <a 
                                href={getWhatsAppLink(selectedStudent.studentTel)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                              >
                                <span className="material-symbols-outlined text-[14px]">chat</span>
                                WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'new-lesson' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Calendar */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">
                    {trMonths[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-primary transition-all flex items-center justify-center border border-slate-100"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-primary transition-all flex items-center justify-center border border-slate-100"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">
                  {trDays.map(day => <div key={day} className="py-2">{day}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {getDaysInMonth().map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 rounded-2xl"></div>;
                    
                    const isSelected = selectedDate && 
                      day.getDate() === selectedDate.getDate() &&
                      day.getMonth() === selectedDate.getMonth() &&
                      day.getFullYear() === selectedDate.getFullYear();
                    
                    const dayLessons = getLessonsForDate(day);
                    const hasLessons = dayLessons.length > 0;
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all group ${
                          isSelected 
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                            : 'hover:bg-primary/5 hover:scale-[1.02] border border-slate-50'
                        }`}
                      >
                        <span className="font-bold text-sm">{day.getDate()}</span>
                        {hasLessons && (
                          <span className={`absolute bottom-2 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Day Details and Add Form */}
              <div className="lg:col-span-5 space-y-6">
                {/* Selected Day Lessons List */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-sm uppercase tracking-widest">
                      {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                    <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-black">
                      {getLessonsForDate(selectedDate).length} Ders
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {getLessonsForDate(selectedDate).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wide">
                        Bu güne planlanmış ders bulunmuyor.
                      </div>
                    ) : (
                      getLessonsForDate(selectedDate).map(lesson => (
                        <div key={lesson.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                          <div>
                            <h5 className="font-bold text-slate-900 text-sm">{lesson.title}</h5>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-primary font-black bg-primary/5 px-2 py-0.5 rounded-md">
                                {new Date(lesson.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {lesson.student && (
                                <span className="text-[10px] text-slate-400 font-bold">
                                  Öğrenci: {lesson.student.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => setActiveMeeting(lesson)}
                            className="bg-primary hover:bg-primary/95 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Derse Başla
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Create Lesson Form */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">calendar_add_on</span>
                    Yeni Ders Planla
                  </h4>
                  <form onSubmit={handleCreateLesson} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Öğrenci Seçimi</label>
                      <select 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        value={newLessonStudentId} 
                        onChange={(e) => setNewLessonStudentId(e.target.value)} 
                        required
                      >
                        <option value="">Öğrenci Seçiniz</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>{student.name} ({student.grade}. Sınıf)</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Başlığı</label>
                      <input 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        placeholder="Örn: TYT Fonksiyonlar" 
                        value={newLesson.title} 
                        onChange={(e) => setNewLesson({...newLesson, title: e.target.value})} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saat</label>
                      <input 
                        type="time" 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        value={lessonTime} 
                        onChange={(e) => setLessonTime(e.target.value)} 
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ders Linki (Zoom, Meet vb.)</label>
                      <input 
                        className="w-full rounded-2xl border border-primary/10 bg-slate-50/50 px-4 py-3.5 text-slate-900 font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" 
                        placeholder="https://zoom.us/j/... veya Google Meet linki" 
                        value={newLessonZoomUrl} 
                        onChange={(e) => setNewLessonZoomUrl(e.target.value)} 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl transition-all text-sm mt-2"
                    >
                      Dersi Kaydet
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowAddModal(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900 transition-colors">
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <h3 className="text-3xl font-black text-slate-900 mb-2">Yeni Öğrenci Kaydı</h3>
            <p className="text-slate-400 font-bold text-sm mb-10 uppercase tracking-widest">Eksiksiz doldurunuz</p>
            
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Ad Soyad</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} required/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Sınıf</label>
                  <select className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newStudent.grade} onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})} required>
                    <option value="">Seçiniz</option>
                    {[5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">E-posta (Opsiyonel)</label>
                  <input type="email" className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Öğrenci Tel (Opsiyonel)</label>
                  <input type="tel" className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.studentTel || ''} onChange={(e) => setNewStudent({...newStudent, studentTel: e.target.value})}/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Adı</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.parentName} onChange={(e) => setNewStudent({...newStudent, parentName: e.target.value})}/>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1">Veli Tel</label>
                  <input className="w-full rounded-2xl border-primary/10 bg-slate-50 px-5 py-4 text-slate-900 font-bold outline-none" value={newStudent.parentTel} onChange={(e) => setNewStudent({...newStudent, parentTel: e.target.value})}/>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all text-lg mt-4">Kaydı Tamamla</button>
            </form>
          </div>
        </div>
      )}
      {/* Live Class Overlay / Modal */}
      {activeMeeting && (
        <LiveMeeting
          lessonId={activeMeeting.id}
          role="TEACHER"
          userName={user?.name || 'Öğretmen'}
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
