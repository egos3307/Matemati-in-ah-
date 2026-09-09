import React, { useEffect, useRef, useState } from 'react';

const BreakOverlay = ({ breakEndsAt, isTeacher, onEndBreak }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLast10Seconds, setIsLast10Seconds] = useState(false);

  const mainVideoRef = useRef(null);
  const endingVideoRef = useRef(null);

  // 1. Timer & Phase Calculation
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      if (!breakEndsAt || breakEndsAt <= now) {
        setRemainingSeconds(0);
        setIsLast10Seconds(true);
        return;
      }

      const diff = Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
      setRemainingSeconds(diff);

      // Molanın başından beri sonvideo.mp4 döngüsel oynar.
      // Son 10 saniyeye girildiğinde (diff <= 10) ilkvideo.mp4 devreye girer.
      if (diff <= 10) {
        setIsLast10Seconds(true);
      } else {
        setIsLast10Seconds(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [breakEndsAt]);

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

  // Format MM:SS
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-[999999] bg-black overflow-hidden flex flex-col justify-between select-none font-sans break-overlay-container touch-none"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Fullscreen Video Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
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
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLast10Seconds ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLast10Seconds ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      </div>

      {/* Header Overlay: PIXEL MOLA TEXT & TIMER */}
      <div className="relative z-10 w-full px-4 sm:px-8 py-4 sm:py-6 flex items-start justify-between pointer-events-none">
        {/* Left Spacer to balance flex layout */}
        <div className="w-20 sm:w-32 hidden sm:block"></div>

        {/* Top Center: Retro Pixel "MOLA" */}
        <div className="flex-1 flex justify-center">
          <h1
            className="font-pixel text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#ff6600] tracking-widest uppercase"
            style={{
              textShadow:
                '3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0 0 15px rgba(255, 102, 0, 0.6)',
            }}
          >
            MOLA
          </h1>
        </div>

        {/* Top Right: Retro Pixel Counter */}
        <div className="flex items-center">
          <span
            className="font-pixel text-xl sm:text-3xl md:text-4xl lg:text-5xl text-[#ff6600] tracking-wider"
            style={{
              textShadow:
                '3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000, 0 0 15px rgba(255, 102, 0, 0.6)',
            }}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Bottom Floating Control for Teacher ONLY */}
      {isTeacher && (
        <div
          className="relative z-10 p-4 sm:p-6 flex justify-center pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEndBreak}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs sm:text-sm px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl shadow-2xl border border-red-400/40 flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">stop_circle</span>
            MOLAYI BİTİR
          </button>
        </div>
      )}
    </div>
  );
};

export default BreakOverlay;
