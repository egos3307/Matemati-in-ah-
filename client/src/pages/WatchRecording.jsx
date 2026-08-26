import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const isSafari = typeof navigator !== 'undefined' &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const WatchRecording = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoUrl = searchParams.get('url');
  const lessonTitle = searchParams.get('title') || 'Ders Kaydı';
  const [isBuffering, setIsBuffering] = React.useState(true);
  const [videoError, setVideoError] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(0);

  const getBackPath = () => {
    if (user?.role === 'PARENT') return '/veli';
    if (user?.role === 'TEACHER' || user?.role === 'HEAD_TEACHER') return '/ogretmen';
    return '/ogrenci';
  };

  const getPlayerTypeAndUrl = (url) => {
    if (!url) return { type: 'native', url: '' };
    
    const decodedUrl = decodeURIComponent(url).trim();
    
    // 1. Güvenli Drive stream (drive:FILEID formatı)
    if (decodedUrl.startsWith('drive:')) {
      const fileId = decodedUrl.replace('drive:', '');
      const apiBase = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token') || '';
      return {
        type: 'native',
        url: `${apiBase}/api/drive/stream/${fileId}?token=${encodeURIComponent(token)}`
      };
    }
    
    // 2. Pixeldrain -> Site içi HTML5 Video Oynatıcı
    if (decodedUrl.includes('pixeldrain.com')) {
      const match = decodedUrl.match(/\/u\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return {
          type: 'native',
          url: `https://pixeldrain.com/api/file/${match[1]}`
        };
      }
    }

    // 3. Google Drive Link Detector -> Stream native video via server proxy
    if (decodedUrl.includes('drive.google.com')) {
      const fileDMatch = decodedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileDMatch && fileDMatch[1]) {
        return {
          type: 'native',
          url: `/api/drive/stream/${fileDMatch[1]}`
        };
      }

      const folderMatch = decodedUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (folderMatch && folderMatch[1]) {
        return {
          type: 'native',
          url: `/api/drive/stream/${folderMatch[1]}`
        };
      }

      const idParamMatch = decodedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch && idParamMatch[1]) {
        return {
          type: 'native',
          url: `/api/drive/stream/${idParamMatch[1]}`
        };
      }
    }
    
    // 4. GoFile Link Detector
    if (decodedUrl.includes('gofile.io')) {
      return { type: 'gofile', url: decodedUrl };
    }

    // 5. YouTube Link Detector
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
          url: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
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
    <div className="h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
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
          <div className="bg-primary/20 border border-primary/30 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider drop-shadow-sm hidden md:block">
            Fullematematiği Korumalı Oynatıcı
          </div>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="flex-1 w-full flex items-center justify-center bg-black relative" style={{ minHeight: 0 }}>

        {videoError ? (
          <div className="flex flex-col items-center justify-center gap-6 text-center px-6 z-10 relative">
            <span className="material-symbols-outlined text-6xl text-red-400">broken_image</span>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Video Oynatılamıyor</h2>
              <p className="text-slate-400 text-sm max-w-md">
                Ders kaydı yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edip sayfayı yenileyin.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Yeniden Dene
            </button>
          </div>
        ) : player.type === 'iframe' ? (
          <div className="relative w-full h-full">
            <iframe
              src={player.url}
              className="w-full h-full border-0 z-10"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              allowFullScreen
              onError={() => setVideoError(true)}
            />
            {/* Top-Right Shield: Blocks Drive pop-out icon without obstructing play/pause controls */}
            <div 
              className="absolute top-0 right-0 w-24 h-14 bg-transparent z-30 pointer-events-auto cursor-default" 
              title="Sitede Korumalı Yayın"
            />
          </div>
        ) : (
          <video
            src={player.url}
            controls
            playsInline
            autoPlay
            preload="auto"
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => { setIsBuffering(false); setVideoError(false); }}
            onCanPlay={() => setIsBuffering(false)}
            onSeeked={() => setIsBuffering(false)}
            onError={() => { setIsBuffering(false); setVideoError(true); }}
            onProgress={(e) => {
              const v = e.target;
              if (v.duration && v.buffered.length > 0) {
                const bufferedEnd = v.buffered.end(v.buffered.length - 1);
                setLoadProgress(Math.min(100, Math.round((bufferedEnd / v.duration) * 100)));
              }
            }}
            className="w-full h-full max-h-screen object-contain z-10"
          />
        )}

        {player.type === 'native' && isBuffering && !videoError && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 transition-all px-6 text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-200 tracking-wider">
              Video Yükleniyor{loadProgress > 0 ? ` — %${loadProgress}` : '...'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs">
              Uzun ders kayıtlarının açılması biraz zaman alabilir, lütfen sayfayı kapatmadan bekleyin.
            </p>
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none" />
      </div>
    </div>
  );
};

export default WatchRecording;
