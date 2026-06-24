import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { LiveKitRoom, useTracks, useLocalParticipant, VideoTrack, useConnectionState } from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';

// Inner component holding the active session state
const MeetingSession = ({ role, userName, onClose }) => {
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  const isScreenSharing = screenShareTracks.length > 0;

  // Dragging state for camera feeds when screen sharing is active
  const [floatingPos, setFloatingPos] = useState({ x: window.innerWidth - 230, y: window.innerHeight - 360 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock scrolling of background dashboard when meeting is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Monitor manual escape from Browser Fullscreen (if they use the manual button)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('.no-drag')) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - floatingPos.x,
      y: e.clientY - floatingPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      // Keep within viewport bounds with margins
      const minX = 10;
      const minY = 10;
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - 250;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setFloatingPos({ x: newX, y: newY });
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
  }, [isDragging]);

  // Handle window resizing to keep the floating panel on screen
  useEffect(() => {
    const handleResize = () => {
      setFloatingPos((prev) => {
        const maxX = window.innerWidth - 220;
        const maxY = window.innerHeight - 250;
        return {
          x: Math.max(10, Math.min(maxX, prev.x)),
          y: Math.max(10, Math.min(maxY, prev.y))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMicrophone = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (err) {
      console.error("Audio toggle failed:", err);
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error("Camera toggle failed:", err);
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (err) {
      console.error("Screen share toggle failed:", err);
      alert("Ekran paylaşımı başlatılamadı. Tarayıcınızın ekran paylaşım iznini verdiğinizden ve bağlantınızın güvenli (HTTPS) olduğundan emin olun.");
    }
  };

  const handleLeave = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (err) {
      console.warn(err);
    }
    if (onClose) {
      onClose();
    }
  };

  // Render loading state if connection is not ready
  if (connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-white font-sans fixed inset-0 z-[99999] overflow-hidden">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          {connectionState === ConnectionState.Connecting ? 'Sınıfa Bağlanılıyor...' : 'Yeniden Bağlanılıyor...'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 flex items-center justify-center">
            <img src="/logo.png" alt="Fullematematik Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h4 className="font-bold text-xs md:text-sm text-slate-100">Canlı Ders Odası</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer mr-1"
            title={isFullscreen ? "Tarayıcı Tam Ekrandan Çık" : "Tarayıcı Tam Ekran Yap"}
          >
            <span className="material-symbols-outlined text-lg">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          {isScreenSharing && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Ekran Paylaşılıyor
            </span>
          )}
        </div>
      </div>

      {/* Main Video View Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        {isScreenSharing ? (
          // 1. LAYOUT WHEN SCREEN SHARING IS ACTIVE
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="w-full h-full p-2">
              <VideoTrack 
                trackRef={screenShareTracks[0]} 
                className="w-full h-full object-contain rounded-xl overflow-hidden border border-slate-850" 
              />
            </div>

            {/* Draggable Custom Floating Panel for Webcams */}
            <div 
              onMouseDown={handleMouseDown}
              className="absolute z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden select-none flex flex-col p-2 gap-2 cursor-move"
              style={{
                left: `${floatingPos.x}px`,
                top: `${floatingPos.y}px`,
                width: '200px',
              }}
            >
              {/* Floating window header */}
              <div className="px-1.5 py-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800/40 select-none flex justify-between items-center pb-1.5">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">group</span>
                  Kameralar
                </span>
                <span className="material-symbols-outlined text-[14px] text-slate-500">drag_indicator</span>
              </div>
              
              {/* Webcam list in floating overlay */}
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-drag pr-0.5">
                {cameraTracks.map((trackRef) => (
                  <div 
                    key={trackRef.publication.trackSid} 
                    className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shadow-sm"
                  >
                    <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-bold border border-white/5">
                      {trackRef.participant.identity}
                    </div>
                  </div>
                ))}
                {cameraTracks.length === 0 && (
                  <div className="text-center py-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Aktif kamera yok
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 2. DEFAULT GRID LAYOUT FOR WEB-CAMS
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl w-full">
              {cameraTracks.map((trackRef) => (
                <div 
                  key={trackRef.publication.trackSid} 
                  className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-xl group hover:border-emerald-500/30 transition-all duration-300"
                >
                  <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-md border border-white/5">
                    {trackRef.participant.identity} {trackRef.participant.identity === userName ? '(Sen)' : ''}
                  </div>
                </div>
              ))}
              {cameraTracks.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-slate-900/20 rounded-3xl border border-slate-900/40 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-2xl">person_search</span>
                  </div>
                  <h5 className="font-bold text-slate-350 text-sm mb-1">Katılımcı Bekleniyor</h5>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ders başlamak üzere. Diğer kullanıcıların katılması bekleniyor.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Controls Bar */}
      <div className="bg-slate-900/95 backdrop-blur py-4 px-6 flex items-center justify-between border-t border-slate-800/80 z-10 shadow-lg">
        {/* Left Side: Mic & Camera Buttons */}
        <div className="flex items-center gap-2">
          {/* Audio button */}
          <button 
            onClick={toggleMicrophone}
            className={`p-3 rounded-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md ${
              isMicrophoneEnabled 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/50 hover:scale-102' 
                : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
            }`}
            title={isMicrophoneEnabled ? "Sesi Kapat" : "Sesi Aç"}
          >
            <span className="material-symbols-outlined text-lg">
              {isMicrophoneEnabled ? 'mic' : 'mic_off'}
            </span>
          </button>

          {/* Camera button */}
          <button 
            onClick={toggleCamera}
            className={`p-3 rounded-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md ${
              isCameraEnabled 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/50 hover:scale-102' 
                : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
            }`}
            title={isCameraEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
          >
            <span className="material-symbols-outlined text-lg">
              {isCameraEnabled ? 'videocam' : 'videocam_off'}
            </span>
          </button>
        </div>

        {/* Right Side: Share Screen & Leave Buttons */}
        <div className="flex items-center gap-3">
          {/* Screen Share button */}
          <button 
            onClick={toggleScreenShare}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer shadow-md ${
              isScreenShareEnabled 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/10 hover:scale-102' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/50 hover:scale-102'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isScreenShareEnabled ? 'stop_screen_share' : 'screen_share'}
            </span>
            {isScreenShareEnabled ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
          </button>

          {/* Hangup / Leave button */}
          <button 
            onClick={handleLeave}
            className="bg-red-600 hover:bg-red-750 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/20 hover:scale-102"
          >
            <span className="material-symbols-outlined text-base">call_end</span>
            Ayrıl
          </button>
        </div>
      </div>
    </div>
  );
};

// Main LiveMeeting Wrapper
const LiveMeeting = ({ lessonId, role, userName, onClose }) => {
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const roomName = `lesson_${lessonId}`;
        const res = await axios.post('/api/livekit/token', {
          roomName,
          participantName: userName,
          role
        });
        setToken(res.data.token);
        setServerUrl(res.data.serverUrl);
        setLoading(false);
      } catch (err) {
        console.error('LiveKit token fetch failed:', err);
        setError('Canlı ders sunucusuna bağlanılamadı. Lütfen tekrar deneyin.');
        setLoading(false);
      }
    };

    fetchToken();
  }, [lessonId, userName, role]);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-white font-sans overflow-hidden">
        <div className="w-9 h-9 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin"></div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Sınıf Hazırlanıyor...</p>
      </div>,
      document.body
    );
  }

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-white font-sans text-center px-4 overflow-hidden">
        <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-800/40 text-red-400 flex items-center justify-center mb-2 shadow-lg">
          <span className="material-symbols-outlined text-2xl">error</span>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{error}</p>
        <button 
          onClick={onClose} 
          className="mt-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700/50 cursor-pointer shadow-md"
        >
          Geri Dön
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      onDisconnected={onClose}
      connectOptions={{ autoSubscribe: true }}
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 overflow-hidden"
    >
      <MeetingSession 
        role={role} 
        userName={userName} 
        onClose={onClose} 
      />
    </LiveKitRoom>,
    document.body
  );
};

export default LiveMeeting;
