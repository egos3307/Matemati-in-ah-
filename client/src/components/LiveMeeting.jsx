import React, { useEffect, useRef, useState } from 'react';

const LiveMeeting = ({ lessonId, role, userName, onClose }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View modes: 'fullscreen', 'floating', 'minimized'
  const [viewMode, setViewMode] = useState('fullscreen');
  const [position, setPosition] = useState({ x: window.innerWidth - 520, y: window.innerHeight - 440 });
  const [size, setSize] = useState({ width: 480, height: 360 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Update default position if window resizes
  useEffect(() => {
    const handleResize = () => {
      if (viewMode === 'fullscreen') {
        setPosition({ x: window.innerWidth - size.width - 24, y: window.innerHeight - size.height - 24 });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, size]);

  // Dragging logic
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('.no-drag')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      // Keep within viewport boundaries
      const padding = 10;
      newX = Math.max(padding, Math.min(window.innerWidth - size.width - padding, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - size.height - padding, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, size]);

  // Initialize Jitsi Meet API
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
          prejoinPageEnabled: false, 
          disableDeepLinking: true, 
          enableWelcomePage: false,
          hideConferenceTimer: false,
          p2p: {
            enabled: true 
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
          DEFAULT_BACKGROUND: '#f8fafc',
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
    <>
      {/* Main Meeting Container (Preserved in DOM to keep connection alive when minimized) */}
      <div 
        className={`fixed z-[999] flex flex-col font-sans text-slate-800 bg-white transition-all duration-200 border border-slate-200/80 shadow-2xl ${
          viewMode === 'fullscreen' 
            ? 'inset-0' 
            : viewMode === 'floating' 
              ? 'rounded-2xl overflow-hidden' 
              : 'pointer-events-none opacity-0 w-0 h-0 overflow-hidden'
        }`}
        style={
          viewMode === 'floating'
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                resize: 'both',
                minWidth: '320px',
                minHeight: '240px',
              }
            : {}
        }
      >
        {/* Header Bar */}
        <div 
          onMouseDown={viewMode === 'floating' ? handleMouseDown : undefined}
          className={`bg-slate-50/90 text-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-200/60 shadow-sm select-none ${
            viewMode === 'floating' ? 'cursor-move' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 flex items-center justify-center">
              <img src="/logo.png" alt="Fullematematik Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h4 className="font-bold text-xs md:text-sm text-slate-900">Canlı Ders Odası</h4>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
              </p>
            </div>
          </div>

          {/* Window Control Buttons */}
          <div className="flex items-center gap-1.5 no-drag">
            {viewMode === 'fullscreen' ? (
              <button 
                onClick={() => setViewMode('floating')}
                title="Pencere Moduna Geç"
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-850 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">picture_in_picture_alt</span>
              </button>
            ) : (
              <button 
                onClick={() => setViewMode('fullscreen')}
                title="Tam Ekrana Geç"
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-850 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">fullscreen</span>
              </button>
            )}

            <button 
              onClick={() => setViewMode('minimized')}
              title="Aşağı İndir (Küçült)"
              className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-850 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>

            <button 
              onClick={onClose} 
              title="Sınıftan Ayrıl"
              className="ml-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-red-500/20"
            >
              <span className="material-symbols-outlined text-xs">call_end</span>
              Ayrıl
            </button>
          </div>
        </div>

        {/* Main Jitsi Area */}
        <div className="flex-1 bg-slate-50 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 z-10">
              <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin"></div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sınıf Hazırlanıyor...</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 text-center px-4 z-10">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">error</span>
              </div>
              <p className="text-[10px] font-bold text-slate-650 uppercase tracking-widest">{error}</p>
              <button 
                onClick={onClose} 
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                Geri Dön
              </button>
            </div>
          )}

          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        </div>
      </div>

      {/* Minimized Floating Action Button (Bubble) */}
      {viewMode === 'minimized' && (
        <div 
          onClick={() => setViewMode('floating')}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-2xl hover:scale-105 transition-all z-[9999] group border border-slate-200/80"
        >
          {/* Pulsing visual indicator */}
          <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-75"></div>
          {/* Logo inside bubble */}
          <img src="/logo.png" alt="Fullematematik Logo" className="w-9 h-9 object-contain z-10" />
          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-slate-800 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-200">
            Derse Geri Dön ({userName})
          </div>
        </div>
      )}
    </>
  );
};

export default LiveMeeting;
