import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WatchRecording = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoUrl = searchParams.get('url');
  const lessonTitle = searchParams.get('title') || 'Ders Kaydı';

  const getBackPath = () => {
    if (user?.role === 'PARENT') return '/veli';
    if (user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER') return '/ogretmen';
    return '/ogrenci';
  };

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h2 className="text-2xl font-black mb-2">Hata: Ders Kaydı Bulunamadı</h2>
        <p className="text-slate-400 text-sm mb-6 text-center max-w-md">
          Geçersiz veya eksik ders kaydı bağlantısı. Lütfen Dersler sayfasına geri dönüp tekrar deneyin.
        </p>
        <button 
          onClick={() => navigate(getBackPath())} 
          className="bg-primary hover:bg-primary/95 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg transition-all"
        >
          Derslerime Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Immersive Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/85 to-transparent px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(getBackPath());
              }
            }} 
            className="h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Geri Dön"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-wide text-slate-100 font-display drop-shadow">
              {lessonTitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium font-sans drop-shadow-sm">
              Ders Kayıt Yayını
            </p>
          </div>
        </div>
        <div className="bg-primary/20 border border-primary/30 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider drop-shadow-sm">
          Fulle Matematik
        </div>
      </div>

      {/* Video Viewport */}
      <div className="flex-1 w-full h-full flex items-center justify-center bg-black relative">
        <video 
          src={decodeURIComponent(videoUrl)} 
          controls 
          playsInline 
          autoPlay
          className="w-full h-full max-h-screen object-contain z-10"
        />
        
        {/* Abstract background glow for premium glassmorphism vibe */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
      </div>
    </div>
  );
};

export default WatchRecording;
