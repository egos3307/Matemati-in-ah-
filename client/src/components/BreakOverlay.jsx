import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// İzole Sayaç Bileşeni: Sadece sayacı günceller, video ve arka plan öğelerini re-render etmez
const BreakTimerCounter = React.memo(({ breakEndsAt, onPhaseChange }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const now = Date.now();
    return (!breakEndsAt || breakEndsAt <= now) ? 0 : Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (!breakEndsAt || breakEndsAt <= now) {
        setRemainingSeconds(0);
        onPhaseChange(true);
        return;
      }

      const diff = Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
      setRemainingSeconds(prev => (prev === diff ? prev : diff));
      onPhaseChange(diff <= 10);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [breakEndsAt, onPhaseChange]);

  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  return (
    <span
      className="font-pixel text-2xl sm:text-4xl md:text-5xl text-[#ff6600] tracking-wider"
      style={{
        textShadow:
          '3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0 0 20px rgba(255, 102, 0, 0.7)',
        fontFamily: '"Press Start 2P", monospace, cursive, sans-serif'
      }}
    >
      {timeStr}
    </span>
  );
});

const BreakOverlay = React.memo(({ breakEndsAt, isTeacher, onEndBreak }) => {
  const [isLast10Seconds, setIsLast10Seconds] = useState(false);

  const mainVideoRef = useRef(null);
  const endingVideoRef = useRef(null);
  const audioRef = useRef(null);

  const handlePhaseChange = React.useCallback((isLast10) => {
    setIsLast10Seconds(prev => (prev === isLast10 ? prev : isLast10));
  }, []);

  // Background Audio Control (pages_turning_slowly.mp3 loops during break)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.25;
      audioRef.current.play().catch(() => {});
    }
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (e) {}
      }
    };
  }, []);

  // 2. Video Playback Control (sonvideo.mp4 -> ilkvideo.mp4)
  useEffect(() => {
    if (isLast10Seconds) {
      // Pause main looping video (sonvideo.mp4)
      if (mainVideoRef.current) {
        try { mainVideoRef.current.pause(); } catch (e) {}
      }
      // Play ending video (ilkvideo.mp4)
      if (endingVideoRef.current) {
        try {
          endingVideoRef.current.currentTime = 0;
          endingVideoRef.current.play().catch(() => {});
        } catch (e) {}
      }
    } else {
      // Pause ending video
      if (endingVideoRef.current) {
        try { endingVideoRef.current.pause(); } catch (e) {}
      }
      // Play main looping video (sonvideo.mp4)
      if (mainVideoRef.current) {
        try {
          mainVideoRef.current.play().catch(() => {});
        } catch (e) {}
      }
    }
  }, [isLast10Seconds]);

  const mountTarget = (typeof document !== 'undefined' && document.fullscreenElement) 
    ? document.fullscreenElement 
    : (typeof document !== 'undefined' ? document.body : null);

  if (!mountTarget) return null;

  return createPortal(
    <div
      className="break-overlay-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000',
        zIndex: 2147483647, // En yüksek z-index: Her şeyin, tüm menü ve modalların üzerinde tam ekran
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        fontFamily: 'sans-serif',
        touchAction: 'none'
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Background Ambient Audio: pages_turning_slowly.mp3 */}
      <audio
        ref={audioRef}
        src="/pages_turning_slowly.mp3"
        loop
        preload="auto"
      />

      {/* Fullscreen Video Container */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#000000',
          pointerEvents: 'none'
        }}
      >
        {/* Main Background Video: sonvideo.mp4 (Loops from break start until last 10s) */}
        <video
          ref={mainVideoRef}
          src="/sonvideo.mp4"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 300ms ease',
            opacity: isLast10Seconds ? 0 : 1,
            pointerEvents: 'none'
          }}
        />

        {/* Ending Video: ilkvideo.mp4 (Plays once in the last 10s) */}
        <video
          ref={endingVideoRef}
          src="/ilkvideo.mp4"
          preload="auto"
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 300ms ease',
            opacity: isLast10Seconds ? 1 : 0,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Header Overlay: PIXEL MOLA TEXT & TIMER */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* Left Spacer to balance flex layout */}
        <div style={{ width: '100px', display: 'none' }} className="sm:block" />

        {/* Top Center: Retro Pixel "MOLA" */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <h1
            className="font-pixel text-3xl sm:text-5xl md:text-6xl text-[#ff6600] tracking-widest uppercase"
            style={{
              textShadow:
                '3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0 0 20px rgba(255, 102, 0, 0.7)',
              margin: 0,
              fontFamily: '"Press Start 2P", monospace, cursive, sans-serif'
            }}
          >
            MOLA
          </h1>
        </div>

        {/* Top Right: Retro Pixel Counter */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BreakTimerCounter breakEndsAt={breakEndsAt} onPhaseChange={handlePhaseChange} />
        </div>
      </div>

      {/* Bottom Floating Control for Teacher ONLY */}
      {isTeacher && (
        <div
          style={{
            position: 'relative',
            zIndex: 20,
            padding: '24px',
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEndBreak}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: '14px',
              padding: '12px 28px',
              borderRadius: '16px',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.5), 0 8px 10px -6px rgba(220, 38, 38, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>stop_circle</span>
            MOLAYI BİTİR
          </button>
        </div>
      )}
    </div>,
    mountTarget
  );
});

export default BreakOverlay;
