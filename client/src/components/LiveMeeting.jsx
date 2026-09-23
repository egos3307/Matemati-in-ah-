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
import { Track, ConnectionState, LocalVideoTrack, ScreenSharePresets, VideoPresets, AudioPresets } from 'livekit-client';
import '@livekit/components-styles';
import BreakOverlay from './BreakOverlay.jsx';

// Geliştirme ortamı debug loglayıcı (üretimde sessiz ve güvenli)
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
const liveDebug = {
  log: (...args) => { if (isDev) console.log(...args); },
  warn: (...args) => { if (isDev) console.warn(...args); },
  error: (...args) => { console.error(...args); }
};

// Stabil LiveKit Oda & Bağlantı Seçenekleri (Ses ve Kamera Donmalarını Önleyen Presetler)
const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  stopLocalTrackOnUnpublish: true,
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
    channelCount: 1,
  },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    videoCodec: 'vp8',
    dtx: true,
    red: true, // RFC 2198 Redundant Audio Data: paket kaybında ses kesilmesini ve robotikleşmeyi önler
    audioPreset: AudioPresets.speech,
    screenShareEncoding: {
      maxBitrate: 2500000,
      maxFramerate: 20,
    },
    videoEncoding: {
      maxBitrate: 600000,
      maxFramerate: 24,
    },
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h540.resolution,
    facingMode: 'user',
    maxFramerate: 24,
  },
};

const LIVEKIT_CONNECT_OPTIONS = {
  autoSubscribe: true,
  peerConnectionTimeout: 20000,
  websocketTimeout: 20000,
  maxRetries: 5,
};

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

// ---------------------------------------------------------------------------
// Morfolojik açma (erode + dilate): seçilen kişi maskesindeki ince/gürültülü
// çıkıntıları temizler. Bunlar genelde arka plandaki bir nesnenin kişi
// silüetine "yapışık" görünen tek-iki piksellik uzantılarıdır ve kenarların
// pikselli/dişli görünmesinin ana kaynağıdır. Erode ana gövdeyi 1px küçültür,
// dilate onu geri büyütür — sadece erode ile tamamen silinen (yani 1px'ten
// ince) çıkıntılar geri gelmez, ana gövde boyutu değişmez.
// ---------------------------------------------------------------------------
let _openBin = null;
let _openEroded = null;
let _openSize = 0;

const openMask = (md, w, h) => {
  const n = w * h;
  if (_openSize !== n) {
    _openBin = new Uint8Array(n);
    _openEroded = new Uint8Array(n);
    _openSize = n;
  }
  const bin = _openBin;
  const eroded = _openEroded;
  const threshold = 140;

  for (let i = 0; i < n; i++) bin[i] = md[i * 4] >= threshold ? 1 : 0;

  // Erode: kare çerçevenin dışını hep "dolu" say (görüntü kenarındaki kişiyi
  // yanlışlıkla erozyona uğratmamak için)
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const idx = row + x;
      if (!bin[idx]) { eroded[idx] = 0; continue; }
      const l = x === 0 || bin[idx - 1];
      const r = x === w - 1 || bin[idx + 1];
      const u = y === 0 || bin[idx - w];
      const d = y === h - 1 || bin[idx + w];
      eroded[idx] = (l && r && u && d) ? 1 : 0;
    }
  }

  // Dilate: sadece erode sonrası hayatta kalan pikseller geri büyütülür
  for (let i = 0; i < n; i++) {
    if (!bin[i] || eroded[i]) continue; // arka plan ya da zaten ana gövdenin parçası

    const x = i % w;
    const y = (i / w) | 0;
    const l = x > 0 && eroded[i - 1];
    const r = x < w - 1 && eroded[i + 1];
    const u = y > 0 && eroded[i - w];
    const d = y < h - 1 && eroded[i + w];

    if (!(l || r || u || d)) {
      // İnce çıkıntı / arka plan gürültüsü — sil
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
  const isTeacherRole = role === 'TEACHER' || role === 'HEAD_TEACHER';
  const [breakActive, setBreakActive] = useState(false);
  const [breakEndsAt, setBreakEndsAt] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await axios.get('/api/livekit/break-status', { params: { roomName } });
        if (res.data && res.data.breakActive && res.data.breakEndsAt > Date.now()) {
          setBreakEndsAt(res.data.breakEndsAt);
          setBreakActive(true);
        } else {
          setBreakActive(false);
        }
      } catch (e) {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [roomName]);

  const endBreakTeacher = async () => {
    try {
      await axios.post('/api/livekit/end-break', { roomName });
      setBreakActive(false);
    } catch (e) {
      setBreakActive(false);
    }
  };

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

      {breakActive && (
        <BreakOverlay
          breakEndsAt={breakEndsAt}
          isTeacher={isTeacherRole}
          onEndBreak={endBreakTeacher}
        />
      )}
    </div>
  );
};





// 1.5 DOĞRUDAN WEBRTC KAMERA OYNATICI (SIFIR GECİKME / HARDWARE ACCELERATED / TİTREMESİZ)
const PipDirectVideo = React.memo(({ trackRef, isLocal = false, altInitial = '?', name = '', isTeacher = false }) => {
  const videoRef = useRef(null);
  const currentTrackIdRef = useRef(null);

  const track = trackRef?.publication?.track || trackRef?.track;
  const msTrack = track?.mediaStreamTrack || trackRef?.publication?.videoTrack?.mediaStreamTrack;
  const hasTrack = Boolean(msTrack);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (!msTrack) {
      if (currentTrackIdRef.current) {
        videoEl.srcObject = null;
        currentTrackIdRef.current = null;
      }
      return;
    }

    // Eğer zaten bu track ID aktif oynuyorsa kesinlikle sıfırlama (5 saniyede bir olan titreşimi/yenilenmeyi engeller)
    if (currentTrackIdRef.current === msTrack.id && videoEl.srcObject) {
      return;
    }

    currentTrackIdRef.current = msTrack.id;

    try {
      const stream = new MediaStream([msTrack]);
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    } catch (e) {
      console.warn("PipDirectVideo stream error:", e);
    }
  }, [msTrack?.id]);

  useEffect(() => {
    return () => {
      // Sadece bileşen tamamen DOM'dan kaldırıldığında (unmount) temizle
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        currentTrackIdRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#090d16', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transform: isLocal ? 'scaleX(-1)' : undefined,
          opacity: hasTrack ? 1 : 0
        }}
      />
      {!hasTrack && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#090d16', padding: '4px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isTeacher ? 'rgba(249, 115, 22, 0.2)' : '#1e293b', color: isTeacher ? '#f97316' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>
            {altInitial}
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, marginTop: '3px', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
        </div>
      )}
    </div>
  );
});

// İzole Sayaç Bileşeni: Sadece kendisini günceller, masaüstü penceresindeki diğer video ve butonları re-render etmez
const PipTimer = React.memo(({ meetingStartTime }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    return meetingStartTime ? Math.max(0, Math.floor((Date.now() - meetingStartTime) / 1000)) : 0;
  });

  useEffect(() => {
    const updateTimer = () => {
      if (meetingStartTime) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - meetingStartTime) / 1000)));
      } else {
        setElapsedSeconds((prev) => prev + 1);
      }
    };
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [meetingStartTime]);

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      title="Ders Başlangıcından İtibaren Geçen Süre"
      style={{
        display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap',
        background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', letterSpacing: '0.03em'
      }}
    >
      ⏱ {formatElapsed(elapsedSeconds)}
    </div>
  );
});

