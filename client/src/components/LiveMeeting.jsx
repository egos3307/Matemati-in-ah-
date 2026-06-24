import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { 
  LiveKitRoom, 
  useTracks, 
  useLocalParticipant, 
  VideoTrack, 
  useConnectionState,
  useParticipants
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import '@livekit/components-styles';

// Helper to determine if a participant is a teacher
const checkIsTeacher = (participant) => {
  try {
    if (participant.metadata) {
      const data = JSON.parse(participant.metadata);
      return data.role === 'TEACHER';
    }
  } catch (e) {
    // metadata is not JSON
  }
  // Suffix fallback checking
  return participant.identity.includes('Öğretmen') || participant.identity.includes('TEACHER');
};

// 1. JITSI FALLBACK COMPONENT
// This guarantees that if LiveKit is not configured in Vercel or locally, 
// the student and teacher can still join the lesson immediately.
const JitsiFallbackMeeting = ({ roomName, userName, role, onClose }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const loadJitsi = () => {
      if (!containerRef.current) return;
      if (!window.JitsiMeetExternalAPI) {
        console.warn('Jitsi Meet External API not found, trying fallback scripts.');
        return;
      }

      try {
        const domain = 'jitsi.lqdn.fr';
        const options = {
          roomName: `FulleMatematik_${roomName}`,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: { displayName: userName },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            hideConferenceTimer: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#0b0f19',
          }
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current = api;

        api.addEventListener('videoConferenceLeft', () => {
          onClose();
        });
      } catch (err) {
        console.error('Failed to initialize Jitsi:', err);
      }
    };

    const timer = setTimeout(loadJitsi, 300);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalStyle;
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, userName, onClose]);

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex flex-col bg-[#0b0f19] font-sans text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain animate-pulse" />
          <div>
            <h4 className="font-bold text-xs md:text-sm text-slate-100">Canlı Ders Odası <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded ml-2">Yedek Sunucu</span></h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="bg-red-650 hover:bg-red-750 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-500/20"
        >
          Ayrıl
        </button>
      </div>
      
      {/* Jitsi Iframe Container */}
      <div ref={containerRef} className="flex-1 w-full bg-slate-900" />
    </div>
  );
};


