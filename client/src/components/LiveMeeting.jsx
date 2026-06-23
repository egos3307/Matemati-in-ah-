import React, { useEffect, useRef, useState } from 'react';

const LiveMeeting = ({ lessonId, role, userName, onClose }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!window.JitsiMeetExternalAPI) {
      setError('Görüntülü konuşma servisi başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      setLoading(false);
      return;
    }

    try {
      if (apiRef.current) {
        apiRef.current.dispose();
      }

      const domain = 'jitsi.lqdn.fr';
      const roomName = `FulleMatematik_${lessonId}`;

      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false, // Skip prejoin page for direct entrance
          disableDeepLinking: true, // Avoid app install prompts on mobile
          enableWelcomePage: false,
          hideConferenceTimer: false,
          p2p: {
            enabled: true // Peer-to-peer for ultra low latency in 1-to-1 calls
          },
          disableThirdPartyRequests: true,
          toolbarButtons: [
            'microphone', 'camera', 'desktop', 'chat', 'settings', 'tileview', 'fullscreen', 'hangup'
          ]
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DEFAULT_BACKGROUND: '#0f172a',
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'chat', 'settings', 'tileview', 'fullscreen', 'hangup'
          ]
        }
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      apiRef.current = api;
      setLoading(false);

      // Listen for close/hangup
      api.addEventListener('videoConferenceLeft', () => {
        onClose();
      });

    } catch (err) {
      console.error('Jitsi initialization failed:', err);
      setError('Jitsi Meet bağlantısı kurulamadı.');
      setLoading(false);
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [lessonId, userName, onClose]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[999] flex flex-col font-sans text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">video_camera_front</span>
          </div>
          <div>
            <h4 className="font-bold text-sm md:text-base">Canlı Matematik Sınıfı</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
        >
          <span className="material-symbols-outlined text-sm">call_end</span>
          Sınıftan Ayrıl
        </button>
      </div>

      {/* Main Jitsi Container - Styled with absolute inset to prevent collapsing */}
      <div className="flex-1 bg-slate-950 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Sınıf Hazırlanıyor...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 text-center px-6 z-10">
            <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{error}</p>
            <button 
              onClick={onClose} 
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              Geri Dön
            </button>
          </div>
        )}

        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
};

export default LiveMeeting;