// 1.5 MASAÜSTÜ KÜÇÜK PENCERE (DOCUMENT PICTURE-IN-PICTURE PANEL)
const DesktopPipWindow = React.memo(({
  cameraTracks = [],
  teacherTrackRef,
  isMicrophoneEnabled,
  isCameraEnabled,
  toggleMicrophone,
  toggleCamera,
  studentParticipants,
  teacherParticipant,
  muteParticipantTrack,
  mutingParticipant,
  chatMessages,
  sendChatMessage,
  toggleScreenShare,
  meetingStartTime,
  breakActive = false,
  startBreakTeacher,
  endBreakTeacher,
}) => {
  const [activeOverlay, setActiveOverlay] = useState(null); // null | 'participants' | 'chat'
  const [localChatInput, setLocalChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (activeOverlay === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeOverlay, chatMessages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#080b11', color: '#f8fafc', overflow: 'hidden', userSelect: 'none', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Üst Kısım: Doğrudan WebRTC Donanım Akışlı 50/50 Kamera Alanı (Gecikmesiz) */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', background: '#080b11', display: 'flex', gap: '4px', padding: '4px', overflow: 'hidden' }}>
        
        {/* SOL YARI (%50): Öğretmen Kamerası */}
        <div style={{ width: '50%', height: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#090d16', border: '1px solid rgba(249, 115, 22, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PipDirectVideo
            trackRef={teacherTrackRef}
            isLocal={teacherParticipant?.isLocal}
            altInitial={teacherParticipant?.name ? teacherParticipant.name.charAt(0).toUpperCase() : 'H'}
            name={teacherParticipant?.name || 'Öğretmen'}
            isTeacher={true}
          />

          {/* Öğretmen Rozeti */}
          <div style={{ position: 'absolute', top: '4px', left: '4px', background: '#f97316', color: '#0a1628', padding: '1px 5px', borderRadius: '4px', fontSize: '8px', fontWeight: 900, letterSpacing: '0.05em', zIndex: 10 }}>
            ÖĞRETMEN
          </div>

          {/* Speaking Indicator */}
          {teacherParticipant?.isSpeaking && (
            <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#f97316', color: '#0a1628', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', zIndex: 10 }}>
              🔊
            </div>
          )}

          {/* Name tag */}
          <div style={{ position: 'absolute', bottom: '3px', left: '3px', right: '3px', background: 'rgba(0, 0, 0, 0.75)', padding: '2px 5px', borderRadius: '4px', fontSize: '8.5px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 10 }}>
            {teacherParticipant?.name || 'Öğretmen'} {teacherParticipant?.isLocal ? '(Sen)' : ''}
          </div>
        </div>

        {/* SAĞ YARI (%50): Öğrenciler Bölümü */}
        <div style={{ width: '50%', height: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#090d16', display: 'flex', flexDirection: 'column' }}>
          {studentParticipants.length === 0 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '10px', fontWeight: 700, border: '1px solid #1e293b', borderRadius: '8px' }}>
              👥 Öğrenci Bekleniyor
            </div>
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gap: '3px',
              gridTemplateColumns: studentParticipants.length <= 2 ? '1fr' : '1fr 1fr',
              gridTemplateRows: studentParticipants.length === 1 ? '1fr' : '1fr 1fr'
            }}>
              {studentParticipants.slice(0, 4).map((student) => {
                const sTrackRef = cameraTracks?.find((t) => t.participant.identity === student.identity);
                const sInitial = student.name ? student.name.charAt(0).toUpperCase() : student.identity.charAt(0).toUpperCase();

                return (
                  <div
                    key={student.identity}
                    style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden', background: '#0b111e', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <PipDirectVideo
                      trackRef={sTrackRef}
                      isLocal={student.isLocal}
                      altInitial={sInitial}
                      name={student.name || student.identity}
                      isTeacher={false}
                    />

                    {/* Speaking indicator */}
                    {student.isSpeaking && (
                      <div style={{ position: 'absolute', top: '3px', right: '3px', background: '#f97316', color: '#0a1628', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', zIndex: 10 }}>
                        🔊
                      </div>
                    )}

                    {/* Name tag */}
                    <div style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', background: 'rgba(0, 0, 0, 0.75)', padding: '1px 4px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 10 }}>
                      {student.name || student.identity}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Katılımcılar Overlay */}
        {activeOverlay === 'participants' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 11, 17, 0.96)', backdropFilter: 'blur(10px)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                KATILIMCILAR ({studentParticipants.length + (teacherParticipant ? 1 : 0)})
              </span>
              <button
                onClick={() => setActiveOverlay(null)}
                style={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {teacherParticipant && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '6px 10px', borderRadius: '8px', border: '1px solid #2563eb' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                    {teacherParticipant.name || 'Öğretmen'} (Sen)
                  </span>
                  <span style={{ fontSize: '9px', background: '#2563eb', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>ÖĞRETMEN</span>
                </div>
              )}

              {studentParticipants.map((s) => (
                <div key={s.identity} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '6px 10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                      {s.name ? s.name.charAt(0).toUpperCase() : 'Ö'}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>
                      {s.name || s.identity}
                    </span>
                    {s.isSpeaking && (
                      <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 700 }}>● Konuşuyor</span>
                    )}
                  </div>

                  <button
                    onClick={() => muteParticipantTrack(s, 'audio')}
                    disabled={mutingParticipant === `${s.identity}_audio`}
                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sessize Al
                  </button>
                </div>
              ))}

              {studentParticipants.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', paddingTop: '20px' }}>
                  Henüz derste öğrenci yok.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sohbet Overlay */}
        {activeOverlay === 'chat' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 11, 17, 0.96)', backdropFilter: 'blur(10px)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                CANLI SOHBET ({chatMessages.length})
              </span>
              <button
                onClick={() => setActiveOverlay(null)}
                style={{ background: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '6px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', paddingTop: '30px' }}>
                  Henüz mesaj yok.
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '6px 8px', borderRadius: '6px', fontSize: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>
                      <span>{msg.senderName || msg.senderIdentity}</span>
                      <span style={{ color: '#64748b', fontSize: '8px' }}>{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ color: '#f1f5f9' }}>{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (localChatInput.trim()) {
                  sendChatMessage(localChatInput.trim());
                  setLocalChatInput('');
                }
              }}
              style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px solid #1e293b' }}
            >
              <input
                type="text"
                placeholder="Öğrencilere yazın..."
                value={localChatInput}
                onChange={(e) => setLocalChatInput(e.target.value)}
                style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: '#fff', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Gönder
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Alt Kontrol Çubuğu: Doğrudan Masaüstü Penceresinde Sabit Menü */}
      <div style={{ height: '42px', background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', gap: '4px', flexShrink: 0 }}>
        
        {/* Sol: Katılımcılar & Sohbet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setActiveOverlay(activeOverlay === 'participants' ? null : 'participants')}
            title="Katılımcı Listesi ve Ses Yönetimi"
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 7px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeOverlay === 'participants' ? '#2563eb' : '#1e293b',
              color: activeOverlay === 'participants' ? '#ffffff' : '#cbd5e1',
              border: '1px solid #334155'
            }}
          >
            👥 Katılımcı ({studentParticipants.length})
          </button>

          <button
            onClick={() => setActiveOverlay(activeOverlay === 'chat' ? null : 'chat')}
            title="Canlı Sohbet"
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 7px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeOverlay === 'chat' ? '#2563eb' : '#1e293b',
              color: activeOverlay === 'chat' ? '#ffffff' : '#cbd5e1',
              border: '1px solid #334155'
            }}
          >
            💬 Sohbet
          </button>
        </div>

        {/* Orta: Mikrofon, Kamera, Mola */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={toggleMicrophone}
            title={isMicrophoneEnabled ? "Mikrofonu Kapat" : "Mikrofonu Aç"}
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 7px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: isMicrophoneEnabled ? '#1e293b' : 'rgba(239, 68, 68, 0.2)',
              color: isMicrophoneEnabled ? '#e2e8f0' : '#ef4444',
              border: isMicrophoneEnabled ? '1px solid #334155' : '1px solid rgba(239, 68, 68, 0.4)'
            }}
          >
            {isMicrophoneEnabled ? '🎤 Mic' : '🔇 Sessiz'}
          </button>

          <button
            onClick={toggleCamera}
            title={isCameraEnabled ? "Kamerayı Kapat" : "Kamerayı Aç"}
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 7px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              background: isCameraEnabled ? '#1e293b' : 'rgba(239, 68, 68, 0.2)',
              color: isCameraEnabled ? '#e2e8f0' : '#ef4444',
              border: isCameraEnabled ? '1px solid #334155' : '1px solid rgba(239, 68, 68, 0.4)'
            }}
          >
            {isCameraEnabled ? '📹 Cam' : '📷 Kapalı'}
          </button>

          {/* Ders Başlangıcından İtibaren Canlı Sayaç (İzole, Re-render Önleyici) */}
          <PipTimer meetingStartTime={meetingStartTime} />

          {/* Mola Başlat / Bitir Butonu */}
          <button
            onClick={() => {
              if (breakActive) {
                endBreakTeacher?.();
              } else {
                startBreakTeacher?.(5);
              }
            }}
            title={breakActive ? "Molayı Bitir" : "5 Dakika Mola Başlat"}
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 7px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
              background: breakActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.2)',
              color: breakActive ? '#ef4444' : '#f59e0b',
              border: breakActive ? '1px solid #ef4444' : '1px solid rgba(245, 158, 11, 0.4)'
            }}
          >
            {breakActive ? '⏹ Bitir' : '☕ Mola'}
          </button>
        </div>

        {/* Sağ: Paylaşımı Durdur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={toggleScreenShare}
            title="Ekran Paylaşımını Bitir"
            style={{
              display: 'flex', alignItems: 'center', gap: '3px', padding: '5px 9px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
              background: '#dc2626', color: '#ffffff', border: 'none', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
            }}
          >
            ⏹ Durdur
          </button>
        </div>

      </div>
    </div>
  );
});


// 1.6 İZOLE EDİLMİŞ DONANIM HIZLANDIRMALI EKRAN PAYLAŞIMI OYNATICISI (RE-RENDER KORUMALI)
const ScreenShareViewer = React.memo(({ trackRef }) => {
  return (
    <div 
      className="w-full h-full rounded-2xl overflow-hidden border border-slate-850 shadow-inner bg-slate-950 screenshare-container"
      style={{ transform: 'translateZ(0)', willChange: 'contents' }}
    >
      {trackRef ? (
        <VideoTrack 
          trackRef={trackRef} 
          className="w-full h-full object-contain" 
          manageSubscription={true}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-bold gap-2 select-none">
          <span className="material-symbols-outlined text-3xl animate-pulse text-primary">screen_share</span>
          <span>Ekran Paylaşımı Yükleniyor...</span>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  const prevSid = prev.trackRef?.publication?.trackSid || prev.trackRef?.track?.sid;
  const nextSid = next.trackRef?.publication?.trackSid || next.trackRef?.track?.sid;
  const prevMuted = prev.trackRef?.publication?.isMuted || prev.trackRef?.track?.isMuted;
  const nextMuted = next.trackRef?.publication?.isMuted || next.trackRef?.track?.isMuted;
  return prevSid === nextSid && prevMuted === nextMuted;
});

// 1.7 İZOLE EDİLMİŞ KATILIMCI KAMERA KARTI (SADECE KENDİ DURUMU DEĞİŞTİĞİNDE RENDER EDİLİR)
const PipParticipantTile = React.memo(({
  trackRef,
  participant,
  isTeacher = false,
  isLocal = false,
  name = '',
  initial = '?',
  isTeacherRole = false
}) => {
  return (
    <div 
      className={`relative w-full h-full rounded-xl overflow-hidden bg-slate-950 ${
        isTeacher ? 'border border-primary/50 shadow-md' : 'border border-slate-800 shadow-sm'
      } flex flex-col justify-center items-center`}
      data-pip={isTeacher ? "teacher" : "student"}
      data-name={name}
      style={{ transform: 'translateZ(0)' }}
    >
      {trackRef ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-cover"
          style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
          manageSubscription={true}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 p-1 text-center select-none">
          <div className={`${isTeacherRole ? 'w-8 h-8 text-xs' : 'w-5 h-5 text-[9px]'} rounded-full ${
            isTeacher ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-300'
          } flex items-center justify-center font-black mb-0.5 shadow-inner`}>
            {initial}
          </div>
          <span className={`${isTeacherRole ? 'text-[10px]' : 'text-[7.5px]'} font-bold text-slate-300 truncate max-w-full`}>
            {name}
          </span>
          {isTeacher && isTeacherRole && (
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[9px]">videocam_off</span>
              Kamera Kapalı
            </span>
          )}
        </div>
      )}

      {/* Öğretmen Rozeti */}
      {isTeacher && isTeacherRole && (
        <div className="absolute top-1 left-1 bg-primary text-slate-950 px-1 py-0.5 rounded text-[7px] font-black tracking-wider flex items-center gap-0.5 shadow-sm z-10 select-none">
          <span className="material-symbols-outlined text-[8px]">school</span>
          <span>ÖĞRETMEN</span>
        </div>
      )}

      {/* Speaking indicator */}
      {participant?.isSpeaking && (
        <div className="absolute top-1 right-1 bg-primary text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center z-10">
          <span className="material-symbols-outlined text-[8px] font-bold">volume_up</span>
        </div>
      )}

      {/* Name tag */}
      <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/75 px-1 py-0.5 rounded text-[7px] font-extrabold flex items-center gap-0.5 border border-white/5 truncate z-10 select-none">
        <span className="text-white truncate">
          {name} {isLocal ? '(Sen)' : ''}
        </span>
      </div>
    </div>
  );
}, (prev, next) => {
  const prevSid = prev.trackRef?.publication?.trackSid || prev.trackRef?.track?.sid;
  const nextSid = next.trackRef?.publication?.trackSid || next.trackRef?.track?.sid;
  const prevSpeaking = prev.participant?.isSpeaking;
  const nextSpeaking = next.participant?.isSpeaking;
  const prevMuted = prev.trackRef?.publication?.isMuted || prev.trackRef?.track?.isMuted;
  const nextMuted = next.trackRef?.publication?.isMuted || next.trackRef?.track?.isMuted;
  return prevSid === nextSid && prevSpeaking === nextSpeaking && prevMuted === nextMuted && prev.name === next.name;
});

