import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WatchRecording = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoUrl = searchParams.get('url');
  const lessonTitle = searchParams.get('title') || 'Ders Kaydı';
  const [isBuffering, setIsBuffering] = React.useState(false);

  const getBackPath = () => {
    if (user?.role === 'PARENT') return '/veli';
    if (user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER') return '/ogretmen';
    return '/ogrenci';
  };

  const getPlayerTypeAndUrl = (url) => {
    if (!url) return { type: 'native', url: '' };
    
    const decodedUrl = decodeURIComponent(url);
    
    // 1. Google Drive Link Detector
    if (decodedUrl.includes('drive.google.com')) {
      let fileId = '';
      const fileDMatch = decodedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch) {
        fileId = fileDMatch[1];
      } else {
        const idParamMatch = decodedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParamMatch) {
          fileId = idParamMatch[1];
        }
      }
      
      if (fileId) {
        return {
          type: 'iframe',
          url: `https://drive.google.com/file/d/${fileId}/preview`
        };
      }
    }
    
    // 2. YouTube Link Detector
    if (decodedUrl.includes('youtube.com') || decodedUrl.includes('youtu.be')) {
      let videoId = '';
      const watchMatch = decodedUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      } else {
        const shortMatch = decodedUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) {
          videoId = shortMatch[1];
        } else {
          const embedMatch = decodedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
          if (embedMatch) {
            videoId = embedMatch[1];
          }
        }
      }
      
      if (videoId) {
        return {
          type: 'iframe',
          url: `https://www.youtube.com/embed/${videoId}`
        };
      }
    }
    
    // Default to native HTML5 video tag
    return { type: 'native', url: decodedUrl };
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

  const player = getPlayerTypeAndUrl(videoUrl);

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
        <div className="flex items-center gap-3">
          {player.type === 'native' ? (
            <a 
              href={player.url} 
              download="ders_kaydi.webm"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all hover:scale-[1.02] shadow-md shadow-emerald-950/20"
              title="Donma problemi yaşarsanız indirip izleyebilirsiniz"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Donuyorsa İndir
            </a>
          ) : (
            <a 
              href={decodeURIComponent(videoUrl)} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all hover:scale-[1.02] shadow-md shadow-indigo-950/20"
              title="Kaydı yeni sekmede aç"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              {decodeURIComponent(videoUrl).includes('drive.google.com') ? "Google Drive'da Aç" : "Dış Kaynakta Aç"}
            </a>
          )}
          <div className="bg-primary/20 border border-primary/30 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider drop-shadow-sm hidden md:block">
            Fulle Matematik
          </div>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="flex-1 w-full h-full flex items-center justify-center bg-black relative">
        {player.type === 'iframe' ? (
          <iframe 
            src={player.url} 
            className="w-full h-full max-h-screen border-0 z-10" 
            allow="autoplay; encrypted-media; picture-in-picture" 
            allowFullScreen
          />
        ) : (
          <video 
            src={player.url} 
            controls 
            playsInline 
            autoPlay
            preload="auto"
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onSeeked={() => setIsBuffering(false)}
            className="w-full h-full max-h-screen object-contain z-10"
          />
        )}
        
        {isBuffering && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 transition-all">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-200 tracking-wider">Video Yükleniyor...</p>
          </div>
        )}

        {/* Abstract background glow for premium glassmorphism vibe */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
      </div>
    </div>
  );
};

export default WatchRecording;
