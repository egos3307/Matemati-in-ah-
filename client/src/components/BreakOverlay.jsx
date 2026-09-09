import React, { useEffect, useRef, useState } from 'react';

const BreakOverlay = ({ breakEndsAt, isTeacher, onEndBreak }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const ilkVideoRef = useRef(null);
  const sonVideoRef = useRef(null);
  const [showSonVideo, setShowSonVideo] = useState(false);

  // Remaining time calculation based on server timestamp breakEndsAt
  useEffect(() => {
    const updateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((breakEndsAt - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 10 && !showSonVideo) {
        setShowSonVideo(true);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 500);
    return () => clearInterval(interval);
  }, [breakEndsAt, showSonVideo]);

  // Video transition logic (ilkvideo.mp4 -> sonvideo.mp4)
  useEffect(() => {
    if (showSonVideo) {
      if (ilkVideoRef.current) {
        ilkVideoRef.current.pause();
      }
      if (sonVideoRef.current) {
        sonVideoRef.current.currentTime = 0;
        sonVideoRef.current
          .play()
          .catch((e) => console.warn('Son video oynatma hatası:', e));
      }
    } else {
      if (ilkVideoRef.current) {
        ilkVideoRef.current
          .play()
          .catch((e) => console.warn('İlk video oynatma hatası:', e));
      }
    }
  }, [showSonVideo]);

  // Format MM:SS
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black overflow-hidden flex flex-col justify-between select-none font-sans">
      {/* Video Container (Fullscreen 16:9 object-fit cover) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
        {/* Main background video (ilkvideo.mp4) */}
        <video
          ref={ilkVideoRef}
          src="/ilkvideo.mp4"
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            showSonVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Ending video (sonvideo.mp4 - preloaded, single play) */}
        <video
          ref={sonVideoRef}
          src="/sonvideo.mp4"
          preload="auto"
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            showSonVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
        <div className="relative z-10 p-4 sm:p-6 flex justify-center pointer-events-auto">
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
