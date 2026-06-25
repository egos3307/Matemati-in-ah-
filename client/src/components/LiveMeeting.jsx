import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { 
  LiveKitRoom, 
  useTracks, 
  useLocalParticipant, 
  VideoTrack, 
  useConnectionState,
  useParticipants,
  useMaybeRoomContext,
  RoomAudioRenderer
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
  return participant.identity.includes('Öğretmen') || participant.identity.includes('TEACHER');
};

// 1. JITSI FALLBACK COMPONENT
const JitsiFallbackMeeting = ({ roomName, userName, role, onClose }) => {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const loadJitsi = () => {
      if (!containerRef.current) return;
      if (!window.JitsiMeetExternalAPI) {
        console.warn('Jitsi Meet External API script was not loaded.');
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
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#0b0f19] font-sans text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 object-contain animate-pulse" />
          <div>
            <h4 className="font-bold text-xs md:text-sm text-slate-100">Canlı Ders Odası <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded ml-2">Yedek Sunucu (Jitsi)</span></h4>
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
const MeetingSession = ({ role, userName, lessonId, onClose, onLiveKitError }) => {
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]).filter(
    (track) => track.publication?.kind === 'video' || track.track?.kind === 'video'
  );
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const room = useMaybeRoomContext();

  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, saving
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startScreenRecording = async () => {
    try {
      chunksRef.current = [];
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = screenStream;

      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      let recorder;
      try {
        recorder = new MediaRecorder(screenStream, options);
      } catch (e) {
        recorder = new MediaRecorder(screenStream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingStatus('saving');
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const tokenVal = localStorage.getItem('token');
          const response = await fetch(`/api/teacher/lessons/${lessonId}/upload-recording`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenVal}`,
              'Content-Type': 'video/webm'
            },
            body: blob
          });

          if (!response.ok) {
            throw new Error('Yükleme başarısız oldu.');
          }

          const data = await response.json();
          alert('Ders kaydı başarıyla kaydedildi ve sisteme yüklendi!');
        } catch (err) {
          console.error('Error saving recording:', err);
          alert('Ders kaydı yüklenirken bir hata oluştu: ' + err.message);
        } finally {
          setRecordingStatus('idle');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
        }
      };

      recorder.start(1000);
      setRecordingStatus('recording');

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenRecording();
      };
    } catch (err) {
      console.error('Error starting screen recording:', err);
      alert('Kayıt başlatılamadı: ' + (err.message || err));
      setRecordingStatus('idle');
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const isScreenSharing = screenShareTracks.length > 0;
  const isLocalScreenSharing = isScreenShareEnabled;

  // Custom UI view toggle states
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Device selectors state
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showRecordPrompt, setShowRecordPrompt] = useState(false);

  useEffect(() => {
    if (role === 'TEACHER' && connectionState === ConnectionState.Connected && recordingStatus === 'idle') {
      setShowRecordPrompt(true);
    }
  }, [connectionState, role]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter(d => d.kind === 'videoinput' && d.label));
        setAudioDevices(devices.filter(d => d.kind === 'audioinput' && d.label));
      } catch (err) {
        console.warn("Error loading devices:", err);
      }
    };
    
    if (connectionState === ConnectionState.Connected) {
      loadDevices();
    }
  }, [connectionState]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.device-menu-container')) {
        setShowCameraMenu(false);
        setShowMicMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const selectMicrophone = async (deviceId) => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(false);
      await localParticipant.setMicrophoneEnabled(true, { deviceId });
      setShowMicMenu(false);
    } catch (err) {
      console.error("Failed to select microphone:", err);
    }
  };

  const selectCamera = async (deviceId) => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(false);
      await localParticipant.setCameraEnabled(true, { deviceId });
      setShowCameraMenu(false);
    } catch (err) {
      console.error("Failed to select camera:", err);
    }
  };

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

  // Monitor connection health. If connection hangs or fails, call error handler to fallback
  useEffect(() => {
    if (connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting) {
      const timeout = setTimeout(() => {
        console.warn("LiveKit connection timed out. Activating Jitsi fallback.");
        if (onLiveKitError) onLiveKitError();
      }, 6000); // 6 seconds timeout
      return () => clearTimeout(timeout);
    }
  }, [connectionState, onLiveKitError]);

  // Request media streams gracefully AFTER connecting (prevents startup crash if permission blocked/no camera)
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      const startStreams = async () => {
        try {
          await localParticipant.setMicrophoneEnabled(true);
        } catch (err) {
          console.warn("Could not auto-enable microphone:", err);
          alert(
            "Mikrofon Otomatik Başlatılamadı!\n\n" +
            "Hata: " + (err.name || "Error") + " - " + err.message + "\n\n" +
            "Lütfen adres çubuğunun solundaki kilit simgesinden mikrofon iznini 'İzin Ver' olarak ayarlayın."
          );
        }

        try {
          await localParticipant.setCameraEnabled(true);
        } catch (err) {
          console.warn("Could not auto-enable camera:", err);
          alert(
            "Kamera Otomatik Başlatılamadı!\n\n" +
            "Hata: " + (err.name || "Error") + " - " + err.message + "\n\n" +
            "Lütfen:\n" +
            "1. Adres çubuğundaki kilit simgesinden kamera iznini açın.\n" +
            "2. Kameranın başka bir uygulama tarafından kullanılmadığından emin olun."
          );
        }
      };
      startStreams();
    }
  }, [connectionState, localParticipant]);

  // Picture-in-Picture logic for background screen sharing
  useEffect(() => {
    let animationFrameId;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360; // Standard 16:9 canvas size for dual feed or single feed
    const ctx = canvas.getContext('2d');
    
    const pipVideo = document.createElement('video');
    pipVideo.muted = true;
    pipVideo.playsInline = true;
    pipVideo.style.display = 'none';
    document.body.appendChild(pipVideo);

    const drawFrame = () => {
      // Clear canvas with dark slate background matching app theme
      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Find video elements in the DOM for camera tracks (webcams only)
      const videoElements = document.querySelectorAll('video');
      const cameraVideos = [];
      videoElements.forEach(v => {
        if (v !== pipVideo && (v.srcObject || v.readyState >= 2)) {
          // Identify webcam feeds by looking for 'object-cover' class
          if (v.className.includes('object-cover')) {
            cameraVideos.push(v);
          }
        }
      });

      if (cameraVideos.length > 0) {
        if (cameraVideos.length === 1) {
          // 1 video: draw centered (keeping aspect ratio)
          ctx.drawImage(cameraVideos[0], 80, 0, 480, 360);
        } else {
          // 2 videos: draw side-by-side
          ctx.drawImage(cameraVideos[0], 0, 60, 320, 240);
          ctx.drawImage(cameraVideos[1], 320, 60, 320, 240);
        }
      } else {
        // Draw placeholder text if no active webcam is found
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Kameralar Bekleniyor...', canvas.width / 2, canvas.height / 2);
      }

      animationFrameId = requestAnimationFrame(drawFrame);
    };

    const handleVisibilityChange = async () => {
      // Only enter PiP if screen share is currently active (meaning the user is sharing screen/presenting)
      if (!isScreenSharing) return;

      if (document.visibilityState === 'hidden') {
        try {
          drawFrame();
          const stream = canvas.captureStream(15); // 15 fps
          pipVideo.srcObject = stream;
          await pipVideo.play();
          if (document.pictureInPictureEnabled) {
            await pipVideo.requestPictureInPicture();
            console.log('Entered PiP stream successfully');
          }
        } catch (err) {
          console.warn('Failed to enter PiP:', err);
        }
      } else {
        if (document.pictureInPictureElement) {
          try {
            await document.exitPictureInPicture();
          } catch (err) {
            console.warn('Failed to exit PiP:', err);
          }
        }
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        if (pipVideo.srcObject) {
          pipVideo.srcObject.getTracks().forEach(track => track.stop());
          pipVideo.srcObject = null;
        }
      }
    };

    const handleLeavePiP = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (pipVideo.srcObject) {
        pipVideo.srcObject.getTracks().forEach(track => track.stop());
        pipVideo.srcObject = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    pipVideo.addEventListener('leavepictureinpicture', handleLeavePiP);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pipVideo.removeEventListener('leavepictureinpicture', handleLeavePiP);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (pipVideo.srcObject) {
        pipVideo.srcObject.getTracks().forEach(track => track.stop());
      }
      if (pipVideo.parentNode) {
        pipVideo.parentNode.removeChild(pipVideo);
      }
    };
  }, [isScreenSharing]);


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
      alert(
        "Mikrofon Başlatılamadı!\n\n" +
        "Hata: " + (err.name || "Error") + " - " + err.message + "\n\n" +
        "Lütfen tarayıcının adres satırındaki kilit (güvenlik) simgesine tıklayarak mikrofon izninin 'İzin Ver' (Allow) olarak ayarlandığından emin olun."
      );
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (err) {
      console.error("Camera toggle failed:", err);
      alert(
        "Kamera Başlatılamadı!\n\n" +
        "Hata: " + (err.name || "Error") + " - " + err.message + "\n\n" +
        "Lütfen şunları kontrol edin:\n" +
        "1. Tarayıcının adres satırındaki kilit simgesine tıklayarak kamera iznini açın.\n" +
        "2. Kameranın başka bir uygulama (Zoom, Teams vb.) veya başka bir tarayıcı sekmesi tarafından kullanılmadığından emin olun.\n" +
        "3. macOS (Macbook) kullanıyorsanız: 'Sistem Ayarları' -> 'Gizlilik ve Güvenlik' -> 'Kamera' kısmından tarayıcınıza izin verildiğini kontrol edin."
      );
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant) return;

    // Check if the browser supports screen sharing API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert(
        "Ekran Paylaşımı Desteklenmiyor!\n\n" +
        "Bu durumun iki nedeni olabilir:\n" +
        "1. Telefon veya tablet (iOS/Android) kullanıyorsunuz: Mobil tarayıcılar ekran paylaşımını teknik olarak desteklemez. Lütfen bilgisayardan bağlanın.\n" +
        "2. Güvenli olmayan bir bağlantı (HTTP) kullanıyorsunuz: Ekran paylaşımı için sitenin adresi 'https://' ile başlamalıdır."
      );
      return;
    }

    try {
      // Toggle screen share dynamically reading direct state to bypass state delay
      const isCurrentlySharing = localParticipant.isScreenShareEnabled;
      await localParticipant.setScreenShareEnabled(!isCurrentlySharing);
    } catch (err) {
      console.error("Screen share toggle failed:", err);
      
      const errorMsg = String(err.message || err).toLowerCase();
      if (err.name === 'NotAllowedError' || errorMsg.includes('permission denied') || errorMsg.includes('not allowed')) {
        alert(
          "Ekran Paylaşımı İzni Engellendi veya İptal Edildi!\n\n" +
          "Lütfen şunları kontrol edin:\n" +
          "1. Ekran seçme penceresi geldiğinde 'İptal'e basmış veya pencereyi kapatmış olabilirsiniz. Tekrar deneyip ekranınızı seçerek 'Paylaş'a tıklayın.\n" +
          "2. macOS (Macbook) kullanıyorsanız: 'Sistem Ayarları' -> 'Gizlilik ve Güvenlik' -> 'Ekran Kaydı' (Screen Recording) kısmında tarayıcınızın (Chrome, Safari vb.) izninin açık olduğünden emin olun."
        );
      } else {
        alert(
          `Ekran paylaşımı başlatılamadı: ${err.message || err}\n\n` +
          "Lütfen tarayıcınızı güncelleyin veya Google Chrome/Microsoft Edge ile tekrar deneyin."
        );
      }
    }
  };

  const handleLeave = async () => {
    if (recordingStatus === 'saving') {
      alert('Ders kaydı şu anda sisteme yükleniyor, lütfen birkaç saniye bekleyin.');
      return;
    }
    if (recordingStatus === 'recording') {
      if (confirm('Ders kaydı devam ediyor. Kaydı sonlandırıp sisteme kaydetmek istiyor musunuz?')) {
        stopScreenRecording();
        alert('Kayıt durduruldu ve yükleme başladı. Lütfen yükleme tamamlandı uyarısı gelene kadar odadan ayrılmayın.');
        return;
      }
    }

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch (err) {
      console.warn(err);
    }
    if (room) {
      try {
        await room.disconnect();
      } catch (err) {
        console.warn("Room disconnect failed:", err);
      }
    }
    if (onClose) {
      onClose();
    }
  };

  // Render loading state if connection is not ready
  if (connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 bg-[#080b11] text-white font-sans overflow-hidden">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-primary/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          {connectionState === ConnectionState.Connecting ? 'Sınıf Sunucusuna Bağlanılıyor...' : 'Yeniden Bağlanılıyor...'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-[#080b11] font-sans text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900/80 backdrop-blur-md px-5 py-3.5 flex items-center justify-between border-b border-slate-800/50 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex items-center justify-center bg-slate-950 rounded-xl p-1 shadow-inner border border-slate-850">
            <img src="/logo.png" alt="Fullematematik Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-xs md:text-sm text-slate-100 tracking-wide">Canlı Ders Odası</h4>
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black tracking-wider ml-1">
                Sunucu: LiveKit ({connectionState}) | Kamera: {cameraTracks.length}
              </span>
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
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20 uppercase tracking-wider">
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
                    <span className="material-symbols-outlined text-[12px] text-primary">group</span>
                    Katılımcılar
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-slate-500">drag_indicator</span>
                </div>
                
                {/* Videos */}
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto no-drag pr-0.5">
                  {cameraTracks.map((trackRef) => {
                    const isTeacher = checkIsTeacher(trackRef.participant);
                    const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${trackRef.participant.identity}_${trackRef.source}`;
                    return (
                      <div 
                        key={trackKey} 
                        className={`relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border shadow-md ${
                          isTeacher ? 'border-primary/50 shadow-primary/5' : 'border-slate-800'
                        }`}
                      >
                        <VideoTrack trackRef={trackRef} className="w-full h-full object-cover animate-in fade-in duration-300" />
                        
                        {/* Status name tags */}
                        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-1 border border-white/5 max-w-[85%] truncate">
                          {isTeacher && <span className="text-[7px] bg-primary text-slate-950 font-black px-1 rounded-sm">HOCA</span>}
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
                  const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${trackRef.participant.identity}_${trackRef.source}`;
                  return (
                    <div 
                      key={trackKey} 
                      className={`relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-xl group hover:scale-[1.01] ${
                        isTeacher 
                          ? 'border-primary/50 shadow-lg shadow-primary/5 hover:border-primary' 
                          : 'border-slate-800 hover:border-primary/30'
                      }`}
                    >
                      <VideoTrack trackRef={trackRef} className="w-full h-full object-cover animate-in fade-in duration-300" />
                      
                      {/* Floating tag inside camera panel */}
                      <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md border border-white/5 flex items-center gap-2">
                        {isTeacher ? (
                          <span className="flex items-center gap-1 text-xs text-primary font-black">
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
                        <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1 shadow-lg shadow-primary/20 border border-white/20 animate-bounce flex items-center justify-center">
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
                <span className="material-symbols-outlined text-base text-primary">group</span>
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
                        ? 'border-primary/30 bg-primary/5 hover:border-primary/50' 
                        : 'border-slate-850 bg-slate-950/20 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate flex-1 mr-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border ${
                        isTeacher 
                          ? 'bg-primary text-slate-950 border-primary/20' 
                          : 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}>
                        {p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {p.name || p.identity} {p.isLocal ? '(Sen)' : ''}
                        </p>
                        <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 block ${
                          isTeacher ? 'text-primary' : 'text-slate-400'
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
      <div className="bg-slate-900/90 backdrop-blur-md py-3 px-4 sm:px-6 flex items-center justify-between border-t border-slate-800/60 z-10 shadow-lg select-none">
        
        {/* 1. Mic & Cam Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Button Group */}
          <div className="relative flex items-center gap-0.5 device-menu-container">
            <button 
              onClick={toggleMicrophone}
              className={`p-2.5 sm:p-3 rounded-l-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border-y border-l ${
                isMicrophoneEnabled 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750' 
                  : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
              }`}
              title={isMicrophoneEnabled ? "Sesi Kapat" : "Sesi Aç"}
            >
              <span className="material-symbols-outlined text-base sm:text-lg">
                {isMicrophoneEnabled ? 'mic' : 'mic_off'}
              </span>
            </button>
            <button
              onClick={() => setShowMicMenu(!showMicMenu)}
              className={`p-2.5 sm:p-3 rounded-r-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border-y border-r ${
                isMicrophoneEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-750'
                  : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
              }`}
              title="Mikrofon Seç"
            >
              <span className="material-symbols-outlined text-[10px] sm:text-xs">
                keyboard_arrow_up
              </span>
            </button>

            {showMicMenu && audioDevices.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-[999999] animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-2 py-0.5 text-[8px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-1">
                  Mikrofonlar
                </div>
                <div className="flex flex-col max-h-40 overflow-y-auto">
                  {audioDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => selectMicrophone(device.deviceId)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] sm:text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold truncate"
                    >
                      {device.label || `Mikrofon ${device.deviceId.substring(0, 4)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Camera Button Group */}
          <div className="relative flex items-center gap-0.5 device-menu-container">
            <button 
              onClick={toggleCamera}
              className={`p-2.5 sm:p-3 rounded-l-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border-y border-l ${
                isCameraEnabled 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750' 
                  : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
              }`}
              title={isCameraEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
            >
              <span className="material-symbols-outlined text-base sm:text-lg">
                {isCameraEnabled ? 'videocam' : 'videocam_off'}
              </span>
            </button>
            <button
              onClick={() => setShowCameraMenu(!showCameraMenu)}
              className={`p-2.5 sm:p-3 rounded-r-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border-y border-r ${
                isCameraEnabled
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-750'
                  : 'bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25'
              }`}
              title="Kamera Seç"
            >
              <span className="material-symbols-outlined text-[10px] sm:text-xs">
                keyboard_arrow_up
              </span>
            </button>

            {showCameraMenu && videoDevices.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-[999999] animate-in fade-in slide-in-from-bottom-1 duration-150">
                <div className="px-2 py-0.5 text-[8px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-1">
                  Kameralar
                </div>
                <div className="flex flex-col max-h-40 overflow-y-auto">
                  {videoDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => selectCamera(device.deviceId)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] sm:text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-semibold truncate"
                    >
                      {device.label || `Kamera ${device.deviceId.substring(0, 4)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Custom Middle: Participants List Toggle */}
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102 ${
            showParticipants 
              ? 'bg-slate-100 text-slate-900 border-white font-extrabold' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
          }`}
        >
          <span className="material-symbols-outlined text-base">group</span>
          <span className="hidden sm:inline">Katılımcılar</span>
        </button>

        {/* 3. Action Buttons (Share & Hangup) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Teacher Recording Controls */}
          {role === 'TEACHER' && (
            <button
              onClick={recordingStatus === 'recording' ? stopScreenRecording : startScreenRecording}
              disabled={recordingStatus === 'saving'}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow-md ${
                recordingStatus === 'recording'
                  ? 'bg-red-650 hover:bg-red-750 text-white border-red-700 animate-pulse'
                  : recordingStatus === 'saving'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {recordingStatus === 'recording' ? 'stop' : recordingStatus === 'saving' ? 'sync' : 'fiber_manual_record'}
              </span>
              <span className="hidden md:inline">
                {recordingStatus === 'recording' ? 'Kaydı Durdur' : recordingStatus === 'saving' ? 'Kaydediliyor...' : 'Dersi Kaydet'}
              </span>
            </button>
          )}

          {/* Screen Share Button */}
          <button 
            onClick={toggleScreenShare}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow-md ${
              isLocalScreenSharing 
                ? 'bg-primary hover:bg-primary/95 text-white border-primary shadow-primary/10 hover:scale-102' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750 hover:scale-102'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isLocalScreenSharing ? 'stop_screen_share' : 'screen_share'}
            </span>
            <span className="hidden md:inline">{isLocalScreenSharing ? 'Paylaşımı Durdur' : 'Ekran Paylaş'}</span>
          </button>

          {/* Leave Button */}
          <button 
            onClick={handleLeave}
            className="bg-red-600 hover:bg-red-750 text-white px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/20 hover:scale-102"
          >
            <span className="material-symbols-outlined text-base">call_end</span>
            <span className="hidden sm:inline">Ayrıl</span>
          </button>
        </div>
      </div>
      
      {/* Play incoming audio streams from other participants */}
      <RoomAudioRenderer />

      {/* Record Prompt Modal */}
      {showRecordPrompt && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <span className="material-symbols-outlined text-4xl">fiber_manual_record</span>
            </div>
            <h3 className="font-black text-slate-100 text-lg">Ders Kaydını Başlatın</h3>
            <p className="text-xs text-slate-405 leading-relaxed">
              Öğrencilerin bu dersi daha sonra izleyebilmesi için ders kaydını başlatmanız gerekmektedir. Kayıt otomatik olarak bizim sunucumuza kaydedilecektir.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowRecordPrompt(false);
                  startScreenRecording();
                }}
                className="bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-primary/20 transition-all cursor-pointer"
              >
                Kaydı Başlat ve Derse Dön
              </button>
              <button
                onClick={() => setShowRecordPrompt(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-350 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Daha Sonra Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main LiveMeeting Wrapper
const LiveMeeting = ({ lessonId, role, userName, userId, onClose }) => {
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLeavingRef = useRef(false);

  // Pre-flight check: Trigger browser camera and microphone permissions prompt first
  useEffect(() => {
    const requestPermissionsFirst = async () => {
      try {
        let hasVideo = false;
        let hasAudio = false;
        
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          hasVideo = devices.some(d => d.kind === 'videoinput');
          hasAudio = devices.some(d => d.kind === 'audioinput');
        } else {
          hasVideo = true;
          hasAudio = true;
        }

        const constraints = {
          audio: hasAudio,
          video: hasVideo
        };

        if (constraints.audio || constraints.video) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn("Pre-flight media capture failed:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert(
            "Kamera ve Mikrofon İzni Engellendi!\n\n" +
            "Canlı derse katılabilmek için tarayıcınızdan kamera ve mikrofon erişimine izin vermelisiniz.\n" +
            "Lütfen adres çubuğunun solundaki kilit simgesine tıklayıp izinleri açın ve sayfayı yenileyin."
          );
        }
      }
    };
    
    requestPermissionsFirst();
  }, []);

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
          const cleanServerUrl = (res.data.serverUrl || '').replace(/\/$/, '').trim();
          setServerUrl(cleanServerUrl);
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

  const handleClose = () => {
    isLeavingRef.current = true;
    if (onClose) onClose();
  };

  const handleLiveKitError = () => {
    if (isLeavingRef.current) return;
    console.warn("LiveKit failed, switching to Jitsi fallback.");
    setUseFallback(true);
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 bg-[#080b11] text-white font-sans overflow-hidden">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-primary/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        onClose={handleClose}
      />,
      document.body
    );
  }

  // 2. Render Premium LiveKit Room if configured
  return createPortal(
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      onDisconnected={handleLiveKitError} // Auto-fallback if network drops or connection fails during room
      onError={(err) => {
        console.error("LiveKit connection error:", err);
        alert(`LiveKit Bağlantı Hatası:\n${err.message}\n\nYedek sunucu moduna geçiş yapılıyor.`);
        handleLiveKitError();
      }}
      connectOptions={{ autoSubscribe: true }}
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 overflow-hidden"
    >
      <MeetingSession 
        role={role} 
        userName={userName} 
        lessonId={lessonId}
        onClose={handleClose} 
        onLiveKitError={handleLiveKitError} // Auto-fallback if initial connection handshake hangs
      />
    </LiveKitRoom>,
    document.body
  );
};

export default LiveMeeting;
