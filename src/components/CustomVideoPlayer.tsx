import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  FastForward, 
  Settings, 
  Sparkles,
  Check,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface CustomVideoPlayerProps {
  url: string;
  title: string;
  isPlaying?: boolean;
  onCompleted?: () => void;
  onProgress?: (percent: number) => void;
}

export default function CustomVideoPlayer({ 
  url, 
  title, 
  isPlaying = false, 
  onCompleted,
  onProgress 
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(isPlaying);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasCompletedTriggered, setHasCompletedTriggered] = useState(false);

  // Sync isPlaying from Parent
  useEffect(() => {
    setPlaying(isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle Play/Pause change
  useEffect(() => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing]);

  // Auto hide controls when playing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (playing && showControls) {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
    return () => clearTimeout(timeoutId);
  }, [playing, showControls]);

  const togglePlay = () => {
    setPlaying(!playing);
    setShowControls(true);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration || 0,
        Math.max(0, videoRef.current.currentTime + seconds)
      );
      setShowControls(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      const total = videoRef.current.duration || 0;
      
      const progressPercent = total > 0 ? (current / total) * 100 : 0;
      if (onProgress) {
        onProgress(progressPercent);
      }

      // If user watched more than 85% of the video, mark as complete automatically
      if (progressPercent > 85 && !hasCompletedTriggered) {
        setHasCompletedTriggered(true);
        if (onCompleted) {
          onCompleted();
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const value = parseFloat(e.target.value);
      const newTime = (value / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setShowControls(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    setMuted(value === 0);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if container is focused or active
      if (!containerRef.current || !document.activeElement || !containerRef.current.contains(document.activeElement)) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          if (videoRef.current) videoRef.current.volume = newVolUp;
          break;
        case 'ArrowDown':
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          if (videoRef.current) videoRef.current.volume = newVolDown;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, volume, isFullscreen]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden outline-none group select-none font-sans"
      dir="ltr"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={url}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Large Center Play/Pause Overlay */}
      <div 
        onClick={togglePlay}
        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300 ${
          playing && !showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="w-16 h-16 flex items-center justify-center bg-yellow-400 text-black rounded-full border-4 border-black hover:scale-110 active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="translate-x-0.5" fill="currentColor" />}
        </button>
      </div>

      {/* Top Header Information */}
      <div 
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-white font-black text-sm block sm:text-base">{title}</span>
            <span className="text-indigo-300 text-xs font-bold block">مشغل أكاديمية العراق الذكي • Smart Player 🔮</span>
          </div>
        </div>

        {hasCompletedTriggered && (
          <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-black border-2 border-black px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CheckCircle2 size={14} className="animate-bounce" />
            <span>محسوبة كمكتملة</span>
          </div>
        )}
      </div>

      {/* Bottom Custom Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-transform duration-300 flex flex-col gap-3 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress scrub bar */}
        <div className="w-full flex items-center gap-3">
          <span className="text-slate-300 text-xs font-black select-none w-10 text-center">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative flex items-center group/progress h-5 select-none">
            <input
              type="range"
              min="0"
              max="100"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
              className="w-full h-1.5 rounded-lg bg-slate-700/80 outline-none appearance-none cursor-pointer accent-yellow-400 group-hover/progress:h-2 transition-all"
              style={{
                background: `linear-gradient(to right, #facc15 0%, #facc15 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(51, 65, 85, 0.8) ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(51, 65, 85, 0.8) 100%)`
              }}
            />
          </div>

          <span className="text-slate-300 text-xs font-black select-none w-10 text-center">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play/Pause icon */}
            <button 
              onClick={togglePlay}
              className="p-1.5 text-white hover:text-yellow-400 active:scale-90 transition-transform"
              title={playing ? "إيقاف مؤقت" : "تشغيل"}
            >
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            {/* Skip 10s back */}
            <button 
              onClick={() => skip(-10)}
              className="p-1.5 text-slate-300 hover:text-white active:scale-95 transition-transform flex items-center justify-center relative"
              title="رجوع 10 ثواني"
            >
              <RotateCcw size={18} />
              <span className="text-[9px] font-black absolute" style={{ bottom: '-2px' }}>10</span>
            </button>

            {/* Skip 10s forward */}
            <button 
              onClick={() => skip(10)}
              className="p-1.5 text-slate-300 hover:text-white active:scale-95 transition-transform flex items-center justify-center relative"
              title="تقدم 10 ثواني"
            >
              <RotateCw size={18} />
              <span className="text-[9px] font-black absolute" style={{ bottom: '-2px' }}>10</span>
            </button>

            {/* Volume section */}
            <div className="flex items-center gap-1 group/volume">
              <button 
                onClick={toggleMute}
                className="p-1.5 text-slate-300 hover:text-white transition-colors"
                title={muted ? "إلغاء كتم الصوت" : "كتم الصوت"}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 transition-all duration-300 h-1 rounded-lg bg-slate-700 outline-none cursor-pointer accent-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Speed Control Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-black flex items-center gap-1 transition-all"
                title="سرعة التشغيل"
              >
                <span>{playbackRate}x</span>
                <Settings size={12} className="opacity-70" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border-2 border-black rounded-xl p-1.5 flex flex-col gap-1 w-24 text-right shadow-2xl z-50">
                  <span className="text-[10px] text-zinc-400 font-black px-2 pb-1.5 border-b border-zinc-800 text-center select-none block">سرعة الفيديو</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`text-xs px-2 py-1.5 rounded-lg text-left font-black transition-colors flex items-center justify-between w-full ${
                        playbackRate === speed 
                          ? 'bg-yellow-400 text-black font-black' 
                          : 'text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      <span>{speed}x</span>
                      {playbackRate === speed && <Check size={12} className="ml-1" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen control */}
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-white"
              title={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
