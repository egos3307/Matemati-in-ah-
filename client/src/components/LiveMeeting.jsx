import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import fixWebmDuration from '../utils/fixWebmDuration.js';
import { 
  LiveKitRoom, 
  useTracks, 
  useLocalParticipant, 
  VideoTrack, 
  useConnectionState,
  useParticipants,
  useMaybeRoomContext,
  RoomAudioRenderer,
  useDataChannel
} from '@livekit/components-react';
import { Track, ConnectionState, LocalVideoTrack } from 'livekit-client';
import '@livekit/components-styles';

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

// ---------------------------------------------------------------------------
// Gelişmiş kişi tespiti: sadece öndeki (kameraya bakan) kişiyi tutar.
//
// Strateji:
//  1. Yüksek threshold (0.55) ile gürültülü / düşük-confidence pikselleri
//     (ör. arka plandaki tişörtler) baştan siler.
//  2. 4-bağlantılı union-find ile bağlı bileşenleri bulur.
//  3. Her bileşeni "büyüklük × merkeze yakınlık" skoru ile değerlendirir.
//     Kameraya bakan kişi tipik olarak görüntünün orta-alt bölgesinde olur.
//  4. Temporal smoothing: bir önceki karede seçilen bileşenin piksel
//     merkezine en yakın bileşeni tercih eder (ani atlamaları engeller).
//  5. Seçilmeyen bileşenlerin piksellerini sıfırlar (arka plan yapar).
// ---------------------------------------------------------------------------
const _bgState = { prevCx: -1, prevCy: -1 }; // frame'ler arası durum

const suppressSecondaryPeople = (md, w, h, parent) => {
  const n = w * h;
  // Yüksek eşik: sadece model gerçekten emin olduğu pikselleri "kişi" say.
  // 140 ≈ 0.55*255. Tişört gibi nesneler genellikle 0.3-0.5 arasında kalır.
  const threshold = 140;
  const isPerson = (idx) => md[idx * 4] >= threshold;

  // Union-Find başlat
  for (let i = 0; i < n; i++) parent[i] = i;

  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  // Bağlı bileşenler
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      if (!isPerson(idx)) continue;
      if (x > 0 && isPerson(idx - 1)) union(idx, idx - 1);
      if (y > 0 && isPerson(idx - w)) union(idx, idx - w);
    }
  }

  // Her bileşenin alan + ağırlıklı centroid'ini hesapla
  const compData = new Map(); // root -> { area, sumX, sumY }
  for (let i = 0; i < n; i++) {
    if (!isPerson(i)) continue;
    const root = find(i);
    const cx = i % w;
    const cy = (i / w) | 0;
    if (!compData.has(root)) compData.set(root, { area: 0, sumX: 0, sumY: 0 });
    const d = compData.get(root);
    d.area++;
    d.sumX += cx;
    d.sumY += cy;
  }

  if (compData.size === 0) return; // hiç kişi yok
  if (compData.size === 1) return; // tek bileşen — yapacak bir şey yok

  // Küçük gürültü bileşenlerini hemen ele: toplam kişi pikselinin %3'ünden
  // küçük bileşenleri dikkate alma
  let totalPersonPx = 0;
  for (const { area } of compData.values()) totalPersonPx += area;
  const minArea = Math.max(200, totalPersonPx * 0.03);

  // Merkez referans noktası: görüntünün yatay ortası, dikey %70'i
  // (kameraya bakan kişi genellikle burada olur)
  const refX = w * 0.5;
  const refY = h * 0.70;

  let bestRoot = -1;
  let bestScore = -Infinity;

  for (const [root, d] of compData) {
    if (d.area < minArea) continue;
    const cx = d.sumX / d.area;
    const cy = d.sumY / d.area;

    // Normalizasyon: maksimum mesafe köşegen
    const diag = Math.sqrt(w * w + h * h);

    // Temporal bonus: önceki karede bulduğumuz centroide yakınlık
    let temporalBonus = 0;
    if (_bgState.prevCx >= 0) {
      const prevDist = Math.sqrt((cx - _bgState.prevCx) ** 2 + (cy - _bgState.prevCy) ** 2);
      // Öncekine çok yakınsa güçlü bonus (ani atlamaları engelle)
      temporalBonus = Math.max(0, 1 - prevDist / (diag * 0.4)) * 1.5;
    }

    // Merkeze yakınlık skoru (0-1)
    const centerDist = Math.sqrt((cx - refX) ** 2 + (cy - refY) ** 2);
    const centerScore = 1 - centerDist / diag;

    // Büyüklük skoru (normalize)
    const sizeScore = d.area / totalPersonPx;

    // Nihai skor: büyüklük 50% + merkez 30% + temporal 20%
    const score = sizeScore * 0.50 + centerScore * 0.30 + temporalBonus * 0.20;

    if (score > bestScore) {
      bestScore = score;
      bestRoot = root;
    }
  }

  if (bestRoot === -1) {
    // Hepsi küçük bileşen — en büyüğünü seç
    let biggestArea = 0;
    for (const [root, d] of compData) {
      if (d.area > biggestArea) { biggestArea = d.area; bestRoot = root; }
    }
  }

  // Seçilen bileşenin centroid'ini bir sonraki frame için kaydet
  if (bestRoot !== -1 && compData.has(bestRoot)) {
    const d = compData.get(bestRoot);
    _bgState.prevCx = d.sumX / d.area;
    _bgState.prevCy = d.sumY / d.area;
  }

  // Seçilmeyenleri sıfırla
  for (let i = 0; i < n; i++) {
    if (!isPerson(i)) continue;
    if (find(i) !== bestRoot) {
      const p = i * 4;
      md[p] = 0;
      md[p + 1] = 0;
      md[p + 2] = 0;
    }
  }
};

