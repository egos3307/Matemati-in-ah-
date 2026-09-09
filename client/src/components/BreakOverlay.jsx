import React, { useEffect, useRef, useState } from 'react';

const BreakOverlay = ({ breakEndsAt, isTeacher, onEndBreak }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const mainLoopVideoRef = useRef(null);
  const endingVideoRef = useRef(null);
  const [showEndingVideo, setShowEndingVideo] = useState(false);

  // Remaining time calculation based on server timestamp breakEndsAt
  useEffect(() => {
    const updateRemaining = () => {
      const now = Date.now();
      if (!breakEndsAt || breakEndsAt <= now) {
        setRemainingSeconds(0);
        return;
      }

      const diff = Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
      setRemainingSeconds(diff);

      // Molanın son 10 saniyesine kadar sonvideo.mp4 kesintisiz loop etsin.
      // Molanın bitmesine TAM 10 saniye kaldığında (diff <= 10) ilkvideo.mp4 oynasın.
      if (diff <= 10) {
        setShowEndingVideo(true);
      } else {
        setShowEndingVideo(false);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 250);
    return () => clearInterval(interval);
  }, [breakEndsAt]);

  // Video transition logic: sonvideo.mp4 (main loop) -> ilkvideo.mp4 (ending)
  useEffect(() => {
    if (showEndingVideo) {
      if (mainLoopVideoRef.current) {
        mainLoopVideoRef.current.pause();
      }
      if (endingVideoRef.current) {
        endingVideoRef.current.currentTime = 0;
        endingVideoRef.current
          .play()
          .catch((e) => console.warn('Ending video play error:', e));
      }
    } else {
      if (endingVideoRef.current) {
        endingVideoRef.current.pause();
      }
      if (mainLoopVideoRef.current && mainLoopVideoRef.current.paused) {
        mainLoopVideoRef.current
          .play()
          .catch((e) => console.warn('Main loop video play error:', e));
      }
    }
  }, [showEndingVideo]);

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
      {/* Video Container (Fullscreen 16:9 object-fit cover) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
        {/* Main background video: sonvideo.mp4 (loops continuously until last 10s) */}
        <video
          ref={mainLoopVideoRef}
          src="/sonvideo.mp4"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            showEndingVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Ending video: ilkvideo.mp4 (plays once in last 10s) */}
        <video
          ref={endingVideoRef}
          src="/ilkvideo.mp4"
          preload="auto"
          muted
          playsInline
          controls={false}
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            showEndingVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