// 2. LIVEKIT SESSION COMPONENT WITH PREMIUM CUSTOM UI
const MeetingSession = ({ role, userName, onClose }) => {
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  const isScreenSharing = screenShareTracks.length > 0;

  // Custom UI view toggle states
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging state for camera feeds when screen sharing is active
  const [floatingPos, setFloatingPos] = useState({ x: window.innerWidth - 230, y: window.innerHeight - 360 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Body scroll lock
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Request media streams gracefully AFTER connecting (prevents startup crash if permission blocked/no camera)
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      const startStreams = async () => {
        try {
          await localParticipant.setMicrophoneEnabled(true);
          await localParticipant.setCameraEnabled(true);
        } catch (err) {
          console.warn("Could not auto-enable devices (blocked permissions or device missing):", err);
        }
      };
      startStreams();
    }
  }, [connectionState, localParticipant]);

  // Monitor browser fullscreen state
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

  // Maintain floating window placement on window resize
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

  if (connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-[#080b11] text-white font-sans fixed inset-0 z-[99999] overflow-hidden">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-emerald-500/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          {connectionState === ConnectionState.Connecting ? 'Sınıf Sunucusuna Bağlanılıyor...' : 'Yeniden Bağlanılıyor...'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen z-[99999] flex flex-col bg-[#080b11] font-sans text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-800/50 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex items-center justify-center bg-slate-950 rounded-xl p-1 shadow-inner border border-slate-850">
            <img src="/logo.png" alt="Fullematematik Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs md:text-sm text-slate-100 tracking-wide">Canlı Ders Odası</h4>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {role === 'TEACHER' ? 'Öğretmen' : 'Öğrenci'} • {userName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen Button */}
          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-sm border border-transparent hover:border-slate-750"
            title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
          >
            <span className="material-symbols-outlined text-lg">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          {isScreenSharing && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase tracking-wider">
              Ekran Paylaşılıyor
            </span>
          )}
        </div>
      </div>

      {/* Main Content Pane (Videos & Sidebar) */}
      <div className="flex-1 flex relative overflow-hidden bg-[#05070a]">
        
        {/* VIDEO DISPLAY WINDOW */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
          {isScreenSharing ? (
            // A. LAYOUT: SCREEN SHARING ACTIVE
            <div className="w-full h-full flex items-center justify-center p-3 relative bg-black">
              <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-850 shadow-inner bg-slate-950">
                <VideoTrack 
                  trackRef={screenShareTracks[0]} 
                  className="w-full h-full object-contain" 
                />
              </div>

              {/* Webcams Float Box (Draggable) */}
              <div 
                onMouseDown={handleMouseDown}
                className="absolute z-20 bg-slate-900/95 backdrop-blur-md border border-slate-750/70 rounded-2xl shadow-2xl overflow-hidden select-none flex flex-col p-2.5 gap-2 cursor-move"
                style={{
                  left: `${floatingPos.x}px`,
                  top: `${floatingPos.y}px`,
                  width: '210px',
                }}
              >
                {/* Header */}
                <div className="px-1.5 py-0.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800/60 select-none flex justify-between items-center pb-2">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-emerald-400">group</span>
                    Katılımcılar
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-slate-500">drag_indicator</span>
                </div>
                
                {/* Videos */}
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-drag pr-0.5">
                  {cameraTracks.map((trackRef) => {
                    const isTeacher = checkIsTeacher(trackRef.participant);
                    return (
                      <div 
                        key={trackRef.publication.trackSid} 
                        className={`relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border shadow-md ${
                          isTeacher ? 'border-amber-500/50 shadow-amber-500/5' : 'border-slate-800'
                        }`}
                      >
                        <VideoTrack trackRef={trackRef} className="w-full h-full object-cover animate-in fade-in duration-300" />
                        
                        {/* Status name tags */}
                        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-1 border border-white/5 max-w-[85%] truncate">
                          {isTeacher && <span className="text-[7px] bg-amber-500 text-slate-950 font-black px-1 rounded-sm">HOCA</span>}
                          <span className="text-white truncate">{trackRef.participant.name || trackRef.participant.identity}</span>
                        </div>
                      </div>
                    );
                  })}
                  {cameraTracks.length === 0 && (
                    <div className="text-center py-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                      Aktif kamera yok
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // B. LAYOUT: NORMAL GRID OF WEBCAMS
            <div className="w-full h-full flex items-center justify-center p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
                {cameraTracks.map((trackRef) => {
                  const isTeacher = checkIsTeacher(trackRef.participant);
                  return (
                    <div 
                      key={trackRef.publication.trackSid} 
                      className={`relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-xl group hover:scale-[1.01] ${
                        isTeacher 
                          ? 'border-amber-500/50 shadow-lg shadow-amber-500/5 hover:border-amber-500' 
                          : 'border-slate-800 hover:border-emerald-500/30'
                      }`}
                    >
                      <VideoTrack trackRef={trackRef} className="w-full h-full object-cover animate-in fade-in duration-300" />
                      
                      {/* Floating tag inside camera panel */}
                      <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md border border-white/5 flex items-center gap-2">
                        {isTeacher ? (
                          <span className="flex items-center gap-1 text-xs text-amber-400 font-black">
                            <span className="material-symbols-outlined text-xs">star</span>
                            {trackRef.participant.name || trackRef.participant.identity}
                          </span>
                        ) : (
                          <span className="text-slate-200">
                            {trackRef.participant.name || trackRef.participant.identity} {trackRef.participant.identity.includes(localParticipant?.identity) ? '(Sen)' : ''}
                          </span>
                        )}
                      </div>

                      {/* Speaking indicator overlay */}
                      {trackRef.participant.isSpeaking && (
                        <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1 shadow-lg shadow-emerald-500/20 border border-white/20 animate-bounce flex items-center justify-center">
                          <span className="material-symbols-outlined text-xs font-bold">volume_up</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {cameraTracks.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-slate-900/10 rounded-[32px] border border-slate-900/30 max-w-md mx-auto shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4 shadow-inner">
                      <span className="material-symbols-outlined text-3xl">videocam_off</span>
                    </div>
                    <h5 className="font-extrabold text-slate-300 text-sm mb-1.5 tracking-wide">Kameralar Bekleniyor</h5>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-relaxed">
                      Lütfen kameranızı açın. Diğer kullanıcıların kameralarını açmaları bekleniyor.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* C. SIDEBAR: PARTICIPANT DRAWER (GLASSMORPHISM) */}
        {showParticipants && (
          <div className="w-80 h-full bg-slate-900/90 backdrop-blur-lg border-l border-slate-800/80 p-5 flex flex-col gap-4 z-15 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h5 className="font-extrabold text-xs md:text-sm text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <span className="material-symbols-outlined text-base text-emerald-400">group</span>
                Sınıftakiler ({participants.length})
              </h5>
              <button 
                onClick={() => setShowParticipants(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {participants.map((p) => {
                const isTeacher = checkIsTeacher(p);
                return (
                  <div 
                    key={p.sid} 
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                      isTeacher 
                        ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50' 
                        : 'border-slate-850 bg-slate-950/20 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate flex-1 mr-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border ${
                        isTeacher 
                          ? 'bg-amber-500 text-slate-950 border-amber-400' 
                          : 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}>
                        {p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {p.name || p.identity} {p.isLocal ? '(Sen)' : ''}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 block ${
                          isTeacher ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {isTeacher ? 'Öğretmen' : 'Öğrenci'}
                        </span>
                      </div>
                    </div>

                    {/* Mute status icons */}
                    <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                      <span className={`material-symbols-outlined text-base p-1 rounded-lg ${
                        p.isMicrophoneEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {p.isMicrophoneEnabled ? 'mic' : 'mic_off'}
                      </span>
                      <span className={`material-symbols-outlined text-base p-1 rounded-lg ${
                        p.isCameraEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {p.isCameraEnabled ? 'videocam' : 'videocam_off'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Control Bar (Mute, Video, Screen Share, Participants, Leave) */}
      <div className="bg-slate-900/90 backdrop-blur-md py-4.5 px-6 flex items-center justify-between border-t border-slate-800/60 z-10 shadow-lg select-none">
        
        {/* 1. Mic & Cam Toggles */}
        <div className="flex items-center gap-2">
          {/* Audio Button */}
          <button 
            onClick={toggleMicrophone}
            className={`p-3 rounded-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border ${
              isMicrophoneEnabled 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750 hover:scale-102' 
                : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
            }`}
            title={isMicrophoneEnabled ? "Sesi Kapat" : "Sesi Aç"}
          >
            <span className="material-symbols-outlined text-lg">
              {isMicrophoneEnabled ? 'mic' : 'mic_off'}
            </span>
          </button>

          {/* Camera Button */}
          <button 
            onClick={toggleCamera}
            className={`p-3 rounded-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border ${
              isCameraEnabled 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750 hover:scale-102' 
                : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
            }`}
            title={isCameraEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
          >
            <span className="material-symbols-outlined text-lg">
              {isCameraEnabled ? 'videocam' : 'videocam_off'}
            </span>
          </button>
        </div>

        {/* 2. Custom Middle: Participants List Toggle */}
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-102 ${
            showParticipants 
              ? 'bg-slate-100 text-slate-900 border-white font-extrabold' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          <span>Katılımcılar</span>
        </button>

        {/* 3. Action Buttons (Share & Hangup) */}
        <div className="flex items-center gap-3">
          {/* Screen Share Button */}
          <button 
            onClick={toggleScreenShare}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer shadow-md ${
              isScreenShareEnabled 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-emerald-500/10 hover:scale-102' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750 hover:scale-102'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isScreenShareEnabled ? 'stop_screen_share' : 'screen_share'}
            </span>
            {isScreenShareEnabled ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}
          </button>

          {/* Leave Button */}
          <button 
            onClick={handleLeave}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-red-500/20 hover:scale-102"
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
const LiveMeeting = ({ lessonId, role, userName, userId, onClose }) => {
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
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
          participantIdentity: userId,
          role
        });
        
        if (res.data.useFallback) {
          setUseFallback(true);
        } else {
          setToken(res.data.token);
          setServerUrl(res.data.serverUrl);
          setUseFallback(false);
        }
        setLoading(false);
      } catch (err) {
        console.error('LiveKit token fetch failed, falling back to Jitsi:', err);
        setUseFallback(true);
        setLoading(false);
      }
    };

    fetchToken();
  }, [lessonId, userName, userId, role]);

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center gap-4 bg-[#080b11] text-white font-sans overflow-hidden">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-emerald-500/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Sınıf Hazırlanıyor...</p>
      </div>,
      document.body
    );
  }

  // 1. Fallback to Jitsi Meet if LiveKit is not configured or fails
  if (useFallback) {
    const roomName = `lesson_${lessonId}`;
    return createPortal(
      <JitsiFallbackMeeting 
        roomName={roomName}
        userName={userName}
        role={role}
        onClose={onClose}
      />,
      document.body
    );
  }

  // 2. Render Premium LiveKit Room if configured
  return createPortal(
    <LiveKitRoom
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
