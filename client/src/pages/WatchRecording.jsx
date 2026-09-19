import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function extractDriveFileId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = decodeURIComponent(input).trim();

  if (trimmed.startsWith('drive:')) {
    const id = trimmed.replace('drive:', '').trim();
    if (/^[a-zA-Z0-9_-]{15,60}$/.test(id)) return id;
  }

  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  if (!trimmed.includes('/') && !trimmed.includes('?') && /^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

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

  const driveFileId = extractDriveFileId(videoUrl);
  const driveWatchUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null;

  // Otomatik olarak yeni sekmede açmayı dene
  useEffect(() => {
    if (driveWatchUrl) {
      try {
        const opened = window.open(driveWatchUrl, '_blank', 'noopener,noreferrer');
        if (opened) {
          // Açıldıysa kullanıcıyı önceki sayfasına nazikçe yönlendirebiliriz veya bilgilendirebiliriz
        }
      } catch (e) {
        console.warn('Popup blocker prevented automatic tab open:', e);
      }
    }
  }, [driveWatchUrl]);

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h2 className="text-2xl font-black mb-2">Hata: Ders Kaydı Bulunamadı</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md">
          Geçersiz veya eksik ders kaydı bağlantısı. Lütfen Dersler sayfasına geri dönüp tekrar deneyin.
        </p>
        <button 
          onClick={() => navigate(getBackPath())} 
          className="bg-primary hover:bg-primary/95 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg transition-all cursor-pointer"
        >
          Derslerime Geri Dön
        </button>
      </div>
    );
  }

  // YouTube Linki için istisnai destek
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  let ytEmbedUrl = null;
  if (isYouTube) {
    const watchMatch = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    const shortMatch = videoUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    const embedMatch = videoUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    const ytId = watchMatch?.[1] || shortMatch?.[1] || embedMatch?.[1];
    if (ytId) ytEmbedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(getBackPath());
              }
            }} 
            className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Geri Dön"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h1 className="text-base font-black tracking-wide text-slate-100 font-display">
              {lessonTitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium font-sans">
              Ders Kayıt Sistemi
            </p>
          </div>
        </div>
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
          Google Drive Hızlı Oynatıcı
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {isYouTube && ytEmbedUrl ? (
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <iframe
              src={ytEmbedUrl}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="max-w-lg w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-4xl">play_circle</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                {lessonTitle}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ders kaydınız en yüksek görüntü kalitesi ve kesintisiz hız için doğrudan Google Drive üzerinden oynatılmaktadır.
              </p>
            </div>

            {driveWatchUrl ? (
              <a
                href={driveWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                <span className="material-symbols-outlined text-xl">open_in_new</span>
                Google Drive'da İzle (Yeni Sekme)
              </a>
            ) : (
              <div className="text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl">
                Geçerli bir Google Drive video dosyası tespit edilemedi.
              </div>
            )}

            <button
              onClick={() => navigate(getBackPath())}
              className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              ← Derslerime Geri Dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WatchRecording;
