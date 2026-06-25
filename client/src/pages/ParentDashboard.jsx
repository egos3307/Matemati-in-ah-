import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ParentDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // overview, payments, lessons, performance
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRecordingUrl, setActiveRecordingUrl] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentRes, lessonsRes, homeworksRes, trialsRes] = await Promise.all([
          axios.get('/api/parent/student'),
          axios.get('/api/parent/lessons'),
          axios.get('/api/parent/homeworks'),
          axios.get('/api/parent/trials')
        ]);

        setStudent(studentRes.data);
        setLessons(lessonsRes.data);
        setHomeworks(homeworksRes.data);
        setTrials(trialsRes.data);
        setError('');
      } catch (err) {
        console.error('Error fetching parent dashboard data:', err);
        setError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-650 font-sans">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-primary/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Veli Paneli Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-red-500">error</span>
        <h3 className="text-lg font-black text-slate-900">Hata</h3>
        <p className="text-sm text-slate-500 max-w-md">{error}</p>
        <button onClick={logout} className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-md">
          Çıkış Yap
        </button>
      </div>
    );
  }

  // Calculations
  const completedLessons = lessons.filter(l => new Date(l.date) < new Date()).length;
  const upcomingLessons = lessons.filter(l => new Date(l.date) >= new Date()).length;
  
  const completedHomeworks = homeworks.filter(h => h.status === 'COMPLETED').length;
  const pendingHomeworks = homeworks.filter(h => h.status === 'PENDING').length;
  const totalHomeworks = homeworks.length;
  const homeworkRate = totalHomeworks > 0 ? Math.round((completedHomeworks / totalHomeworks) * 100) : 0;

  const paymentStatusMap = {
    PAID: { label: 'Ödendi', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    UNPAID: { label: 'Ödenmedi', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    PARTIAL: { label: 'Kısmi Ödeme', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
  };
  const curPayment = paymentStatusMap[student?.paymentStatus] || { label: 'Belirtilmemiş', color: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 md:pb-6 md:pt-4 font-sans text-slate-800">
      {/* Header Banner */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none bg-slate-900"></div>
          
          <div className="flex items-center gap-4 z-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-650 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-primary/10">
              {student?.name?.charAt(0)}
            </div>
            <div>
              <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                Veli Paneli
              </span>
              <h2 className="text-2xl font-black text-slate-950 mt-1">{student?.name} Velisi</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-semibold text-slate-500">
                <span>Öğrenci Kodu: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-primary font-black text-[11px]">{student?.studentCode}</code></span>
                <span>Veli Giriş Kodu: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-650 font-black text-[11px]">{student?.parentCode}</code></span>
              </div>
            </div>
          </div>

          <button 
            onClick={logout} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50/50 transition-all font-bold text-xs cursor-pointer z-10 self-stretch md:self-auto justify-center"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Çıkış Yap
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">school</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Yapılan Ders Sayısı</p>
                  <h4 className="text-xl font-black text-slate-900 mt-0.5">{completedLessons} / {lessons.length} Ders</h4>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-650/10 text-indigo-650 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ödeme Durumu</p>
                  <span className={`inline-block border text-[11px] font-black px-2.5 py-0.5 rounded-full mt-1.5 ${curPayment.color}`}>
                    {curPayment.label}
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">task_alt</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ödev Tamamlama</p>
                  <h4 className="text-xl font-black text-slate-900 mt-0.5">%{homeworkRate} Başarı</h4>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Student Details Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="font-black text-slate-950 text-base border-b pb-3">Öğrenci Bilgileri</h4>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Öğrenci Adı:</span>
                    <span className="font-bold text-slate-900">{student?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Sınıf Derecesi:</span>
                    <span className="font-bold text-slate-900">{(student?.grade === 'KPSS' || student?.grade === 'Mezun') ? student?.grade : `${student?.grade}. Sınıf`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Verilen Hizmet:</span>
                    <span className="font-bold text-slate-900">{student?.serviceProvided || 'Matematik Özel Ders'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Öğrenci Telefon:</span>
                    <span className="font-bold text-slate-900">{student?.studentTel || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Veli Telefon:</span>
                    <span className="font-bold text-slate-900">{student?.parentTel || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="font-black text-slate-950 text-base border-b pb-3">Ödeme Ayrıntıları</h4>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Aylık Ücret:</span>
                    <span className="font-bold text-slate-900">{student?.paymentAmount ? `${student?.paymentAmount} ₺` : 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Ödeme Günü:</span>
                    <span className="font-bold text-slate-900">{student?.paymentDay ? `Her Ayın ${student?.paymentDay}. Günü` : 'Belirtilmemiş'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Ödeme Durumu:</span>
                    <span className="font-bold text-slate-900">{curPayment.label}</span>
                  </div>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-slate-400 font-semibold">Öğretmen Notu:</span>
                    <p className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-semibold italic">
                      {student?.paymentNote || 'Eklenmiş bir ödeme notu bulunmamaktadır.'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-650/10 text-indigo-650 flex items-center justify-center">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">Finansal Bilgiler</h3>
                  <p className="text-xs text-slate-400 font-semibold">Ders ücretleri ve ödeme takibi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Aylık Toplam Ücret</span>
                  <h2 className="text-3xl font-black text-slate-900">{student?.paymentAmount ? `${student?.paymentAmount} ₺` : 'Belirtilmemiş'}</h2>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Periyodik Ödeme Tarihi</span>
                  <h2 className="text-xl font-black text-slate-800 mt-1">{student?.paymentDay ? `Her Ayın ${student?.paymentDay}. Günü` : 'Belirtilmemiş'}</h2>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-900">Cari Durum</h4>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">check_circle</span>
                    <span className="text-sm font-bold text-slate-700">Güncel Dönem Ödeme Durumu</span>
                  </div>
                  <span className={`border text-xs font-black px-3.5 py-1 rounded-full ${curPayment.color}`}>
                    {curPayment.label}
                  </span>
                </div>
              </div>

              {student?.paymentNote && (
                <div className="space-y-2">
                  <h4 className="font-black text-slate-900">Öğretmen Ödeme Notları</h4>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-semibold italic">
                    {student.paymentNote}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LESSONS TAB */}
        {activeTab === 'lessons' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Toplam Ders</span>
                <span className="text-3xl font-black text-slate-900 mt-1 block">{lessons.length}</span>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tamamlanan</span>
                <span className="text-3xl font-black text-emerald-600 mt-1 block">{completedLessons}</span>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Yaklaşan</span>
                <span className="text-3xl font-black text-indigo-650 mt-1 block">{upcomingLessons}</span>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-slate-950 border-b pb-3">Ders Listesi</h3>
              
              <div className="space-y-4">
                {lessons.map((lesson) => {
                  const isCompleted = new Date(lesson.date) < new Date();
                  return (
                    <div key={lesson.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'
                        }`}>
                          <span className="material-symbols-outlined text-xl">
                            {isCompleted ? 'check_circle' : 'schedule'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{lesson.title}</h4>
                          <p className="text-xs text-slate-400 font-semibold mt-0.5">
                            {new Date(lesson.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(lesson.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {lesson.teacher?.name && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded font-bold mt-1.5 inline-block">
                              Öğretmen: {lesson.teacher.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted && lesson.recordingUrl ? (
                          <button 
                            onClick={() => setActiveRecordingUrl(lesson.recordingUrl)} 
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 transition-colors shadow-sm cursor-pointer uppercase tracking-wider"
                          >
                            <span className="material-symbols-outlined text-[14px]">play_circle</span>
                            Kaydı İzle
                          </button>
                        ) : isCompleted ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                            Ders Tamamlandı
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                            Gelecek Ders
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {lessons.length === 0 && (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm">
                    Bu öğrenciye tanımlı ders bulunmamaktadır.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* Homework progress */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Ödev Takip Raporu</h3>
                  <p className="text-xs text-slate-400 font-semibold">Öğrencinin verilen ödevleri tamamlama performansı</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">%{homeworkRate}</span>
                  <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wider">Genel Başarı</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-primary to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${homeworkRate}%` }}></div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
                  <span>Ödevlerin {completedHomeworks} tanesi tamamlandı</span>
                  <span>{pendingHomeworks} ödev bekliyor</span>
                </div>
              </div>

              {/* List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {homeworks.map((hw) => {
                  const isDone = hw.status === 'COMPLETED';
                  return (
                    <div key={hw.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
                      <div className="truncate">
                        <h4 className="font-extrabold text-slate-800 text-xs truncate">{hw.homework.title}</h4>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          {hw.homework.deadline ? `${new Date(hw.homework.deadline).toLocaleDateString('tr-TR')} son gün` : 'Son tarih yok'}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border flex-shrink-0 ${
                        isDone 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        {isDone ? 'Yapıldı' : 'Eksik'}
                      </span>
                    </div>
                  );
                })}

                {homeworks.length === 0 && (
                  <div className="col-span-full text-center py-6 text-slate-400 font-bold text-sm">
                    Kayıtlı ödev bulunmuyor.
                  </div>
                )}
              </div>
            </div>

            {/* Trial exam stats */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-950">Deneme Sınavları</h3>
                <p className="text-xs text-slate-400 font-semibold">Öğrencinin deneme sınavı netlerinin gelişim grafiği</p>
              </div>

              {/* Graphical Net Chart */}
              {trials.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-48 flex items-end justify-between gap-3 px-2 pt-8">
                    {trials.slice().reverse().map((t, i) => (
                      <div key={i} className="w-full flex flex-col items-center gap-3 group relative h-full justify-end">
                        <span className="text-[10px] font-black text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">
                          {t.totalNet} Net
                        </span>
                        <div className="w-full bg-primary/10 rounded-xl relative overflow-hidden" style={{ height: `${(t.totalNet / 90) * 100}%`, minHeight: '8px' }}>
                          <div className="absolute inset-0 bg-primary rounded-xl"></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap rotate-45 origin-left truncate max-w-[60px]" title={t.name}>
                          {t.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-black text-slate-900">Sınav Detayları</h4>
                    <div className="space-y-3">
                      {trials.map((t) => (
                        <div key={t.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/20 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="font-extrabold text-slate-900 text-sm">{t.name}</span>
                            <span className="text-xs font-black text-primary bg-primary/5 px-3 py-1 rounded-xl border border-primary/15">{t.totalNet} Net</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {Object.entries(t.results).map(([subj, data]) => (
                              <div key={subj} className="bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                                <span className="font-bold text-slate-500 block truncate" title={subj}>{subj}</span>
                                <span className="font-black text-slate-800 mt-0.5 block">D: {data.correct} | Y: {data.wrong}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 font-bold text-sm">
                  Kayıtlı deneme sınavı bulunmamaktadır.
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary/10 px-6 py-3 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center gap-1 ${activeTab === 'overview' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px] font-bold">Özet</span>
        </button>
        <button onClick={() => setActiveTab('payments')} className={`flex flex-col items-center gap-1 ${activeTab === 'payments' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">payments</span>
          <span className="text-[10px] font-bold">Ödemeler</span>
        </button>
        <button onClick={() => setActiveTab('lessons')} className={`flex flex-col items-center gap-1 ${activeTab === 'lessons' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">school</span>
          <span className="text-[10px] font-bold">Dersler</span>
        </button>
        <button onClick={() => setActiveTab('performance')} className={`flex flex-col items-center gap-1 ${activeTab === 'performance' ? 'text-primary scale-110' : 'text-slate-400'}`}>
          <span className="material-symbols-outlined">monitoring</span>
          <span className="text-[10px] font-bold">Performans</span>
        </button>
      </nav>

      {/* Video Recording Playback Modal */}
      {activeRecordingUrl && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">play_circle</span>
                Ders Kaydı İzle
              </h3>
              <button 
                onClick={() => setActiveRecordingUrl(null)}
                className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              <video 
                src={activeRecordingUrl} 
                controls 
                playsInline 
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