// WHITEBOARD COMPONENT
const Whiteboard = ({ role, whiteboardCanvasRef }) => {
  const isTeacher = role === 'TEACHER';
  const canvasElRef = useRef(null);
  const [color, setColor] = useState('#ff0000'); // Default to red
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const drawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const { send } = useDataChannel('whiteboard');

  useEffect(() => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    whiteboardCanvasRef.current = canvas;
    
    // Set fixed resolution
    canvas.width = 1280;
    canvas.height = 720;
    
    // Setup default styles
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [whiteboardCanvasRef]);

  const getCoordinates = (e) => {
    const canvas = canvasElRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    // Touch support
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    if (!isTeacher) return;
    const pos = getCoordinates(e);
    if (!pos) return;
    drawingRef.current = true;
    lastPosRef.current = pos;
  };

  const draw = (e) => {
    if (!drawingRef.current || !isTeacher) return;
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentPos = getCoordinates(e);
    if (!currentPos) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x * canvas.width, lastPosRef.current.y * canvas.height);
    ctx.lineTo(currentPos.x * canvas.width, currentPos.y * canvas.height);
    ctx.stroke();

    // Publish to LiveKit
    const packet = {
      type: 'draw',
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: currentPos.x,
      y1: currentPos.y,
      color,
      size: penSize,
      isEraser
    };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(packet));
    send(data, { reliable: true });

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasElRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const packet = { type: 'clear' };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(packet));
    send(data, { reliable: true });
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl overflow-hidden relative border border-slate-200 shadow-2xl">
      {/* Draw Tools Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 select-none animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-800 font-bold">edit_note</span>
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Matematik Beyaz Tahta</span>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Color options */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-sm">
              {['#000000', '#ff0000', '#0000ff', '#008000', '#eab308'].map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setIsEraser(false); }}
                  className={`w-6 h-6 rounded-full border transition-all hover:scale-110 cursor-pointer ${
                    color === c && !isEraser ? 'scale-110 ring-2 ring-primary ring-offset-1 border-transparent' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Eraser */}
            <button
              onClick={() => setIsEraser(!isEraser)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isEraser 
                  ? 'bg-primary text-white border-primary shadow-md' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Silgi"
            >
              <span className="material-symbols-outlined text-base">auto_eraser</span>
            </button>

            {/* Thick / thin slider */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-slate-400 text-sm">line_weight</span>
              <input
                type="range"
                min="1"
                max="15"
                value={penSize}
                onChange={(e) => setPenSize(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Clear button */}
            <button
              onClick={clearCanvas}
              className="bg-white hover:bg-red-50 hover:text-red-600 text-slate-700 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-xs">delete</span>
              Temizle
            </button>
          </div>
        )}
      </div>

      {/* Drawing Area */}
      <div className="flex-1 bg-white relative cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasElRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
    </div>
  );
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
  const micTracks = useTracks([Track.Source.Microphone]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]).filter(
    (track) => track.publication?.kind === 'video' || track.track?.kind === 'video'
  );
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const isTeacherRole = role === 'TEACHER' || role === 'HEAD_TEACHER';

  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, saving
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const showWhiteboardRef = useRef(false);
  const whiteboardCanvasRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const [mutingParticipant, setMutingParticipant] = useState(null);

  // Live chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const showChatRef = useRef(false);
  const chatEndRef = useRef(null);

  const muteParticipantTrack = async (participant, trackType) => {
    const tracks = trackType === 'audio' ? micTracks : cameraTracks;
    const trackRef = tracks.find(t => t.participant.identity === participant.identity);
    const trackSid = trackRef?.publication?.trackSid;
    if (!trackSid) return;

    const key = `${participant.identity}_${trackType}`;
    setMutingParticipant(key);
    try {
      await axios.post('/api/livekit/mute-participant', {
        roomName: `lesson_${lessonId}`,
        participantIdentity: participant.identity,
        trackSid,
        muted: true,
      });
    } catch (err) {
      console.error('Mute failed:', err);
    } finally {
      setMutingParticipant(null);
    }
  };

  useEffect(() => {
    showWhiteboardRef.current = showWhiteboard;
  }, [showWhiteboard]);

  // Handle incoming LiveKit data channel messages (Whiteboard sync)
  const { send } = useDataChannel('whiteboard', (msg) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(text);
      console.log("Incoming whiteboard data packet:", data);
      
      if (data.type === 'toggle_whiteboard') {
        console.log("Toggling whiteboard display to:", data.visible);
        setShowWhiteboard(data.visible);
      } else if (data.type === 'draw') {
        const canvas = whiteboardCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (data.isEraser) {
              ctx.globalCompositeOperation = 'destination-out';
            } else {
              ctx.globalCompositeOperation = 'source-over';
            }
            
            ctx.beginPath();
            ctx.moveTo(data.x0 * canvas.width, data.y0 * canvas.height);
            ctx.lineTo(data.x1 * canvas.width, data.y1 * canvas.height);
            ctx.stroke();
          }
        }
      } else if (data.type === 'clear') {
        const canvas = whiteboardCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    } catch (err) {
      console.error("Failed to parse data message:", err);
    }
  });

  // Handle incoming LiveKit data channel messages (Live chat)
  const { send: sendChatData } = useDataChannel('chat', (msg) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const packet = JSON.parse(text);
      setChatMessages((prev) => [...prev, packet]);
      if (!showChatRef.current) {
        setHasUnreadChat(true);
      }
    } catch (err) {
      console.error("Failed to parse chat message:", err);
    }
  });

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || !localParticipant) return;

    const packet = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderIdentity: localParticipant.identity,
      senderName: userName,
      senderRole: role,
      text,
      time: Date.now(),
    };

    const encoder = new TextEncoder();
    sendChatData(encoder.encode(JSON.stringify(packet)), { reliable: true });
    // LiveKit veri kanalı mesajı gönderene geri yansıtmaz, o yüzden kendi mesajımızı elle ekliyoruz
    setChatMessages((prev) => [...prev, packet]);
    setChatInput('');
  };

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const backupIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestinationRef = useRef(null);
  const connectedTrackIdsRef = useRef(new Set());
  const [uploadProgress, setUploadProgress] = useState(0);

  // Virtual background
  const [virtualBgEnabled, setVirtualBgEnabled] = useState(false);
  const [virtualBgColor, setVirtualBgColor] = useState('#f97316');
  const [showVirtualBgMenu, setShowVirtualBgMenu] = useState(false);
  const [virtualBgLoading, setVirtualBgLoading] = useState(false);
  const virtualBgEnabledRef = useRef(false);
  const virtualSegmenterRef = useRef(null);
  const virtualBgCanvasRef = useRef(null);
  const virtualMaskCanvasRef = useRef(null);
  const virtualRawVideoRef = useRef(null);
  const virtualBgFrameRef = useRef(null);
  const virtualBgLKTrackRef = useRef(null);
  const virtualCCParentRef = useRef(null);

  // Clean up recording context when component unmounts
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
      cleanupVirtualBg();
    };
  }, []);

  // Sync virtual bg enabled ref with state
  useEffect(() => {
    virtualBgEnabledRef.current = virtualBgEnabled;
  }, [virtualBgEnabled]);

  const cleanupVirtualBg = () => {
    if (virtualBgFrameRef.current) {
      cancelAnimationFrame(virtualBgFrameRef.current);
      virtualBgFrameRef.current = null;
    }
    if (virtualSegmenterRef.current) {
      try { virtualSegmenterRef.current.close(); } catch (e) {}
      virtualSegmenterRef.current = null;
    }
    if (virtualRawVideoRef.current) {
      virtualRawVideoRef.current.srcObject = null;
      virtualRawVideoRef.current = null;
    }
    virtualBgCanvasRef.current = null;
    virtualMaskCanvasRef.current = null;
    virtualCCParentRef.current = null;
    // Temporal smoothing state'ini sıfırla
    _bgState.prevCx = -1;
    _bgState.prevCy = -1;
  };

  const enableVirtualBackground = async (color) => {
    if (!localParticipant) return;
    if (!window.SelfieSegmentation) {
      alert('Sanal arka plan modeli henüz yüklenmedi. Lütfen birkaç saniye bekleyip tekrar deneyin.');
      return;
    }
    if (!isCameraEnabled) {
      alert('Sanal arka plan için önce kameranızı açın.');
      return;
    }

    setVirtualBgLoading(true);
    setShowVirtualBgMenu(false);

    try {
      const cameraPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (!cameraPub?.track?.mediaStreamTrack) {
        alert('Kamera track\'i bulunamadı. Lütfen kamerayı tekrar açıp deneyin.');
        setVirtualBgLoading(false);
        return;
      }

      // Clone track BEFORE unpublishing — unpublishTrack stops the original
      const rawTrack = cameraPub.track.mediaStreamTrack.clone();

      // Video element for raw camera feed
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = new MediaStream([rawTrack]);
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => { video.play().then(resolve).catch(reject); };
        video.onerror = reject;
      });
      virtualRawVideoRef.current = video;

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;

      // Main output canvas
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      // willReadFrequently = keep in CPU memory for fast getImageData
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      virtualBgCanvasRef.current = canvas;

      // Temp canvas for reading mask pixel data
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      virtualMaskCanvasRef.current = maskCanvas;

      // Bağlı bileşen analizinde tekrar tekrar kullanılacak union-find dizisi
      virtualCCParentRef.current = new Int32Array(w * h);

      // Pre-parse background color into R,G,B components
      const hex = color.replace('#', '');
      const bgR = parseInt(hex.substring(0, 2), 16);
      const bgG = parseInt(hex.substring(2, 4), 16);
      const bgB = parseInt(hex.substring(4, 6), 16);

      // MediaPipe Selfie Segmentation
      const segmenter = new window.SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      segmenter.setOptions({ modelSelection: 1 });
      virtualSegmenterRef.current = segmenter;

      segmenter.onResults((results) => {
        if (!results.segmentationMask) return;

        // Temiz frame: doğrudan video elementinden çek
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(video, 0, 0, w, h);
        const frameData = ctx.getImageData(0, 0, w, h);

        // ── ADIM 1: Ham maskeyi oku (blur YOK) — CC analizi için net sınır lazım ──
        maskCtx.clearRect(0, 0, w, h);
        maskCtx.filter = 'none';
        maskCtx.drawImage(results.segmentationMask, 0, 0, w, h);
        const rawMaskData = maskCtx.getImageData(0, 0, w, h);

        // ── ADIM 2: Ham maskede CC analizi — öndeki kişiyi seç, diğerlerini sil ──
        if (virtualCCParentRef.current) {
          suppressSecondaryPeople(rawMaskData.data, w, h, virtualCCParentRef.current);
        }

        // ── ADIM 3: Temizlenmiş ham maskeyi geri yaz, sonra blur uygula ──
        // Böylece blur sadece seçilen kişinin kenarlarını yumuşatır;
        // silinmiş bileşenler blura dahil olmaz.
        maskCtx.putImageData(rawMaskData, 0, 0);
        maskCtx.filter = 'blur(4px)'; // daha az blur → daha sıkı kenar
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';
        const maskData = maskCtx.getImageData(0, 0, w, h);

        const fd = frameData.data;
        const md = maskData.data;

        // ── ADIM 4: Piksel harmanlama ──
        // Eşikler daraltıldı: < 0.25 tam arka plan, > 0.75 tam kişi
        // Aradaki dar bant (~50px genişlik) yumuşak kenar geçişi için
        for (let i = 0; i < fd.length; i += 4) {
          const confidence = md[i] / 255;

          if (confidence < 0.25) {
            // Tam arka plan → düz renk
            fd[i]     = bgR;
            fd[i + 1] = bgG;
            fd[i + 2] = bgB;
            fd[i + 3] = 255;
          } else if (confidence < 0.75) {
            // Dar kenar geçiş bandı → lineer harman
            const t = (confidence - 0.25) / 0.50;
            fd[i]     = Math.round(fd[i]     * t + bgR * (1 - t));
            fd[i + 1] = Math.round(fd[i + 1] * t + bgG * (1 - t));
            fd[i + 2] = Math.round(fd[i + 2] * t + bgB * (1 - t));
            fd[i + 3] = 255;
          }
          // confidence >= 0.75 → tam kişi, orijinal piksel kalır
        }

        ctx.putImageData(frameData, 0, 0);
      });

      // Draw first real frame to canvas so stream starts with video, not black
      ctx.drawImage(video, 0, 0, w, h);

      // Capture canvas stream before starting the loop
      const canvasStream = canvas.captureStream(30);
      const processedVideoTrack = canvasStream.getVideoTracks()[0];

      // Ref'i loop başlamadan true yap — yoksa ilk iterasyonda hemen çıkıyor
      virtualBgEnabledRef.current = true;

      // Start segmentation loop
      const runFrame = async () => {
        if (!virtualBgEnabledRef.current) return;
        if (video.readyState >= 2) {
          try { await segmenter.send({ image: video }); } catch (e) { /* skip frame */ }
        }
        virtualBgFrameRef.current = requestAnimationFrame(runFrame);
      };
      runFrame();

      // Replace camera track in LiveKit
      // stopOnUnpublish=false → orijinal track'i durdurma (clone'u etkilemez ama güvenli)
      await localParticipant.unpublishTrack(cameraPub.track, false);
      const livekitTrack = new LocalVideoTrack(processedVideoTrack, undefined, true);
      await localParticipant.publishTrack(livekitTrack, { source: Track.Source.Camera });
      virtualBgLKTrackRef.current = livekitTrack;

      setVirtualBgColor(color);
      setVirtualBgEnabled(true);
    } catch (err) {
      console.error('Sanal arka plan hatası:', err);
      cleanupVirtualBg();
      await localParticipant.setCameraEnabled(true).catch(() => {});
      alert('Sanal arka plan başlatılamadı: ' + (err.message || err));
    } finally {
      setVirtualBgLoading(false);
    }
  };

  const disableVirtualBackground = async () => {
    setVirtualBgLoading(true);
    try {
      // Stop frame loop
      if (virtualBgFrameRef.current) {
        cancelAnimationFrame(virtualBgFrameRef.current);
        virtualBgFrameRef.current = null;
      }

      // Unpublish virtual bg track
      if (virtualBgLKTrackRef.current) {
        try { await localParticipant.unpublishTrack(virtualBgLKTrackRef.current); } catch (e) {}
        virtualBgLKTrackRef.current = null;
      }

      cleanupVirtualBg();

      // Re-enable real camera
      await localParticipant.setCameraEnabled(true);

      setVirtualBgEnabled(false);
    } catch (err) {
      console.error('Sanal arka plan kapatma hatası:', err);
      setVirtualBgEnabled(false);
    } finally {
      setVirtualBgLoading(false);
    }
  };

  const connectAudioTrackToMixer = (mediaStreamTrack) => {
    if (!mediaStreamTrack || !audioContextRef.current || !audioDestinationRef.current) return;
    if (connectedTrackIdsRef.current.has(mediaStreamTrack.id)) return;
    
    try {
      const ms = new MediaStream([mediaStreamTrack]);
      const source = audioContextRef.current.createMediaStreamSource(ms);
      source.connect(audioDestinationRef.current);
      connectedTrackIdsRef.current.add(mediaStreamTrack.id);
      console.log("Mixed audio track added:", mediaStreamTrack.id);
    } catch (e) {
      console.warn("Failed to mix audio track:", e);
    }
  };

  const startScreenRecording = async () => {
    try {
      chunksRef.current = [];
      connectedTrackIdsRef.current.clear();

      // 1. Initialize Web Audio API context for background mixing
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const dest = audioCtx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // 2. Connect local microphone audio track to mixer
      if (localParticipant && isMicrophoneEnabled) {
        const localAudioPub = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (localAudioPub && localAudioPub.track && localAudioPub.track.mediaStreamTrack) {
          connectAudioTrackToMixer(localAudioPub.track.mediaStreamTrack);
        }
      }

      // 3. Connect existing and future remote audio tracks to mixer
      if (room) {
        participants.forEach(p => {
          p.trackPublications.forEach(pub => {
            if (pub.kind === 'audio' && pub.track && pub.track.mediaStreamTrack) {
              connectAudioTrackToMixer(pub.track.mediaStreamTrack);
            }
          });
        });

        // Dynamic track subscription hook
        room.on('trackSubscribed', (track, publication, participant) => {
          if (track.kind === 'audio' && track.mediaStreamTrack) {
            connectAudioTrackToMixer(track.mediaStreamTrack);
          }
        });
      }

      // 4. Setup hidden canvas video capture loop
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const drawFrame = () => {
        if (!ctx) return;

        try {
          // Draw solid dark background
          ctx.fillStyle = '#080b11';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Find screen share video element if active
          const screenShareVideo = document.querySelector('.screenshare-container video');
          // Find camera video elements on the page (active, playing, and not paused)
          const cameraVideos = Array.from(document.querySelectorAll('.camera-item video')).filter(video => {
            return video.readyState >= 2 && !video.paused;
          });

          if (showWhiteboardRef.current && whiteboardCanvasRef.current) {
            // Draw whiteboard canvas first
            ctx.drawImage(whiteboardCanvasRef.current, 0, 0, canvas.width, canvas.height);
            
            // Draw first active camera video (typically the teacher) in a PiP corner
            if (cameraVideos.length > 0) {
              const pipW = 240;
              const pipH = 135;
              const pipX = canvas.width - pipW - 20;
              const pipY = 20;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(pipX - 2, pipY - 2, pipW + 4, pipH + 4);
              ctx.drawImage(cameraVideos[0], pipX, pipY, pipW, pipH);
            }
          } else if (screenShareVideo && screenShareVideo.readyState >= 2 && !screenShareVideo.paused) {
            // Draw screen share video full-screen
            ctx.drawImage(screenShareVideo, 0, 0, canvas.width, canvas.height);

            // Draw teacher's camera video in a PiP corner if available
            if (cameraVideos.length > 0) {
              const pipW = 240;
              const pipH = 135;
              const pipX = canvas.width - pipW - 20;
              const pipY = 20;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(pipX - 2, pipY - 2, pipW + 4, pipH + 4);
              ctx.drawImage(cameraVideos[0], pipX, pipY, pipW, pipH);
            }
          } else {
            // Normal camera grid
            if (cameraVideos.length === 1) {
              ctx.drawImage(cameraVideos[0], 0, 0, canvas.width, canvas.height);
            } else if (cameraVideos.length === 2) {
              const w = canvas.width / 2;
              const h = canvas.height;
              ctx.drawImage(cameraVideos[0], 0, 0, w, h);
              ctx.drawImage(cameraVideos[1], w, 0, w, h);
            } else if (cameraVideos.length > 2) {
              const w = canvas.width / 2;
              const h = canvas.height / 2;
              ctx.drawImage(cameraVideos[0], 0, 0, w, h);
              ctx.drawImage(cameraVideos[1], w, 0, w, h);
              if (cameraVideos[2]) ctx.drawImage(cameraVideos[2], 0, h, w, h);
              if (cameraVideos[3]) ctx.drawImage(cameraVideos[3], w, h, w, h);
            } else {
              // Placeholder
              ctx.fillStyle = '#ffffff';
              ctx.font = '24px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Canlı Ders Görüntüsü Bekleniyor...', canvas.width / 2, canvas.height / 2);
            }
          }
        } catch (drawErr) {
          console.warn("Canvas draw frame warning:", drawErr);
        }
      };

      // Hybrid loop: use requestAnimationFrame for active tab, setInterval for background tab
      const tick = () => {
        drawFrame();
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      
      // Start active tab drawing loop
      animationFrameRef.current = requestAnimationFrame(tick);

      // Start backup background tab drawing loop (throttled to 10 FPS in background to avoid browser completely freezing video)
      backupIntervalRef.current = setInterval(() => {
        drawFrame();
      }, 100);

      // 5. Build media stream (Canvas 24 FPS + Mixed Audio)
      const canvasStream = canvas.captureStream(24);
      const combinedStream = new MediaStream();

      canvasStream.getVideoTracks().forEach(t => combinedStream.addTrack(t));
      
      const mixedAudioTrack = dest.stream.getAudioTracks()[0];
      if (mixedAudioTrack) {
        combinedStream.addTrack(mixedAudioTrack);
      } else {
        // Fallback microphone capture if mixer has no streams
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
        } catch (micErr) {
          console.warn("Fallback mic capture failed:", micErr);
        }
      }

      streamRef.current = combinedStream;

      // 6. Initialize MediaRecorder — prefer H.264/MP4 (Safari-compatible), fall back to WebM
      const BITRATES = { videoBitsPerSecond: 800000, audioBitsPerSecond: 64000 };
      const MIME_PRIORITY = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264+AAC — Safari + Chrome macOS 108+
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const chosenMime = MIME_PRIORITY.find(m => MediaRecorder.isTypeSupported(m)) || '';
      let recorder;
      try {
        recorder = new MediaRecorder(combinedStream, { mimeType: chosenMime, ...BITRATES });
      } catch (e) {
        try {
          recorder = new MediaRecorder(combinedStream, BITRATES);
        } catch (e2) {
          recorder = new MediaRecorder(combinedStream);
        }
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setRecordingStatus('saving');
        const duration = Date.now() - recordingStartTimeRef.current;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (backupIntervalRef.current) {
          clearInterval(backupIntervalRef.current);
          backupIntervalRef.current = null;
        }
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close();
          } catch (ctxErr) {}
          audioContextRef.current = null;
        }

        try {
          const actualMime = recorder.mimeType || 'video/webm';
          const isMp4 = actualMime.includes('mp4');
          let blob = new Blob(chunksRef.current, { type: actualMime });

          if (!isMp4) {
            try {
              console.log("Fixing WebM recording duration metadata (Duration:", duration, "ms)...");
              blob = await fixWebmDuration(blob, duration);
              console.log("WebM duration metadata fixed successfully.");
            } catch (fixErr) {
              console.warn("Failed to fix WebM duration metadata:", fixErr);
            }
          }

          const tokenVal = localStorage.getItem('token');
          
          const CHUNK_SIZE = 512 * 1024; // 512KB chunks
          const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
          
          console.log(`Uploading video blob of size ${blob.size} bytes in ${totalChunks} chunks...`);

          for (let index = 0; index < totalChunks; index++) {
            const percent = Math.round((index / totalChunks) * 100);
            setUploadProgress(percent);
            
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, blob.size);
            const chunkBlob = blob.slice(start, end);
            
            const response = await fetch(`/api/teacher/lessons/${lessonId}/upload-chunk`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenVal}`,
                'Content-Type': 'application/octet-stream',
                'x-chunk-index': index.toString(),
                'x-total-chunks': totalChunks.toString(),
                'x-mime-type': actualMime,
              },
              body: chunkBlob
            });
            
            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error || `Yükleme durakladı (Dilim: ${index + 1}/${totalChunks}).`);
            }
          }
          
          setUploadProgress(100);
          alert('Ders kaydı başarıyla kaydedildi ve sisteme yüklendi!');
        } catch (err) {
          console.error('Error saving recording:', err);
          alert('Ders kaydı yüklenirken bir hata oluştu: ' + err.message);
        } finally {
          setRecordingStatus('idle');
          setUploadProgress(0);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
        }
      };

      recorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setRecordingStatus('recording');

    } catch (err) {
      console.error('Error starting screen recording:', err);
      alert('Kayıt başlatılamadı: ' + (err.message || err));
      setRecordingStatus('idle');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
        backupIntervalRef.current = null;
      }
    }
  };

  const stopScreenRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        setRecordingStatus('idle');
      }
    } catch (err) {
      console.error("Error stopping MediaRecorder:", err);
      setRecordingStatus('idle');
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
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (role === 'TEACHER' && connectionState === ConnectionState.Connected && recordingStatus === 'idle' && !hasPromptedRef.current) {
      setShowRecordPrompt(true);
      hasPromptedRef.current = true;
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
        setShowVirtualBgMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleChat = () => {
    if (!showChat) setHasUnreadChat(false);
    setShowChat((prev) => !prev);
    setShowParticipants(false);
  };

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

  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = {
      x: touch.clientX - floatingPos.x,
      y: touch.clientY - floatingPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // Prevent browser default scroll during touch drag
      if (e.touches && e.cancelable) {
        e.preventDefault();
      }

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      let newX = clientX - dragStart.current.x;
      let newY = clientY - dragStart.current.y;

      const minX = 10;
      const minY = 10;
      const maxX = window.innerWidth - 230;
      const maxY = window.innerHeight - 180;

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
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      document.addEventListener('touchcancel', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [isDragging]);

  // Maintain floating window placement on window resize
  useEffect(() => {
    const handleResize = () => {
      setFloatingPos((prev) => {
        const maxX = window.innerWidth - 230;
        const maxY = window.innerHeight - 180;
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
      if (virtualBgEnabled) {
        await disableVirtualBackground();
        return;
      }
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

  const handleToggleWhiteboard = () => {
    const nextVal = !showWhiteboard;
    setShowWhiteboard(nextVal);
    const packet = { type: 'toggle_whiteboard', visible: nextVal };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(packet));
    send(data, { reliable: true });
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
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 text-white font-sans overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
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
    <div
      className="fixed inset-0 z-[99999] flex flex-col font-sans text-slate-100 overflow-hidden"
      style={{ backgroundColor: '#0a1628' }}
    >
      {/* Top Header */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#162540] z-10 shadow-sm relative" style={{ backgroundColor: '#0d1e35' }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex items-center justify-center bg-slate-950 rounded-xl p-1 shadow-inner border border-slate-850">
            <img src="/logo.png" alt="Fullematematiği Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-xs md:text-sm text-slate-100 tracking-wide">Fulle Matematiği Canlı Ders Platformu</h4>
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-black tracking-wider ml-1">
                Sunucu: LiveKit ({connectionState}) | Kamera: {cameraTracks.length}
              </span>
              {recordingStatus === 'recording' && (
                <span className="flex items-center gap-1.5 bg-red-600 text-white px-2 py-0.5 rounded border border-red-500 font-black text-[9px] tracking-wider animate-pulse shadow-sm shadow-red-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                  KAYIT AKTİF (REC)
                </span>
              )}
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
      <div className="flex-1 flex relative overflow-hidden" style={{ zIndex: 1 }}>
        
        {/* VIDEO DISPLAY WINDOW */}
        <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
          {/* Whiteboard view - always mounted but conditionally visible */}
          <div 
            className="w-full h-full flex items-center justify-center p-3 relative"
            style={{ display: showWhiteboard ? 'flex' : 'none', backgroundColor: '#0a1628' }}
          >
            <Whiteboard role={role} whiteboardCanvasRef={whiteboardCanvasRef} />
            
            {/* Webcams Float Box (Draggable) */}
            <div 
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="fixed z-[9999] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden select-none flex flex-col p-2.5 gap-2 cursor-move"
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

              {/* Kamera ve Mikrofon kontrol butonları */}
              <div className="no-drag flex gap-1.5 px-0.5">
                <button
                  onClick={toggleMicrophone}
                  title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isMicrophoneEnabled
                      ? 'bg-slate-700/80 text-slate-200 hover:bg-red-500/80 hover:text-white border border-slate-600/60'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isMicrophoneEnabled ? 'mic' : 'mic_off'}
                  </span>
                  <span>{isMicrophoneEnabled ? 'Mikrofon' : 'Sessiz'}</span>
                </button>

                <button
                  onClick={toggleCamera}
                  title={isCameraEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isCameraEnabled
                      ? 'bg-slate-700/80 text-slate-200 hover:bg-red-500/80 hover:text-white border border-slate-600/60'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isCameraEnabled ? 'videocam' : 'videocam_off'}
                  </span>
                  <span>{isCameraEnabled ? 'Kamera' : 'Kapalı'}</span>
                </button>
              </div>

              {/* Videos */}
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto no-drag pr-0.5">
                {participants.map((p) => {
                  const isTeacher = checkIsTeacher(p);
                  const trackRef = cameraTracks.find(t => t.participant.identity === p.identity);
                  const initial = p.name ? p.name.charAt(0).toUpperCase() : p.identity.charAt(0).toUpperCase();

                  if (trackRef) {
                    const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${p.identity}_camera`;
                    return (
                      <div
                        key={trackKey}
                        className={`relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border shadow-md camera-item ${
                          isTeacher ? 'border-primary/50 shadow-primary/5' : 'border-slate-800'
                        }`}
                      >
                        <VideoTrack trackRef={trackRef} className="w-full h-full object-cover animate-in fade-in duration-300" style={p.isLocal ? { transform: 'scaleX(-1)' } : undefined} />

                        {/* Kendi kamerası için mikrofon ve kamera toggle butonları */}
                        {p.isLocal && (
                          <div className="no-drag absolute top-1 left-1 z-20 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMicrophone(); }}
                              title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
                              className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                isMicrophoneEnabled
                                  ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                  : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px] font-bold">
                                {isMicrophoneEnabled ? 'mic' : 'mic_off'}
                              </span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                              title={isCameraEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                              className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                isCameraEnabled
                                  ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                  : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px] font-bold">
                                {isCameraEnabled ? 'videocam' : 'videocam_off'}
                              </span>
                            </button>
                          </div>
                        )}

                        {/* Speaking indicator overlay */}
                        {p.isSpeaking && (
                          <div className="absolute top-1 right-1 bg-primary text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center z-10">
                            <span className="material-symbols-outlined text-[10px] font-bold">volume_up</span>
                          </div>
                        )}

                        {/* Status name tags */}
                        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-1 border border-white/5 max-w-[85%] truncate">
                          {isTeacher && <span className="text-[7px] bg-primary text-slate-950 font-black px-1 rounded-sm">HOCA</span>}
                          <span className="text-white truncate">{p.name || p.identity} {p.isLocal ? '(Sen)' : ''}</span>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={`${p.identity}_placeholder`}
                        className={`relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950/80 border shadow-sm flex flex-col items-center justify-center p-2 camera-item ${
                          isTeacher ? 'border-primary/30' : 'border-slate-900'
                        }`}
                      >
                        {p.isLocal && (
                          <div className="no-drag absolute top-1 left-1 z-20 flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMicrophone(); }}
                              title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
                              className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                isMicrophoneEnabled
                                  ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                  : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px] font-bold">
                                {isMicrophoneEnabled ? 'mic' : 'mic_off'}
                              </span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                              title={isCameraEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                              className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                isCameraEnabled
                                  ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                  : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[11px] font-bold">
                                {isCameraEnabled ? 'videocam' : 'videocam_off'}
                              </span>
                            </button>
                          </div>
                        )}

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-inner ${
                          isTeacher ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {initial}
                        </div>
                        <div className="text-[8px] font-extrabold mt-1 text-slate-350 max-w-full truncate px-1 flex items-center gap-1">
                          {isTeacher && <span className="text-[7px] bg-primary/20 text-primary font-black px-1 rounded-sm">HOCA</span>}
                          <span className="truncate">{p.name || p.identity} {p.isLocal ? '(Sen)' : ''}</span>
                        </div>
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[8px]">videocam_off</span>
                          Kamera Kapalı
                        </span>

                        {/* Speaking indicator overlay */}
                        {p.isSpeaking && (
                          <div className="absolute top-1 right-1 bg-primary text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center z-10">
                            <span className="material-symbols-outlined text-[10px] font-bold">volume_up</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
                {participants.length === 0 && (
                  <div className="text-center py-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    Aktif kamera yok
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Screen Share / Grid views - rendered when whiteboard is not active */}
          {!showWhiteboard && (
            isScreenSharing ? (
              // A. LAYOUT: SCREEN SHARING ACTIVE
              <div className="w-full h-full flex items-center justify-center p-3 relative bg-black">
                <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-850 shadow-inner bg-slate-950 screenshare-container">
                  <VideoTrack 
                    trackRef={screenShareTracks[0]} 
                    className="w-full h-full object-contain" 
                  />
                </div>

                {/* Webcams Float Box (Draggable) - only active cameras */}
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className="fixed z-[9999] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden select-none flex flex-col p-2.5 gap-2 cursor-move"
                  style={{
                    left: `${floatingPos.x}px`,
                    top: `${floatingPos.y}px`,
                    width: '200px',
                  }}
                >
                  {/* Header */}
                  <div className="px-1.5 py-0.5 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800/60 select-none flex justify-between items-center pb-2">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-primary">videocam</span>
                      Kameralar ({cameraTracks.length})
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-slate-500">drag_indicator</span>
                  </div>

                  {/* Kamera ve Mikrofon kontrol butonları */}
                  <div className="no-drag flex gap-1.5 px-0.5">
                    {/* Mikrofon butonu */}
                    <button
                      onClick={toggleMicrophone}
                      title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        isMicrophoneEnabled
                          ? 'bg-slate-700/80 text-slate-200 hover:bg-red-500/80 hover:text-white border border-slate-600/60'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isMicrophoneEnabled ? 'mic' : 'mic_off'}
                      </span>
                      <span>{isMicrophoneEnabled ? 'Mikrofon' : 'Sessiz'}</span>
                    </button>

                    {/* Kamera butonu */}
                    <button
                      onClick={toggleCamera}
                      title={isCameraEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        isCameraEnabled
                          ? 'bg-slate-700/80 text-slate-200 hover:bg-red-500/80 hover:text-white border border-slate-600/60'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 border border-red-500/40'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isCameraEnabled ? 'videocam' : 'videocam_off'}
                      </span>
                      <span>{isCameraEnabled ? 'Kamera' : 'Kapalı'}</span>
                    </button>
                  </div>

                  {/* Active camera feeds only */}
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto no-drag pr-0.5">
                    {cameraTracks.length === 0 ? (
                      <div className="text-center py-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Aktif kamera yok
                      </div>
                    ) : (
                      cameraTracks.map((trackRef) => {
                        const p = trackRef.participant;
                        const isTeacher = checkIsTeacher(p);
                        const isLocal = p.isLocal;
                        const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${p.identity}_camera`;
                        return (
                          <div
                            key={trackKey}
                            className={`relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border shadow-md camera-item ${
                              isTeacher ? 'border-primary/50 shadow-primary/10' : 'border-slate-800'
                            }`}
                          >
                            <VideoTrack
                              trackRef={trackRef}
                              className="w-full h-full object-cover"
                            />

                            {/* Kendi kamerası için mikrofon ve kamera toggle butonları */}
                            {isLocal && (
                              <div className="no-drag absolute top-1 left-1 z-20 flex gap-1">
                                {/* Mikrofon butonu */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleMicrophone(); }}
                                  title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
                                  className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                    isMicrophoneEnabled
                                      ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                      : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[11px] font-bold">
                                    {isMicrophoneEnabled ? 'mic' : 'mic_off'}
                                  </span>
                                </button>

                                {/* Kamera butonu */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleCamera(); }}
                                  title={isCameraEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                                  className={`flex items-center justify-center w-6 h-6 rounded-full shadow-md border transition-all duration-150 cursor-pointer ${
                                    isCameraEnabled
                                      ? 'bg-slate-800/90 text-slate-200 border-slate-600/60 hover:bg-red-500/80 hover:text-white hover:border-red-400'
                                      : 'bg-red-500/90 text-white border-red-400/60 hover:bg-red-600'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[11px] font-bold">
                                    {isCameraEnabled ? 'videocam' : 'videocam_off'}
                                  </span>
                                </button>
                              </div>
                            )}

                            {/* Speaking indicator */}
                            {p.isSpeaking && (
                              <div className="absolute top-1 right-1 bg-primary text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center z-10">
                                <span className="material-symbols-outlined text-[10px] font-bold">volume_up</span>
                              </div>
                            )}

                            {/* Name tag */}
                            <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-extrabold flex items-center gap-1 border border-white/5 truncate">
                              {isTeacher && <span className="text-[7px] bg-primary text-slate-950 font-black px-1 rounded-sm shrink-0">HOCA</span>}
                              <span className="text-white truncate">{p.name || p.identity}{p.isLocal ? ' (Sen)' : ''}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // B. LAYOUT: NORMAL GRID OF WEBCAMS
              <div className="w-full h-full flex items-center justify-center p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[104rem] w-full">
                  {cameraTracks.map((trackRef) => {
                    const isTeacher = checkIsTeacher(trackRef.participant);
                    const isLocal = trackRef.participant.isLocal;
                    const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${trackRef.participant.identity}_${trackRef.source}`;
                    return (
                      <div 
                        key={trackKey} 
                        className={`relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-xl group hover:scale-[1.01] camera-item ${
                          isTeacher 
                            ? 'border-primary/50 shadow-lg shadow-primary/5 hover:border-primary' 
                            : 'border-slate-800 hover:border-primary/30'
                        }`}
                      >
                        {/* Kendi kameran ayna gibi görünür, karşı taraf seni ters görmez */}
                        <VideoTrack
                          trackRef={trackRef}
                          className="w-full h-full object-cover animate-in fade-in duration-300"
                          style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
                        />

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
            )
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

                    {/* Mute status / teacher controls */}
                    <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
                      {isTeacherRole && !isTeacher && !p.isLocal ? (
                        <>
                          <button
                            title={p.isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofon Zaten Kapalı'}
                            disabled={!p.isMicrophoneEnabled || mutingParticipant === `${p.identity}_audio`}
                            onClick={() => muteParticipantTrack(p, 'audio')}
                            className={`material-symbols-outlined text-base p-1 rounded-lg transition-all cursor-pointer ${
                              p.isMicrophoneEnabled
                                ? 'text-emerald-400 bg-emerald-500/10 hover:text-red-400 hover:bg-red-500/15'
                                : 'text-red-400 bg-red-500/10 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {mutingParticipant === `${p.identity}_audio` ? 'hourglass_empty' : (p.isMicrophoneEnabled ? 'mic' : 'mic_off')}
                          </button>
                          <button
                            title={p.isCameraEnabled ? 'Kamerayı Kapat' : 'Kamera Zaten Kapalı'}
                            disabled={!p.isCameraEnabled || mutingParticipant === `${p.identity}_video`}
                            onClick={() => muteParticipantTrack(p, 'video')}
                            className={`material-symbols-outlined text-base p-1 rounded-lg transition-all cursor-pointer ${
                              p.isCameraEnabled
                                ? 'text-emerald-400 bg-emerald-500/10 hover:text-red-400 hover:bg-red-500/15'
                                : 'text-red-400 bg-red-500/10 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {mutingParticipant === `${p.identity}_video` ? 'hourglass_empty' : (p.isCameraEnabled ? 'videocam' : 'videocam_off')}
                          </button>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* D. SIDEBAR: LIVE CHAT (GLASSMORPHISM) */}
        {showChat && (
          <div className="w-80 h-full bg-slate-900/90 backdrop-blur-lg border-l border-slate-800/80 p-5 flex flex-col gap-3 z-15 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h5 className="font-extrabold text-xs md:text-sm text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <span className="material-symbols-outlined text-base text-primary">chat</span>
                Sohbet
              </h5>
              <button
                onClick={() => setShowChat(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-0.5">
              {chatMessages.length === 0 && (
                <p className="text-[10px] text-slate-500 font-semibold text-center mt-4">
                  Henüz mesaj yok. İlk mesajı sen gönder!
                </p>
              )}
              {chatMessages.map((msg) => {
                const isLocal = msg.senderIdentity === localParticipant?.identity;
                const isTeacherMsg = msg.senderRole === 'TEACHER' || msg.senderRole === 'HEAD_TEACHER';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${isLocal ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <span className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isTeacherMsg ? 'text-primary' : 'text-slate-400'}`}>
                      {isLocal ? 'Sen' : msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs font-semibold break-words ${
                        isLocal
                          ? 'bg-primary text-slate-950 rounded-br-sm'
                          : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-750'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
              className="flex items-center gap-2 border-t border-slate-850 pt-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Mesaj yaz..."
                maxLength={500}
                className="flex-1 bg-slate-800 border border-slate-750 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-primary text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer shadow-md"
                title="Gönder"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Control Bar (Mute, Video, Screen Share, Participants, Leave) */}
      <div className="py-3 px-4 sm:px-6 flex items-center justify-between border-t border-[#162540] z-10 shadow-lg select-none relative" style={{ backgroundColor: '#0d1e35' }}>
        
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
          {/* Virtual Background Button */}
          <div className="relative device-menu-container">
            <button
              onClick={virtualBgEnabled ? disableVirtualBackground : () => setShowVirtualBgMenu(!showVirtualBgMenu)}
              disabled={virtualBgLoading}
              className={`p-2.5 sm:p-3 rounded-xl transition-all font-bold flex items-center justify-center cursor-pointer shadow-md border ${
                virtualBgLoading
                  ? 'bg-slate-700 text-slate-400 border-slate-700 cursor-not-allowed opacity-60'
                  : virtualBgEnabled
                  ? 'border-white/30 text-white shadow-lg'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-750'
              }`}
              style={virtualBgEnabled && !virtualBgLoading ? { backgroundColor: virtualBgColor } : {}}
              title={virtualBgEnabled ? 'Sanal Arka Planı Kapat' : 'Sanal Arka Plan'}
            >
              <span className="material-symbols-outlined text-base sm:text-lg">
                {virtualBgLoading ? 'hourglass_empty' : 'person_pin'}
              </span>
            </button>

            {showVirtualBgMenu && !virtualBgEnabled && (
              <div className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-[999999] animate-in fade-in slide-in-from-bottom-1 duration-150 w-52">
                <div className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">
                  Sanal Arka Plan Rengi
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: '#f97316', label: 'Turuncu' },
                    { color: '#3b82f6', label: 'Mavi' },
                    { color: '#22c55e', label: 'Yeşil' },
                    { color: '#a855f7', label: 'Mor' },
                    { color: '#ef4444', label: 'Kırmızı' },
                    { color: '#eab308', label: 'Sarı' },
                    { color: '#ec4899', label: 'Pembe' },
                    { color: '#0f172a', label: 'Koyu' },
                  ].map(({ color, label }) => (
                    <button
                      key={color}
                      onClick={() => enableVirtualBackground(color)}
                      title={label}
                      className="w-9 h-9 rounded-xl border-2 border-slate-700 hover:border-white hover:scale-110 transition-all cursor-pointer shadow-md"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-[8px] text-slate-500 mt-2 text-center">
                  Model ilk açılışta birkaç saniye yüklenebilir.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Custom Middle: Participants & Chat Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102 ${
              showParticipants
                ? 'bg-slate-100 text-slate-900 border-white font-extrabold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
            }`}
          >
            <span className="material-symbols-outlined text-base">group</span>
            <span className="hidden sm:inline">Katılımcılar</span>
          </button>

          <button
            onClick={toggleChat}
            className={`relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102 ${
              showChat
                ? 'bg-slate-100 text-slate-900 border-white font-extrabold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
            }`}
          >
            <span className="material-symbols-outlined text-base">chat</span>
            <span className="hidden sm:inline">Sohbet</span>
            {hasUnreadChat && !showChat && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-slate-900 animate-pulse"></span>
            )}
          </button>
        </div>

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
                {recordingStatus === 'recording' ? 'Kaydı Durdur' : recordingStatus === 'saving' ? `Yükleniyor (%${uploadProgress})...` : 'Dersi Kaydet'}
              </span>
            </button>
          )}

          {/* Whiteboard Button - Only teacher can toggle, student just follows the teacher's board state */}
          {role === 'TEACHER' && (
            <button 
              onClick={handleToggleWhiteboard}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow-md hover:scale-102 ${
                showWhiteboard 
                  ? 'bg-primary hover:bg-primary/95 text-white border-primary shadow-primary/10' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
              }`}
              title="Beyaz Tahta"
            >
              <span className="material-symbols-outlined text-base">
                edit_document
              </span>
              <span className="hidden md:inline">{showWhiteboard ? 'Tahtayı Kapat' : 'Beyaz Tahta'}</span>
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
      {/* Hidden canvas used for background recording */}
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '-9999px', 
          pointerEvents: 'none', 
          width: '1280px', 
          height: '720px' 
        }} 
        width={1280} 
        height={720} 
      />
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