// 1.8 TAMAMEN İZOLE EDİLMİŞ VE TAŞINABİLİR YÜZEN KAMERA KUTUSU (ZERO RE-RENDER FOR MAIN STREAM)
const FloatingCameraOverlay = React.memo(({
  isTeacherRole,
  teacherParticipant,
  teacherTrackRef,
  studentParticipants,
  cameraTracks,
  isPipActive,
  togglePip,
  isMicrophoneEnabled,
  toggleMicrophone,
  isCameraEnabled,
  toggleCamera,
}) => {
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 20, y: 20 };
    const isMobile = window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
    if (!isTeacherRole && isMobile) {
      return { x: Math.max(8, window.innerWidth - 168), y: 8 };
    }
    return {
      x: Math.max(10, window.innerWidth - (isTeacherRole ? 400 : 230)),
      y: Math.max(10, window.innerHeight - (isTeacherRole ? 290 : 160))
    };
  });

  const [studentCamScale, setStudentCamScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, scale: 1.0 });

  // Boyutlandırma tutamacı
  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    resizeStartRef.current = { x: clientX, scale: studentCamScale };
  };

  const handleResizeClick = (e) => {
    e.stopPropagation();
    setStudentCamScale((prev) => {
      if (prev < 1.4) return 1.75;
      if (prev < 2.2) return 2.5;
      return 1.0;
    });
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleResizeMove = (e) => {
      if (e.touches && e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - resizeStartRef.current.x;
      const isMobile = window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
      const baseWidth = isMobile ? 160 : 210;
      const deltaScale = deltaX / baseWidth;
      const nextScale = Math.max(1.0, Math.min(2.5, Number((resizeStartRef.current.scale + deltaScale).toFixed(2))));
      setStudentCamScale(nextScale);
    };

    const handleResizeEnd = () => setIsResizing(false);

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove, { passive: false });
    window.addEventListener('touchend', handleResizeEnd);
    window.addEventListener('touchcancel', handleResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      window.removeEventListener('touchmove', handleResizeMove);
      window.removeEventListener('touchend', handleResizeEnd);
      window.removeEventListener('touchcancel', handleResizeEnd);
    };
  }, [isResizing]);

  // Sürükleme kontrolü (GPU compositing: layout reflow yapmaz)
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button') || e.target.closest('.no-drag')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('.no-drag')) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX - pos.x,
      y: touch.clientY - pos.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    let rAF = null;

    const handleMouseMove = (e) => {
      if (e.touches && e.cancelable) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const isMobile = window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
        const baseWidth = isMobile ? 160 : 210;
        const boxWidth = isTeacherRole 
          ? Math.min(380, window.innerWidth - 20) 
          : Math.min(window.innerWidth - 12, Math.round(baseWidth * studentCamScale));
        const boxHeight = isTeacherRole ? 210 : Math.round((isMobile ? 100 : 115) * studentCamScale);

        const minX = 6;
        const minY = 6;
        const maxX = Math.max(6, window.innerWidth - boxWidth - 6);
        const maxY = Math.max(6, window.innerHeight - boxHeight - 6);

        let newX = clientX - dragStartRef.current.x;
        let newY = clientY - dragStartRef.current.y;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        setPos({ x: newX, y: newY });
      });
    };

    const handleMouseUp = () => {
      if (rAF) cancelAnimationFrame(rAF);
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('touchcancel', handleMouseUp);

    return () => {
      if (rAF) cancelAnimationFrame(rAF);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [isDragging, isTeacherRole, studentCamScale]);

  // Pencere boyutu değiştiğinde ekranda tutma
  useEffect(() => {
    const handleWindowResize = () => {
      setPos((prev) => {
        const isMobile = window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
        const baseWidth = isMobile ? 160 : 210;
        const boxWidth = isTeacherRole 
          ? Math.min(380, window.innerWidth - 20) 
          : Math.min(window.innerWidth - 12, Math.round(baseWidth * studentCamScale));
        const boxHeight = isTeacherRole ? 210 : Math.round((isMobile ? 100 : 115) * studentCamScale);
        const maxX = Math.max(6, window.innerWidth - boxWidth - 6);
        const maxY = Math.max(6, window.innerHeight - boxHeight - 6);
        return {
          x: Math.max(6, Math.min(maxX, prev.x)),
          y: Math.max(6, Math.min(maxY, prev.y))
        };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isTeacherRole, studentCamScale]);

  const isMobileScreen = typeof window !== 'undefined' && (window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024));

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`fixed z-[9999] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden select-none cursor-move flex flex-col ${
        isTeacherRole ? 'p-2.5 gap-2' : 'p-1.5 gap-1'
      }`}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        left: 0,
        top: 0,
        willChange: 'transform',
        width: isTeacherRole 
          ? 'min(380px, calc(100vw - 20px))' 
          : `min(${Math.round((isMobileScreen ? 160 : 210) * studentCamScale)}px, calc(100vw - 16px))`,
      }}
    >
      {/* Header */}
      <div className="px-1 py-0.5 text-[8px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-slate-800/60 select-none flex justify-between items-center pb-1">
        <span className="flex items-center gap-1 truncate">
          <span className="material-symbols-outlined text-[11px] text-primary">groups</span>
          <span className="truncate">{isTeacherRole ? `Kameralar (1 Öğretmen + ${studentParticipants.length} Öğrenci)` : 'Kameralar'}</span>
        </span>
        <div className="flex items-center gap-1.5">
          {isTeacherRole && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePip();
              }}
              title={isPipActive ? "Masaüstü Küçük Pencereyi Kapat" : "Masaüstü Küçük Pencereyi Aç (Diğer programların üstünde gösterir)"}
              className={`no-drag flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                isPipActive
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[11px]">
                {isPipActive ? 'pip_exit' : 'picture_in_picture_alt'}
              </span>
              <span>{isPipActive ? 'Masaüstünde Açık' : 'Masaüstüne Al'}</span>
            </button>
          )}
          <span className="material-symbols-outlined text-[13px] text-slate-500">drag_indicator</span>
        </div>
      </div>

      {/* Kamera ve Mikrofon kontrol butonları (Sadece Öğretmen için) */}
      {isTeacherRole && (
        <div className="no-drag flex gap-1.5 px-0.5">
          <button
            onClick={toggleMicrophone}
            title={isMicrophoneEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
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
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
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
      )}

      {/* 50% Öğretmen / 50% Öğrenciler Split Video Alanı */}
      <div 
        className="flex gap-1.5 no-drag"
        style={{
          height: isTeacherRole 
            ? '150px' 
            : `${Math.round((isMobileScreen ? 75 : 85) * studentCamScale)}px`
        }}
      >
        {/* SOL YARI (%50): Öğretmen Kamerası */}
        <div className="w-1/2 h-full">
          <PipParticipantTile
            trackRef={teacherTrackRef}
            participant={teacherParticipant}
            isTeacher={true}
            isLocal={teacherParticipant?.isLocal}
            name={teacherParticipant?.name || 'Öğretmen'}
            initial={teacherParticipant?.name ? teacherParticipant.name.charAt(0).toUpperCase() : 'H'}
            isTeacherRole={isTeacherRole}
          />
        </div>

        {/* SAĞ YARI (%50): Öğrenciler Bölümü */}
        <div className="w-1/2 h-full flex flex-col">
          {studentParticipants.length === 0 ? (
            <div className="w-full h-full rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center justify-center p-1 text-center select-none">
              <span className="material-symbols-outlined text-slate-600 text-base mb-0.5">group</span>
              <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">
                Öğrenci Yok
              </span>
            </div>
          ) : (
            <div
              className={`w-full h-full gap-1 ${
                studentParticipants.length === 1
                  ? 'grid grid-cols-1 grid-rows-1'
                  : studentParticipants.length === 2
                  ? 'grid grid-cols-1 grid-rows-2'
                  : 'grid grid-cols-2 grid-rows-2'
              }`}
            >
              {studentParticipants.slice(0, 4).map((student) => {
                const sTrackRef = cameraTracks.find((t) => t.participant.identity === student.identity);
                const sInitial = student.name
                  ? student.name.charAt(0).toUpperCase()
                  : student.identity.charAt(0).toUpperCase();

                return (
                  <PipParticipantTile
                    key={student.identity}
                    trackRef={sTrackRef}
                    participant={student}
                    isTeacher={false}
                    isLocal={student.isLocal}
                    name={student.name || student.identity}
                    initial={sInitial}
                    isTeacherRole={isTeacherRole}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Boyutlandırma Tutamacı (Sağ Alt Köşe - Sadece Öğrenci) */}
      {!isTeacherRole && (
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          onClick={handleResizeClick}
          className="no-drag absolute bottom-0 right-0 w-6 h-6 flex items-end justify-end p-1 cursor-nwse-resize z-30 select-none group touch-none"
          title="Boyutlandırmak için sürükleyin veya tıklayın (1.0x - 2.5x)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400 group-hover:text-amber-400 transition-colors pointer-events-none">
            <line x1="9" y1="2" x2="2" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="9" y1="5.5" x2="5.5" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="9" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
});

// 1.9 İZOLE EDİLMİŞ NORMAL IZGARA KAMERA KARTI (SIFIR RE-RENDER / DONMA ÖNLEYİCİ)
const GridCameraTile = React.memo(({ trackRef, isTeacher, isLocal, name, isSpeaking }) => {
  return (
    <div 
      className={`relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-xl group hover:scale-[1.01] camera-item ${
        isTeacher 
          ? 'border-primary/50 shadow-lg shadow-primary/5 hover:border-primary' 
          : 'border-slate-800 hover:border-primary/30'
      }`}
      style={{ transform: 'translateZ(0)' }}
    >
      <VideoTrack
        trackRef={trackRef}
        manageSubscription={true}
        className="w-full h-full object-cover"
        style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
      />
      <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md border border-white/5 flex items-center gap-2 select-none">
        {isTeacher ? (
          <span className="flex items-center gap-1 text-xs text-primary font-black">
            <span className="material-symbols-outlined text-xs">star</span>
            {name}
          </span>
        ) : (
          <span className="text-slate-200">
            {name} {isLocal ? '(Sen)' : ''}
          </span>
        )}
      </div>
      {isSpeaking && (
        <div className="absolute top-3 right-3 bg-primary text-white rounded-full p-1 shadow-lg shadow-primary/20 border border-white/20 animate-bounce flex items-center justify-center">
          <span className="material-symbols-outlined text-xs font-bold">volume_up</span>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  const prevSid = prev.trackRef?.publication?.trackSid || prev.trackRef?.track?.sid;
  const nextSid = next.trackRef?.publication?.trackSid || next.trackRef?.track?.sid;
  const prevMuted = prev.trackRef?.publication?.isMuted || prev.trackRef?.track?.isMuted;
  const nextMuted = next.trackRef?.publication?.isMuted || next.trackRef?.track?.isMuted;
  return prevSid === nextSid && prevMuted === nextMuted && prev.isSpeaking === next.isSpeaking && prev.name === next.name && prev.isLocal === next.isLocal;
});

// 2. LIVEKIT SESSION COMPONENT WITH PREMIUM CUSTOM UI
const MeetingSession = ({ role, userName, lessonId, onClose, onLiveKitError }) => {
  const connectionState = useConnectionState();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const micTracks = useTracks([Track.Source.Microphone]);
  const rawScreenTracks = useTracks([Track.Source.ScreenShare]);
  const activeScreenTrackRef = React.useMemo(() => {
    return rawScreenTracks.find(
      (track) => track.publication?.kind === 'video' || track.track?.kind === 'video'
    ) || null;
  }, [rawScreenTracks]);
  const isScreenSharing = Boolean(activeScreenTrackRef);
  const screenShareTracks = React.useMemo(() => (activeScreenTrackRef ? [activeScreenTrackRef] : []), [activeScreenTrackRef]);
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const room = useMaybeRoomContext();
  const isTeacherRole = role === 'TEACHER' || role === 'HEAD_TEACHER';
  const trackSubscribedHandlerRef = useRef(null);

  const isParticipantTeacher = (p) => {
    if (!p) return false;
    if (p.isLocal && isTeacherRole) return true;
    return checkIsTeacher(p);
  };

  const teacherParticipant = participants.find(p => isParticipantTeacher(p)) || (isTeacherRole ? localParticipant : null);
  const studentParticipants = participants.filter(p => !isParticipantTeacher(p));
  const teacherTrackRef = teacherParticipant 
    ? cameraTracks.find(t => t.participant.identity === teacherParticipant.identity) 
    : null;

  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, saving
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const showWhiteboardRef = useRef(false);
  const whiteboardCanvasRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const [meetingStartTime] = useState(() => Date.now());
  const [mutingParticipant, setMutingParticipant] = useState(null);

  // Live chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const showChatRef = useRef(false);
  const chatEndRef = useRef(null);

  // Break Mode (Mola Modu) state
  const [breakActive, setBreakActive] = useState(false);
  const [breakEndsAt, setBreakEndsAt] = useState(0);
  const [breakDuration, setBreakDuration] = useState(0);
  const [showBreakMenu, setShowBreakMenu] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(5);

  const breakActiveRef = useRef(false);
  const breakEndsAtRef = useRef(0);

  useEffect(() => {
    breakActiveRef.current = breakActive;
  }, [breakActive]);

  useEffect(() => {
    breakEndsAtRef.current = breakEndsAt;
  }, [breakEndsAt]);

  const applyStartBreak = async (endsAt, duration) => {
    liveDebug.log('[MOLA] applyStartBreak triggered. EndsAt:', new Date(endsAt).toISOString());
    setBreakEndsAt(endsAt);
    setBreakDuration(duration);
    setBreakActive(true);
    setShowBreakMenu(false);

    // Mola başladığında masaüstü Document PiP penceresi açıksa kapat ve tam ekran mola ekranına odaklan
    if (docPipWindowRef.current) {
      try {
        docPipWindowRef.current.close();
      } catch (e) {}
      docPipWindowRef.current = null;
      setDocPipWindow(null);
      setIsPipActive(false);
    }

    // 1. Mute & stop local microphone
    if (localParticipant) {
      try {
        await localParticipant.setMicrophoneEnabled(false);
      } catch (e) {
        console.warn('Break mic mute error:', e);
      }
    }

    // 2. Mute & stop local camera (or virtual background)
    if (localParticipant) {
      try {
        if (virtualBgEnabledRef.current) {
          await disableVirtualBackground();
        } else {
          await localParticipant.setCameraEnabled(false);
        }
      } catch (e) {
        console.warn('Break camera mute error:', e);
      }
    }

    // ÖNEMLİ: Ekran paylaşımı (screen share) track'i mola sırasında kapatılmaz!
    // BreakOverlay tam ekran kapladığı için görüntü gizlenir, mola bitiminde ekran paylaşımı kesintisiz devam eder.
  };

  const applyEndBreak = () => {
    liveDebug.log('[MOLA] applyEndBreak triggered.');
    setBreakActive(false);
    setBreakEndsAt(0);
    setBreakDuration(0);
    // ÖNEMLİ: Kamera ve mikrofon mola bittiğinde otomatik açılmaz! Kapalı kalır.
  };

  const { send: sendBreakData } = useDataChannel('break_status', (msg) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const packet = JSON.parse(text);
      if (packet.type === 'START_BREAK') {
        applyStartBreak(packet.breakEndsAt, packet.breakDuration);
      } else if (packet.type === 'END_BREAK') {
        applyEndBreak();
      }
    } catch (err) {
      console.error('Break data packet error:', err);
    }
  });

  const startBreakTeacher = async (minutes) => {
    const mins = Number(minutes);
    if (!mins || isNaN(mins) || mins <= 0) {
      alert('Lütfen geçerli bir mola süresi girin.');
      return;
    }
    const durationSec = Math.round(mins * 60);
    const calculatedEndsAt = Date.now() + durationSec * 1000;

    // 1. Öğretmenin ekranında mola anında açılsın (gecikmesiz optimistic açılış)
    applyStartBreak(calculatedEndsAt, durationSec);

    const roomName = `lesson_${lessonId}`;
    try {
      const tokenVal = localStorage.getItem('token');
      const authHeader = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};
      const res = await axios.post('/api/livekit/start-break', {
        roomName,
        durationMinutes: mins
      }, { headers: authHeader });

      const finalEndsAt = res.data?.breakEndsAt || calculatedEndsAt;
      const finalDuration = res.data?.breakDuration || durationSec;

      // 2. Diğer katılımcılara (öğrencilere) veri kanalı üzerinden mola paketini gönder
      try {
        const packet = {
          type: 'START_BREAK',
          breakEndsAt: finalEndsAt,
          breakDuration: finalDuration
        };
        const encoder = new TextEncoder();
        sendBreakData(encoder.encode(JSON.stringify(packet)), { reliable: true });
      } catch (sendErr) {
        console.warn('[MOLA] Data channel send uyarısı:', sendErr);
      }
    } catch (err) {
      console.warn('[MOLA] Backend start-break sync uyarısı:', err);
    }
  };

  const endBreakTeacher = async () => {
    // 1. Öğretmenin ekranında molayı anında bitir
    applyEndBreak();

    const roomName = `lesson_${lessonId}`;
    try {
      const tokenVal = localStorage.getItem('token');
      const authHeader = tokenVal ? { Authorization: `Bearer ${tokenVal}` } : {};
      await axios.post('/api/livekit/end-break', { roomName }, { headers: authHeader });
      try {
        const packet = { type: 'END_BREAK' };
        const encoder = new TextEncoder();
        sendBreakData(encoder.encode(JSON.stringify(packet)), { reliable: true });
      } catch (dataErr) {}
    } catch (err) {
      console.warn('[MOLA] Backend end-break sync uyarısı:', err);
    }
  };

  // Poll room break status from backend (supports late joiners & reconnects)
  useEffect(() => {
    const roomName = `lesson_${lessonId}`;
    let isCancelled = false;

    const pollBreakStatus = async () => {
      try {
        const res = await axios.get('/api/livekit/break-status', { params: { roomName } });
        if (isCancelled) return;
        if (res.data && res.data.breakActive) {
          if (res.data.breakEndsAt > Date.now()) {
            setBreakEndsAt((prev) => (prev === res.data.breakEndsAt ? prev : res.data.breakEndsAt));
            setBreakDuration((prev) => (prev === res.data.breakDuration ? prev : res.data.breakDuration));
            setBreakActive((prev) => (prev === true ? prev : true));

            // Force turn off active mic/cam during break
            if (localParticipant?.isMicrophoneEnabled) {
              localParticipant.setMicrophoneEnabled(false).catch(() => {});
            }
            if (localParticipant?.isCameraEnabled) {
              localParticipant.setCameraEnabled(false).catch(() => {});
            }
          } else {
            setBreakActive((prev) => (prev === false ? prev : false));
          }
        } else {
          // Öğretmenin yerel olarak başlattığı aktif molayı sunucu gecikmesinde kapatma
          if (!isTeacherRole || !breakEndsAtRef.current || Date.now() >= breakEndsAtRef.current) {
            setBreakActive((prev) => (prev === false ? prev : false));
          }
        }
      } catch (err) {
        // Sessiz yakala (arka plan poll)
      }
    };

    pollBreakStatus();
    const interval = setInterval(pollBreakStatus, 4000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [lessonId]);

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

  const sendChatMessage = (customText) => {
    const text = (typeof customText === 'string' ? customText : chatInput).trim();
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
    if (typeof customText !== 'string') {
      setChatInput('');
    }
  };

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const canvasVideoTrackRef = useRef(null);
  const silentOscRef = useRef(null);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const backupIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioDestinationRef = useRef(null);
  const connectedTrackIdsRef = useRef(new Set());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedRecordingBlob, setFailedRecordingBlob] = useState(null);
  const [failedRecordingName, setFailedRecordingName] = useState('');
  const isStoppingRef = useRef(false);

  // Sayfa yenileme veya sekme kapatmada kaydın korunması
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (recordingStatus === 'recording' || recordingStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'Ders kaydı devam ediyor veya sisteme aktarılıyor. Sayfadan ayrılırsanız kayıt kaybolabilir!';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recordingStatus]);

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

        // ── ADIM 2b: Morfolojik açma — arka plandan kalan ince/gürültülü
        // çıkıntıları temizle (arka planın kişi silüetine "yapışık" görünmesini
        // engeller, kenarları pürüzsüzleştirir)
        openMask(rawMaskData.data, w, h);

        // ── ADIM 3: Temizlenmiş ham maskeyi geri yaz, sonra blur uygula ──
        // Böylece blur sadece seçilen kişinin kenarlarını yumuşatır;
        // silinmiş bileşenler blura dahil olmaz.
        maskCtx.putImageData(rawMaskData, 0, 0);
        maskCtx.filter = 'blur(6px)'; // yumuşak, doğal kenar geçişi
        maskCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.filter = 'none';
        const maskData = maskCtx.getImageData(0, 0, w, h);

        const fd = frameData.data;
        const md = maskData.data;

        // ── ADIM 4: Piksel harmanlama ──
        // < 0.25 tam arka plan, > 0.75 tam kişi. Aradaki bant smoothstep
        // eğrisiyle harmanlanır (doğrusal yerine) — kenar daha yumuşak ve
        // daha az "pikselli/dişli" görünür.
        for (let i = 0; i < fd.length; i += 4) {
          const confidence = md[i] / 255;

          if (confidence < 0.25) {
            // Tam arka plan → düz renk
            fd[i]     = bgR;
            fd[i + 1] = bgG;
            fd[i + 2] = bgB;
            fd[i + 3] = 255;
          } else if (confidence < 0.75) {
            // Kenar geçiş bandı → smoothstep harman
            const raw = (confidence - 0.25) / 0.50;
            const t = raw * raw * (3 - 2 * raw);
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

      // Capture canvas stream before starting the loop at 24 FPS
      const canvasStream = canvas.captureStream(24);
      const processedVideoTrack = canvasStream.getVideoTracks()[0];

      // Ref'i loop başlamadan true yap — yoksa ilk iterasyonda hemen çıkıyor
      virtualBgEnabledRef.current = true;

      // Start segmentation loop throttled to 24 FPS (prevents CPU choking audio thread)
      let lastSegTime = 0;
      const runFrame = async () => {
        if (!virtualBgEnabledRef.current) return;
        const now = performance.now();
        if (now - lastSegTime >= 40) {
          lastSegTime = now;
          if (video.readyState >= 2) {
            try { await segmenter.send({ image: video }); } catch (e) { /* skip frame */ }
          }
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

  const uploadRecordingToDrive = async (blob, actualMime = 'video/webm', meta = {}) => {
    setRecordingStatus('saving');
    setUploadProgress(0);

    const tokenVal = localStorage.getItem('token');
    const isMp4 = actualMime.includes('mp4');
    const fileExt = isMp4 ? 'mp4' : 'webm';
    const fallbackFileName = `Ders_${lessonId}_Kayit.${fileExt}`;

    try {
      console.log(`[Drive Upload] Yükleme oturumu başlatılıyor: Boyut ${(blob.size / 1024 / 1024).toFixed(2)} MB (${blob.size} bytes), MIME: ${actualMime}, Süre: ${meta.durationMs || 0} ms, Parça: ${meta.chunkCount || 0}`);

      const initRes = await fetch(`/api/teacher/lessons/${lessonId}/recording/init-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenVal}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileSize: blob.size,
          mimeType: actualMime,
          durationMs: meta.durationMs || 0,
          chunkCount: meta.chunkCount || 0
        })
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(errData.error || `Google Drive oturumu başlatılamadı (${initRes.status}).`);
      }

      const sessionData = await initRes.json();
      const { uploadUrl, chunkSize: serverChunkSize } = sessionData;

      // Google Drive 256KB katı gereksinimi: Varsayılan 2MB (2 * 1024 * 1024 = 2097152 bayt)
      const CHUNK_SIZE = serverChunkSize || (2 * 1024 * 1024);
      const totalBytes = blob.size;
      let offset = 0;
      let directUploadDisabled = false;
      let completedFileId = null;

      console.log(`[Drive Upload] Oturum URL alındı, dilimler aktarılıyor (Dilim boyutu: ${(CHUNK_SIZE / 1024 / 1024).toFixed(1)} MB)...`);

      while (offset < totalBytes) {
        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalBytes);
        const currentChunkBlob = blob.slice(offset, chunkEnd);

        let chunkUploaded = false;
        let lastChunkError = null;

        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            // Seviye A: Tarayıcıdan doğrudan Google Drive'a PUT
            if (!directUploadDisabled) {
              try {
                const directRes = await fetch(uploadUrl, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': actualMime,
                    'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${totalBytes}`
                  },
                  body: currentChunkBlob
                });

                if (directRes.status === 308 || directRes.ok) {
                  chunkUploaded = true;
                  if (directRes.ok) {
                    const doneData = await directRes.json().catch(() => ({}));
                    completedFileId = doneData.id || completedFileId;
                  }
                  break;
                } else {
                  console.warn(`[Drive Direct] Doğrudan bağlantı HTTP ${directRes.status}, sunucu proxy'sine geçiliyor.`);
                  directUploadDisabled = true;
                }
              } catch (directErr) {
                console.warn("[Drive Direct] Doğrudan bağlantı kullanılamadı, sunucu akış proxy'sine geçiliyor:", directErr.message);
                directUploadDisabled = true;
              }
            }

            // Seviye B: Sunucu üzerinden Google Drive'a akış proxy'si
            const proxyRes = await fetch(`/api/teacher/lessons/${lessonId}/recording/upload-part`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${tokenVal}`,
                'Content-Type': 'application/octet-stream',
                'x-upload-url': uploadUrl,
                'x-start-byte': offset.toString(),
                'x-end-byte': (chunkEnd - 1).toString(),
                'x-total-bytes': totalBytes.toString(),
                'x-mime-type': actualMime
              },
              body: currentChunkBlob
            });

            if (!proxyRes.ok) {
              const errData = await proxyRes.json().catch(() => ({}));
              throw new Error(errData.error || `Dilim aktarımı başarısız (${proxyRes.status}).`);
            }

            const proxyData = await proxyRes.json();
            if (proxyData.done || proxyData.status === 200 || proxyData.fileId) {
              completedFileId = proxyData.fileId || completedFileId;
            }
            chunkUploaded = true;
            break;
          } catch (retryErr) {
            lastChunkError = retryErr;
            console.warn(`[Drive Retry] Dilim (${offset}-${chunkEnd}) deneme ${attempt}/4: ${retryErr.message}`);
            if (attempt < 4) {
              await new Promise(r => setTimeout(r, attempt * 1500));
            }
          }
        }

        if (!chunkUploaded) {
          throw new Error(`Kayıt yükleme bağlantısı koptu (İlerleme: %${Math.round((offset / totalBytes) * 100)}): ${lastChunkError?.message || 'Ağ hatası'}`);
        }

        offset = chunkEnd;
        const currentPercent = Math.min(99, Math.round((offset / totalBytes) * 100));
        setUploadProgress(currentPercent);
      }

      if (completedFileId) {
        const compRes = await fetch(`/api/teacher/lessons/${lessonId}/recording/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenVal}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileId: completedFileId,
            durationMs: meta.durationMs || 0,
            chunkCount: meta.chunkCount || 0,
            totalClientSentBytes: totalBytes
          })
        }).catch(e => {
          console.warn("Complete bildirim uyarısı:", e);
          return null;
        });

        if (compRes && compRes.ok) {
          const compData = await compRes.json().catch(() => ({}));
          if (compData.driveFileSize) {
            console.log(`[Recording Debug #7] Google Drive API doğrulanan final dosya boyutu: ${compData.driveFileSize} bytes (${(compData.driveFileSize / 1024 / 1024).toFixed(2)} MB)`);
          }
        }
      }

      setUploadProgress(100);
      alert('Ders kaydı başarıyla Google Drive\'a yüklendi! Öğrencileriniz ders listesinden kaydı izleyebilir.');
      setFailedRecordingBlob(null);
      setFailedRecordingName('');
      chunksRef.current = [];
    } catch (err) {
      console.error('Error saving recording:', err);
      setFailedRecordingBlob(blob);
      setFailedRecordingName(fallbackFileName);
      alert(`Ders kaydı Google Drive'a aktarılırken hata oluştu: ${err.message}\n\nÖNEMLİ: Ders kaydınız kaybolmadı! Ekranda açılan pencereden videoyu bilgisayarınıza indirebilir veya tekrar yüklemeyi deneyebilirsiniz.`);
    } finally {
      setRecordingStatus('idle');
      setUploadProgress(0);
      isStoppingRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  };

  const startScreenRecording = async () => {
    try {
      chunksRef.current = [];
      connectedTrackIdsRef.current.clear();

      // 1. Initialize Web Audio API context for background mixing
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (resErr) {
          console.warn("[Recording Audio] Context resume warning:", resErr);
        }
      }
      audioCtx.onstatechange = () => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
      };
      audioContextRef.current = audioCtx;
      
      const dest = audioCtx.createMediaStreamDestination();
      audioDestinationRef.current = dest;

      // Web Audio quantum ve MediaRecorder ses saatinin durmasını önlemek için aktif sessiz osilatör
      try {
        const osc = audioCtx.createOscillator();
        const silentGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        silentGain.gain.setValueAtTime(0.00001, audioCtx.currentTime); // İnsan kulağınca duyulamaz (-100 dB)
        osc.connect(silentGain);
        silentGain.connect(dest);
        osc.start();
        silentOscRef.current = osc;
      } catch (oscErr) {
        console.warn("[Recording Audio] Silent keepalive osc error:", oscErr);
      }

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

        // Dynamic track subscription hook (cleaned up on stop / unmount to avoid listener leaks)
        if (trackSubscribedHandlerRef.current) {
          room.off('trackSubscribed', trackSubscribedHandlerRef.current);
        }
        const onSubscribed = (track) => {
          if (track.kind === 'audio' && track.mediaStreamTrack) {
            connectAudioTrackToMixer(track.mediaStreamTrack);
          }
        };
        trackSubscribedHandlerRef.current = onSubscribed;
        room.on('trackSubscribed', onSubscribed);
      }

      // 4. Setup hidden canvas video capture loop
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      // Video element caching to prevent DOM tree thrashing on every frame
      let cachedScreenVideo = null;
      let cachedCameraVideos = [];
      let lastDomQueryTime = 0;
      const DOM_QUERY_INTERVAL = 400; // query DOM at most ~2.5 times a second

      const getSourceVideos = (now) => {
        if (now - lastDomQueryTime > DOM_QUERY_INTERVAL) {
          lastDomQueryTime = now;
          cachedScreenVideo = document.querySelector('.screenshare-container video');
          const camNodes = document.querySelectorAll('.camera-item video');
          cachedCameraVideos = [];
          for (let i = 0; i < camNodes.length; i++) {
            const v = camNodes[i];
            if (v.readyState >= 2 && !v.paused) {
              cachedCameraVideos.push(v);
            }
          }
        }
        return { screenShareVideo: cachedScreenVideo, cameraVideos: cachedCameraVideos };
      };

      const drawFrame = (timestamp) => {
        if (!ctx) return;

        try {
          // Draw solid dark background
          ctx.fillStyle = '#080b11';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const nowTime = timestamp || performance.now();
          const { screenShareVideo, cameraVideos } = getSourceVideos(nowTime);

          if (breakActiveRef.current) {
            // MOLA MODU KAYDI: Mola videosunu ve retro pixel başlık/sayacı ders kaydına dahil et
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const breakVideo = document.querySelector('.break-overlay-container video:not(.pointer-events-none)');
            if (breakVideo && breakVideo.readyState >= 2 && !breakVideo.paused) {
              try {
                ctx.drawImage(breakVideo, 0, 0, canvas.width, canvas.height);
              } catch (e) {}
            }

            const now = Date.now();
            const diff = Math.max(0, Math.ceil((breakEndsAtRef.current - now) / 1000));
            const m = Math.floor(diff / 60);
            const s = diff % 60;
            const timerStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

            ctx.save();
            ctx.font = '36px "Press Start 2P", cursive, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.strokeText('MOLA', canvas.width / 2, 30);
            ctx.fillStyle = '#ff6600';
            ctx.fillText('MOLA', canvas.width / 2, 30);

            ctx.textAlign = 'right';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.strokeText(timerStr, canvas.width - 40, 30);
            ctx.fillStyle = '#ff6600';
            ctx.fillText(timerStr, canvas.width - 40, 30);
            ctx.restore();
          } else if (showWhiteboardRef.current && whiteboardCanvasRef.current) {
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
              try {
                ctx.drawImage(cameraVideos[0], pipX, pipY, pipW, pipH);
              } catch (e) {}
            }
          } else if (screenShareVideo && screenShareVideo.readyState >= 2 && !screenShareVideo.paused) {
            // Draw screen share video full-screen
            try {
              ctx.drawImage(screenShareVideo, 0, 0, canvas.width, canvas.height);
            } catch (e) {}

            // Draw teacher's camera video in a PiP corner if available
            if (cameraVideos.length > 0) {
              const pipW = 240;
              const pipH = 135;
              const pipX = canvas.width - pipW - 20;
              const pipY = 20;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(pipX - 2, pipY - 2, pipW + 4, pipH + 4);
              try {
                ctx.drawImage(cameraVideos[0], pipX, pipY, pipW, pipH);
              } catch (e) {}
            }
          } else {
            // Normal camera grid
            if (cameraVideos.length === 1) {
              try {
                ctx.drawImage(cameraVideos[0], 0, 0, canvas.width, canvas.height);
              } catch (e) {}
            } else if (cameraVideos.length === 2) {
              const w = canvas.width / 2;
              const h = canvas.height;
              try {
                ctx.drawImage(cameraVideos[0], 0, 0, w, h);
                ctx.drawImage(cameraVideos[1], w, 0, w, h);
              } catch (e) {}
            } else if (cameraVideos.length > 2) {
              const w = canvas.width / 2;
              const h = canvas.height / 2;
              try {
                ctx.drawImage(cameraVideos[0], 0, 0, w, h);
                ctx.drawImage(cameraVideos[1], w, 0, w, h);
                if (cameraVideos[2]) ctx.drawImage(cameraVideos[2], 0, h, w, h);
                if (cameraVideos[3]) ctx.drawImage(cameraVideos[3], w, h, w, h);
              } catch (e) {}
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
        } finally {
          if (canvasVideoTrackRef.current && typeof canvasVideoTrackRef.current.requestFrame === 'function') {
            try {
              canvasVideoTrackRef.current.requestFrame();
            } catch (rfErr) {}
          }
        }
      };

      // Throttled loop: record at 24 FPS instead of monitor refresh rate (60-144 Hz)
      let lastDrawTime = 0;
      const TARGET_FPS = 24;
      const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~41.6ms

      const tick = (now) => {
        if (!lastDrawTime || now - lastDrawTime >= FRAME_INTERVAL) {
          lastDrawTime = now;
          drawFrame(now);
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      
      // Start active tab drawing loop
      animationFrameRef.current = requestAnimationFrame(tick);

      // Start backup background tab drawing loop — ONLY when tab is hidden
      backupIntervalRef.current = setInterval(() => {
        if (document.hidden) {
          const now = performance.now();
          if (now - lastDrawTime >= 100) { // 10 FPS in background
            lastDrawTime = now;
            drawFrame(now);
          }
        }
      }, 100);

      // 5. Build media stream (Canvas 24 FPS + Mixed Audio)
      const canvasStream = canvas.captureStream(24);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0];
      canvasVideoTrackRef.current = canvasVideoTrack;
      const combinedStream = new MediaStream();

      if (canvasVideoTrack) {
        combinedStream.addTrack(canvasVideoTrack);
      }
      
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
          const chunkIdx = chunksRef.current.length;
          const elapsedMs = Date.now() - recordingStartTimeRef.current;
          console.log(`[Recording Debug #3] Chunk #${chunkIdx} boyutu: ${e.data.size} bytes (${(e.data.size / 1024).toFixed(1)} KB) | Süre: ${(elapsedMs / 1000).toFixed(1)}s`);
        }
      };

      recorder.onerror = (e) => {
        console.error('[Recording Error] MediaRecorder hatası:', e.error || e);
      };

      recorder.onstop = async () => {
        setRecordingStatus('saving');
        const durationMs = Date.now() - recordingStartTimeRef.current;
        const durationSec = (durationMs / 1000).toFixed(2);
        const chunkCount = chunksRef.current.length;

        console.log(`[Recording Debug #1] Kayıt süresi: ${durationMs} ms (${durationSec} saniye)`);
        console.log(`[Recording Debug #2] Oluşan chunk sayısı: ${chunkCount}`);

        if (chunksRef.current.length > 0) {
          chunksRef.current.forEach((c, idx) => {
            console.log(`[Recording Debug #3 Detay] Chunk [${idx + 1}/${chunkCount}]: ${c.size} bytes`);
          });
        }

        if (silentOscRef.current) {
          try {
            silentOscRef.current.stop();
            silentOscRef.current.disconnect();
          } catch (e) {}
          silentOscRef.current = null;
        }
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
        if (trackSubscribedHandlerRef.current && room) {
          room.off('trackSubscribed', trackSubscribedHandlerRef.current);
          trackSubscribedHandlerRef.current = null;
        }

        try {
          const actualMime = recorder.mimeType || 'video/webm';
          const isMp4 = actualMime.includes('mp4');
          const rawBlob = new Blob(chunksRef.current, { type: actualMime });
          let finalBlob = rawBlob;

          console.log(`[Recording Debug #4 Ham] Final Blob (Ham) boyutu: ${rawBlob.size} bytes (${(rawBlob.size / 1024 / 1024).toFixed(2)} MB)`);

          // Bellek koruması: Sadece 80 MB altındaki WebM kayıtlarında süre metadata'sı düzeltilir.
          // Uzun derslerde (> 80 MB) ArrayBuffer tahsisi tarayıcı sekmesini dondurabilir/çökertebilir.
          // Google Drive zaten sunucu tarafında video süresini otomatik indekslemektedir.
          if (!isMp4 && rawBlob.size < 80 * 1024 * 1024) {
            try {
              console.log(`[Recording] WebM süre metadata'sı düzeltiliyor (Süre: ${durationMs} ms)...`);
              const fixed = await fixWebmDuration(rawBlob, durationMs);
              if (fixed && fixed.size >= rawBlob.size * 0.95) {
                finalBlob = fixed;
                console.log(`[Recording] WebM süre metadata başarıyla güncellendi. Yeni boyut: ${finalBlob.size} bytes`);
              } else {
                console.warn(`[Recording] WebM metadata boyut anormalliği (Ham: ${rawBlob.size}, Düzeltilmiş: ${fixed?.size}), ham blob korunuyor.`);
              }
            } catch (fixErr) {
              console.warn("[Recording] WebM metadata düzeltme uyarısı:", fixErr);
            }
          }

          console.log(`[Recording Debug #4] Final Blob boyutu: ${finalBlob.size} bytes (${(finalBlob.size / 1024 / 1024).toFixed(2)} MB)`);

          await uploadRecordingToDrive(finalBlob, actualMime, { durationMs, chunkCount });
        } catch (prepErr) {
          console.error("Recording preparation error:", prepErr);
          setRecordingStatus('idle');
          isStoppingRef.current = false;
        }
      };

      recorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setRecordingStatus('recording');

    } catch (err) {
      console.error('Error starting screen recording:', err);
      alert('Kayıt başlatılamadı: ' + (err.message || err));
      setRecordingStatus('idle');
      isStoppingRef.current = false;
      
      if (silentOscRef.current) {
        try {
          silentOscRef.current.stop();
          silentOscRef.current.disconnect();
        } catch (e) {}
        silentOscRef.current = null;
      }
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
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setRecordingStatus('saving');

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.requestData();
          }
        } catch (flushErr) {
          console.warn("[Recording] mediaRecorder.requestData flush uyarısı:", flushErr);
        }
        mediaRecorderRef.current.stop();
      } else {
        isStoppingRef.current = false;
        setRecordingStatus('idle');
      }
    } catch (err) {
      console.error("Error stopping MediaRecorder:", err);
      isStoppingRef.current = false;
      setRecordingStatus('idle');
    }
  };

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

  // Picture-in-Picture state & refs
  const [docPipWindow, setDocPipWindow] = useState(null);
  const docPipWindowRef = useRef(null);
  const pipVideoRef = useRef(null);
  const pipCanvasRef = useRef(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const enterPipRef = useRef(null);
  const exitPipRef = useRef(null);

  useEffect(() => {
    docPipWindowRef.current = docPipWindow;
  }, [docPipWindow]);

  const setupDocPipWindow = (pipWin) => {
    pipWin.document.title = 'Fulle Canlı Ders • Öğretmen Masası';
    pipWin.document.body.style.margin = '0';
    pipWin.document.body.style.padding = '0';
    pipWin.document.body.style.backgroundColor = '#080b11';
    pipWin.document.body.style.overflow = 'hidden';
    pipWin.document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    pipWin.addEventListener('pagehide', () => {
      docPipWindowRef.current = null;
      setDocPipWindow(null);
      setIsPipActive(false);
    });

    docPipWindowRef.current = pipWin;
    setDocPipWindow(pipWin);
    setIsPipActive(true);
  };

  const enterPip = () => enterPipRef.current?.();
  const exitPip = () => exitPipRef.current?.();
  const togglePip = async () => {
    if (docPipWindow) {
      try { docPipWindow.close(); } catch (e) {}
      setDocPipWindow(null);
      setIsPipActive(false);
    } else if (document.pictureInPictureElement) {
      exitPip();
    } else {
      if ('documentPictureInPicture' in window) {
        try {
          const pipWin = await window.documentPictureInPicture.requestWindow({
            width: 360,
            height: 230,
          });
          setupDocPipWindow(pipWin);
          return;
        } catch (e) {
          console.warn("Document PiP requestWindow failed, falling back:", e);
        }
      }
      enterPip();
    }
  };

  // Screen size detection for mobile & landscape phones
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
  });

  useEffect(() => {
    const handleScreenResize = () => {
      const isMob = window.innerWidth < 768 || (window.innerHeight < 550 && window.innerWidth < 1024);
      setIsMobileScreen(isMob);
    };
    window.addEventListener('resize', handleScreenResize);
    window.addEventListener('orientationchange', handleScreenResize);
    return () => {
      window.removeEventListener('resize', handleScreenResize);
      window.removeEventListener('orientationchange', handleScreenResize);
    };
  }, []);

  // Body scroll lock
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Monitor initial connection health. If initial handshake hangs beyond 25s, fallback
  useEffect(() => {
    if (connectionState === ConnectionState.Connecting) {
      const timeout = setTimeout(() => {
        console.warn("LiveKit initial connection timed out (25s). Activating fallback.");
        if (onLiveKitError) onLiveKitError();
      }, 25000);
      return () => clearTimeout(timeout);
    }
  }, [connectionState, onLiveKitError]);

  // Request media streams gracefully AFTER connecting (prevents startup crash if permission blocked/no camera)
  const hasStartedStreamsRef = useRef(false);
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant && !hasStartedStreamsRef.current) {
      hasStartedStreamsRef.current = true;
      const startStreams = async () => {
        try {
          await localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          });
        } catch (err) {
          console.warn("Could not auto-enable microphone:", err);
        }

        try {
          await localParticipant.setCameraEnabled(true);
        } catch (err) {
          console.warn("Could not auto-enable camera:", err);
        }
      };
      startStreams();
    }
  }, [connectionState, localParticipant]);

  // Tarayıcı otomatik ses engeli (Autoplay Policy) nedeniyle seslerin durmasını önle
  useEffect(() => {
    if (!room) return;
    const unlockAudio = () => {
      if (!room.canPlaybackAudio) {
        room.startAudio().catch(() => {});
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    unlockAudio();
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [room]);

  // Picture-in-Picture logic for background screen sharing
  useEffect(() => {
    let animationFrameId;
    let bgDrawInterval;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360; // Standard 16:9 canvas size for dual feed or single feed
    const ctx = canvas.getContext('2d');
    
    pipCanvasRef.current = canvas;
    
    const pipVideo = document.createElement('video');
    pipVideo.muted = true;
    pipVideo.playsInline = true;
    pipVideo.style.display = 'none';
    document.body.appendChild(pipVideo);
    pipVideoRef.current = pipVideo;

    let lastDrawTime = 0;
    const drawFrame = (timestamp) => {
      const now = timestamp || performance.now();
      if (now - lastDrawTime < 66) {
        if (document.pictureInPictureElement === pipVideo) {
          animationFrameId = requestAnimationFrame(drawFrame);
        }
        return;
      }
      lastDrawTime = now;

      // Clear canvas with dark slate background matching app theme
      ctx.fillStyle = '#080b11';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const drawCover = (video, dx, dy, dw, dh) => {
        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 360;
          const vAspect = vw / vh;
          const targetAspect = dw / dh;
          let sx, sy, sw, sh;
          if (vAspect > targetAspect) {
            sh = vh;
            sw = vh * targetAspect;
            sx = (vw - sw) / 2;
            sy = 0;
          } else {
            sw = vw;
            sh = vw / targetAspect;
            sx = 0;
            sy = (vh - sh) / 2;
          }
          ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
        } catch (e) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(dx, dy, dw, dh);
        }
      };

      const drawPlaceholder = (name, roleText, dx, dy, dw, dh, isTeacher) => {
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(dx, dy, dw, dh);
        
        const radius = Math.min(dw, dh) * 0.18;
        const cx = dx + dw / 2;
        const cy = dy + dh / 2 - 8;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTeacher ? '#f97316' : '#334155';
        ctx.fill();

        const initial = (name ? name.charAt(0) : (isTeacher ? 'Ö' : 'Ö')).toUpperCase();
        ctx.fillStyle = isTeacher ? '#0a1628' : '#e2e8f0';
        ctx.font = `bold ${Math.round(radius * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial, cx, cy);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.min(11, Math.max(8, Math.round(dh * 0.08)))}px sans-serif`;
        ctx.fillText(name || (isTeacher ? 'Öğretmen' : 'Öğrenci'), cx, cy + radius + 12);
      };

      // 1. Öğretmen Bölümü (Sol Yarı: 0, 0, 320, 360)
      const teacherContainer = document.querySelector('[data-pip="teacher"]');
      const teacherVideo = teacherContainer ? teacherContainer.querySelector('video') : null;
      const teacherName = teacherContainer?.getAttribute('data-name') || 'Öğretmen';

      if (teacherVideo && (teacherVideo.srcObject || teacherVideo.readyState >= 2)) {
        drawCover(teacherVideo, 0, 0, 320, 360);
      } else {
        drawPlaceholder(teacherName, 'Öğretmen', 0, 0, 320, 360, true);
      }

      // Öğretmen Rozeti
      ctx.fillStyle = 'rgba(249, 115, 22, 0.95)';
      ctx.fillRect(8, 8, 74, 18);
      ctx.fillStyle = '#0a1628';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ÖĞRETMEN', 45, 17);

      // İsim etiketi (sol alt)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(8, 336, 160, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(teacherName, 12, 344);

      // Dikey ayırıcı çizgi
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(320, 0);
      ctx.lineTo(320, 360);
      ctx.stroke();

      // 2. Öğrenciler Bölümü (Sağ Yarı: 320, 0, 320, 360)
      const studentCards = Array.from(document.querySelectorAll('[data-pip="student"]')).slice(0, 4);

      if (studentCards.length === 0) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(320, 0, 320, 360);
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Öğrenci Bekleniyor...', 480, 180);
      } else {
        let slots = [];
        if (studentCards.length === 1) {
          slots = [{ x: 320, y: 0, w: 320, h: 360 }];
        } else if (studentCards.length === 2) {
          slots = [
            { x: 320, y: 0, w: 320, h: 180 },
            { x: 320, y: 180, w: 320, h: 180 }
          ];
        } else {
          // 3 veya 4 öğrenci -> 2x2 grid
          slots = [
            { x: 320, y: 0, w: 160, h: 180 },
            { x: 480, y: 0, w: 160, h: 180 },
            { x: 320, y: 180, w: 160, h: 180 },
            { x: 480, y: 180, w: 160, h: 180 }
          ];
        }

        studentCards.forEach((card, idx) => {
          const slot = slots[idx];
          if (!slot) return;
          const sVideo = card.querySelector('video');
          const sName = card.getAttribute('data-name') || `Öğrenci ${idx + 1}`;

          if (sVideo && (sVideo.srcObject || sVideo.readyState >= 2)) {
            drawCover(sVideo, slot.x, slot.y, slot.w, slot.h);
          } else {
            drawPlaceholder(sName, 'Öğrenci', slot.x, slot.y, slot.w, slot.h, false);
          }

          // Çerçeve/ayraç çizgisi
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);

          // İsim etiketi
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(slot.x + 4, slot.y + slot.h - 18, Math.min(slot.w - 8, 120), 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(sName, slot.x + 8, slot.y + slot.h - 11);
        });
      }

      // Sadece standart video Picture-in-Picture modu gerçekten aktifse döngüyü sürdür (gereksiz 60 FPS CPU tüketimini önler)
      if (document.pictureInPictureElement === pipVideo) {
        animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    const enterPip = async () => {
      // Eğer yeni nesil masaüstü Document PiP paneli zaten açıksa video PiP başlatma
      if (docPipWindowRef.current || (typeof window !== 'undefined' && window.documentPictureInPicture && window.documentPictureInPicture.window)) {
        return;
      }
      try {
        if (!pipVideo || !canvas) return;
        drawFrame();
        if (!pipVideo.srcObject) {
          const stream = canvas.captureStream(15);
          pipVideo.srcObject = stream;
        }
        await pipVideo.play();
        if (document.pictureInPictureEnabled && document.pictureInPictureElement !== pipVideo) {
          await pipVideo.requestPictureInPicture();
          setIsPipActive(true);
          console.log('Entered PiP stream successfully');
        }
      } catch (err) {
        console.warn('enterPip warning:', err);
      }
    };

    const exitPip = async () => {
      try {
        if (docPipWindowRef.current) {
          docPipWindowRef.current.close();
        }
        if ('documentPictureInPicture' in window && window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
        }
      } catch (e) {}
      docPipWindowRef.current = null;
      setDocPipWindow(null);

      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      } catch (err) {
        console.warn('exitPip warning:', err);
      }
      setIsPipActive(false);
    };

    enterPipRef.current = enterPip;
    exitPipRef.current = exitPip;

    const handleVisibilityChange = async () => {
      if (!isScreenSharing) return;
      if (docPipWindowRef.current || (typeof window !== 'undefined' && window.documentPictureInPicture && window.documentPictureInPicture.window)) {
        return;
      }

      if (document.visibilityState === 'hidden') {
        enterPip();
      } else {
        exitPip();
      }
    };

    const handleLeavePiP = () => {
      setIsPipActive(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (pipVideo.srcObject) {
        pipVideo.srcObject.getTracks().forEach(track => track.stop());
        pipVideo.srcObject = null;
      }
    };

    const handleEnterPiP = () => {
      setIsPipActive(true);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    pipVideo.addEventListener('leavepictureinpicture', handleLeavePiP);
    pipVideo.addEventListener('enterpictureinpicture', handleEnterPiP);

    // Arka plan çizim döngüsü — sadece standart video PiP açıkken ve sekme gizliyken çalışır
    bgDrawInterval = setInterval(() => {
      if (document.hidden && document.pictureInPictureElement === pipVideo) {
        drawFrame();
      }
    }, 100);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pipVideo.removeEventListener('leavepictureinpicture', handleLeavePiP);
      pipVideo.removeEventListener('enterpictureinpicture', handleEnterPiP);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (bgDrawInterval) {
        clearInterval(bgDrawInterval);
      }
      if (pipVideo.srcObject) {
        pipVideo.srcObject.getTracks().forEach(track => track.stop());
      }
      if (pipVideo.parentNode) {
        pipVideo.parentNode.removeChild(pipVideo);
      }
      try {
        if ('documentPictureInPicture' in window && window.documentPictureInPicture.window) {
          window.documentPictureInPicture.window.close();
        }
      } catch (e) {}
      setDocPipWindow(null);
      pipVideoRef.current = null;
      pipCanvasRef.current = null;
      enterPipRef.current = null;
      exitPipRef.current = null;
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

  const toggleMicrophone = async () => {
    if (!localParticipant) return;
    if (breakActive) {
      alert('Mola esnasında mikrofon açılamaz.');
      return;
    }
    try {
      const nextState = !isMicrophoneEnabled;
      if (nextState) {
        await localParticipant.setMicrophoneEnabled(true, {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        });
      } else {
        await localParticipant.setMicrophoneEnabled(false);
      }
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
    if (breakActive) {
      alert('Mola esnasında kamera açılamaz.');
      return;
    }
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
      if (!isCurrentlySharing) {
        // Öğretmen ekran paylaşımı başlattığında:
        // Chrome/Edge'de Document PiP doğrudan bu kullanıcı tıklama olayında (user gesture) tetiklenmeli
        let openedWin = null;
        if ('documentPictureInPicture' in window && !docPipWindow) {
          try {
            openedWin = await window.documentPictureInPicture.requestWindow({
              width: 360,
              height: 230,
            });
            setupDocPipWindow(openedWin);
          } catch (e) {
            console.warn("Could not pre-open Document PiP on screen share click:", e);
          }
        }

        try {
          const trackPub = await localParticipant.setScreenShareEnabled(true, {
            resolution: ScreenSharePresets.h1080fps15.resolution,
            contentHint: 'detail',
            suppressLocalAudioPlayback: true
          }, {
            videoCodec: 'vp8',
            maxBitrate: 2500000,
            dtx: true
          });

          // Tarayıcının kendi "Paylaşımı Durdur" butonuna basıldığında PiP penceresini otomatik kapat
          const mediaTrack = trackPub?.track?.mediaStreamTrack;
          if (mediaTrack) {
            mediaTrack.addEventListener('ended', () => {
              exitPip();
            }, { once: true });
          }
        } catch (shareErr) {
          // Kullanıcı ekran seçme diyaloğunu iptal ederse açılan pencereyi kapat
          if (openedWin) {
            try { openedWin.close(); } catch (e) {}
            setDocPipWindow(null);
            setIsPipActive(false);
          }
          throw shareErr;
        }

        if (!openedWin) {
          enterPip();
        }
      } else {
        await localParticipant.setScreenShareEnabled(false);
        exitPip();
      }
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

  // Render loading state ONLY during initial room connecting (never tear down during brief reconnection)
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 text-white font-sans overflow-hidden" style={{ backgroundColor: '#0a1628' }}>
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute w-full h-full border-4 border-primary/20 rounded-full"></div>
          <div className="absolute w-full h-full border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Sınıf Sunucusuna Bağlanılıyor...
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col font-sans text-slate-100 overflow-hidden"
      style={{ backgroundColor: '#0a1628' }}
    >
      {/* Reconnecting subtle banner (keeps video and DOM intact) */}
      {connectionState === ConnectionState.Reconnecting && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100000] bg-amber-500/95 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-pulse select-none border border-amber-400">
          <span className="material-symbols-outlined text-sm">sync</span>
          <span>Bağlantı yenileniyor, lütfen bekleyin...</span>
        </div>
      )}

      {/* Top Header - Mobilde tamamen gizlenir, derse maksimum alan açılır */}
      <div 
        className={`px-5 py-3.5 items-center justify-between border-b border-[#162540] z-10 shadow-sm relative shrink-0 ${isMobileScreen ? 'hidden' : 'hidden md:flex'}`} 
        style={{ 
          backgroundColor: '#0d1e35',
          display: isMobileScreen ? 'none' : undefined
        }}
      >
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
            
            {showWhiteboard && (
              <FloatingCameraOverlay
                isTeacherRole={isTeacherRole}
                teacherParticipant={teacherParticipant}
                teacherTrackRef={teacherTrackRef}
                studentParticipants={studentParticipants}
                cameraTracks={cameraTracks}
                isPipActive={isPipActive}
                togglePip={togglePip}
                isMicrophoneEnabled={isMicrophoneEnabled}
                toggleMicrophone={toggleMicrophone}
                isCameraEnabled={isCameraEnabled}
                toggleCamera={toggleCamera}
              />
            )}
          </div>

          {/* Screen Share / Grid views - rendered when whiteboard is not active */}
          {!showWhiteboard && (
            isScreenSharing ? (
              // A. LAYOUT: SCREEN SHARING ACTIVE (HARDWARE ACCELERATED & ZERO RE-RENDER)
              <div className="w-full h-full flex items-center justify-center p-3 relative bg-black">
                <ScreenShareViewer trackRef={activeScreenTrackRef} />

                {/* Webcams Float Box (Draggable, isolated from ScreenShare) */}
                <FloatingCameraOverlay
                  isTeacherRole={isTeacherRole}
                  teacherParticipant={teacherParticipant}
                  teacherTrackRef={teacherTrackRef}
                  studentParticipants={studentParticipants}
                  cameraTracks={cameraTracks}
                  isPipActive={isPipActive}
                  togglePip={togglePip}
                  isMicrophoneEnabled={isMicrophoneEnabled}
                  toggleMicrophone={toggleMicrophone}
                  isCameraEnabled={isCameraEnabled}
                  toggleCamera={toggleCamera}
                />
              </div>
            ) : (
              // B. LAYOUT: NORMAL GRID OF WEBCAMS
              <div className="w-full h-full flex items-center justify-center p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[104rem] w-full">
                  {cameraTracks.map((trackRef) => {
                    const isTeacher = checkIsTeacher(trackRef.participant);
                    const isLocal = trackRef.participant.isLocal;
                    const trackKey = trackRef.publication?.trackSid || trackRef.track?.sid || `${trackRef.participant.identity}_${trackRef.source}`;
                    const name = trackRef.participant.name || trackRef.participant.identity;
                    return (
                      <GridCameraTile
                        key={trackKey}
                        trackRef={trackRef}
                        isTeacher={isTeacher}
                        isLocal={isLocal}
                        name={name}
                        isSpeaking={trackRef.participant.isSpeaking}
                      />
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

          {/* Teacher Mola (Break) Controls */}
          {isTeacherRole && (
            <div className="relative device-menu-container">
              <button
                onClick={() => setShowBreakMenu(!showBreakMenu)}
                className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow-md bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-extrabold hover:scale-102"
                title="Mola Modu"
              >
                <span className="material-symbols-outlined text-base">free_breakfast</span>
                <span className="hidden md:inline">Mola</span>
              </button>

              {/* Mola Selection Popover */}
              {showBreakMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-[999999] animate-in fade-in slide-in-from-bottom-1 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <h6 className="font-extrabold text-xs text-slate-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-400 text-base">free_breakfast</span>
                      Mola Süresi Seçin
                    </h6>
                    <button
                      onClick={() => setShowBreakMenu(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setSelectedDuration(5); setCustomMinutes(''); }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedDuration === 5 && !customMinutes
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                            : 'bg-slate-800 text-slate-300 border-slate-750 hover:bg-slate-750'
                        }`}
                      >
                        5 Dakika
                      </button>
                      <button
                        onClick={() => { setSelectedDuration(10); setCustomMinutes(''); }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedDuration === 10 && !customMinutes
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                            : 'bg-slate-800 text-slate-300 border-slate-750 hover:bg-slate-750'
                        }`}
                      >
                        10 Dakika
                      </button>
                    </div>

                    {/* Custom Duration Input */}
                    <div className="flex flex-col gap-1 mt-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Özel Süre (Dakika)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Örn: 7"
                        value={customMinutes}
                        onChange={(e) => {
                          setCustomMinutes(e.target.value);
                          if (e.target.value) setSelectedDuration(null);
                        }}
                        className="bg-slate-800 border border-slate-750 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const dur = customMinutes ? Number(customMinutes) : selectedDuration;
                        startBreakTeacher(dur);
                      }}
                      className="mt-2 w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      MOLAYI BAŞLAT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Screen Share Button - Sadece Öğretmen */}
          {isTeacherRole && (
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
          )}

          {/* PiP Floating Window Button for desktop overlay - Sadece Öğretmen */}
          {(isTeacherRole && isScreenSharing) && (
            <button
              onClick={togglePip}
              title={isPipActive ? "Masaüstü Penceresini Kapat" : "Masaüstü Küçük Penceresini Aç (Diğer programların üstünde göster)"}
              className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer shadow-md hover:scale-102 ${
                isPipActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-750'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isPipActive ? 'pip_exit' : 'picture_in_picture_alt'}
              </span>
              <span className="hidden md:inline">{isPipActive ? 'Masaüstünde Açık' : 'Masaüstüne Al (PiP)'}</span>
            </button>
          )}

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

      {/* Emergency Recording Rescue Modal */}
      {failedRecordingBlob && (
        <div className="fixed inset-0 z-[100001] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-4xl">cloud_off</span>
            </div>
            <h3 className="font-black text-slate-100 text-lg">Ders Kaydı Güvende!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ders kaydınız başarıyla tamamlandı ancak internet veya Google Drive bağlantısındaki bir aksaklık nedeniyle sunucuya iletilemedi.
              <strong className="block mt-1 text-amber-400">Kaydınız tarayıcınızda güvende, kaybolmadı!</strong>
              Aşağıdaki butonla videoyu bilgisayarınıza indirebilir veya yüklemeyi tekrar deneyebilirsiniz.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={URL.createObjectURL(failedRecordingBlob)}
                download={failedRecordingName || `Ders_${lessonId}_Kayit.webm`}
                className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Ders Kaydını Bilgisayara İndir
              </a>
              <button
                onClick={() => {
                  const blobToRetry = failedRecordingBlob;
                  const mimeToRetry = failedRecordingBlob.type || 'video/webm';
                  setFailedRecordingBlob(null);
                  uploadRecordingToDrive(blobToRetry, mimeToRetry);
                }}
                disabled={recordingStatus === 'saving'}
                className="bg-primary hover:bg-primary/90 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">sync</span>
                Yüklemeyi Tekrar Dene
              </button>
              <button
                onClick={() => setFailedRecordingBlob(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Pencereyi Kapat
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

      {/* Fullscreen Break Overlay */}
      {breakActive && (
        <BreakOverlay
          breakEndsAt={breakEndsAt}
          isTeacher={isTeacherRole}
          onEndBreak={endBreakTeacher}
        />
      )}

      {/* Desktop Document Picture-in-Picture Floating Window Portal */}
      {docPipWindow && createPortal(
        <DesktopPipWindow
          cameraTracks={cameraTracks}
          teacherTrackRef={teacherTrackRef}
          isMicrophoneEnabled={isMicrophoneEnabled}
          isCameraEnabled={isCameraEnabled}
          toggleMicrophone={toggleMicrophone}
          toggleCamera={toggleCamera}
          studentParticipants={studentParticipants}
          teacherParticipant={teacherParticipant}
          muteParticipantTrack={muteParticipantTrack}
          mutingParticipant={mutingParticipant}
          chatMessages={chatMessages}
          sendChatMessage={sendChatMessage}
          chatInput={chatInput}
          setChatInput={setChatInput}
          toggleScreenShare={toggleScreenShare}
          meetingStartTime={meetingStartTime}
          breakActive={breakActive}
          startBreakTeacher={startBreakTeacher}
          endBreakTeacher={endBreakTeacher}
        />,
        docPipWindow.document.body
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
      onDisconnected={(reason) => {
        console.warn("LiveKit room disconnected:", reason);
        if (!isLeavingRef.current) {
          handleLiveKitError();
        }
      }}
      onError={(err) => {
        console.error("LiveKit connection error:", err);
        handleLiveKitError();
      }}
      connectOptions={LIVEKIT_CONNECT_OPTIONS}
      options={LIVEKIT_ROOM_OPTIONS}
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
