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
  Settings, 
  Sparkles,
  Check,
  CheckCircle2
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
  const playerjsInstanceRef = useRef<any>(null);

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
  const [playerjsLoaded, setPlayerjsLoaded] = useState(false);

  // 1. Dynamic Script Loader for Playerjs.com
  useEffect(() => {
    // Check if Playerjs already exists globally
    if ((window as any).Playerjs) {
      setPlayerjsLoaded(true);
      return;
    }

    // Attempt to load player.js from public folder or custom source
    const script = document.createElement('script');
    script.src = '/player.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).Playerjs) {
        setPlayerjsLoaded(true);
      }
    };
    script.onerror = () => {
      // If /player.js falls back or is not uploaded, we'll try /playerjs.js
      const fallbackScript = document.createElement('script');
      fallbackScript.src = '/playerjs.js';
      fallbackScript.async = true;
      fallbackScript.onload = () => {
        if ((window as any).Playerjs) {
          setPlayerjsLoaded(true);
        }
      };
      fallbackScript.onerror = () => {
        console.log("PlayerJS script not loaded. Gracefully falling back to default HTML5 system player.");
      };
      document.body.appendChild(fallbackScript);
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 2. Initializing PlayerJS when script is ready
  useEffect(() => {
    if (!playerjsLoaded || !(window as any).Playerjs) return;

    const container = document.getElementById('playerjs-container');
    if (!container) return;

    // Destroy existing instance if any
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.destroy();
      } catch (e) {}
      playerjsInstanceRef.current = null;
    }

    // Create a unique callback name or standard listener for events
    const playerInstance = new (window as any).Playerjs({
      id: "playerjs-container",
      file: url,
      autoplay: isPlaying ? 1 : 0
    });

    playerjsInstanceRef.current = playerInstance;

    // Define Playerjs events listener
    const handlePlayerjsEvents = (event: string, id: string, data: any) => {
      if (id !== "playerjs-container") return;

      switch (event) {
        case "play":
          setPlaying(true);
          break;
        case "pause":
          setPlaying(false);
          break;
        case "time": {
          const t = parseFloat(data);
          if (!isNaN(t)) setCurrentTime(t);
          break;
        }
        case "duration": {
          const d = parseFloat(data);
          if (!isNaN(d)) setDuration(d);
          break;
        }
        default:
          break;
      }
    };

    // Register globally for the custom player engine to dispatch events
    (window as any).PlayerjsEvents = handlePlayerjsEvents;

    // Sync playing status to playerjs if isPlaying changes
    return () => {
      if (playerInstance) {
        try {
          playerInstance.api("stop");
        } catch (e) {}
      }
    };
  }, [playerjsLoaded, url]);

  // Sync isPlaying with PlayerJS instance
  useEffect(() => {
    if (playerjsInstanceRef.current) {
      try {
        if (isPlaying) {
          playerjsInstanceRef.current.api("play");
        } else {
          playerjsInstanceRef.current.api("pause");
        }
      } catch (e) {}
    }
  }, [isPlaying, playerjsLoaded]);

  // 3. Fallback Mode (HTML5 Video Controls)
  // Sync isPlaying from Parent
  useEffect(() => {
    if (playerjsLoaded) return;
    setPlaying(isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, playerjsLoaded]);

  // Handle Play/Pause change
  useEffect(() => {
    if (playerjsLoaded) return;
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [playing, playerjsLoaded]);

  // Auto hide controls when playing
  useEffect(() => {
    if (playerjsLoaded) return;
    let timeoutId: NodeJS.Timeout;
    if (playing && showControls) {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
    return () => clearTimeout(timeoutId);
  }, [playing, showControls, playerjsLoaded]);

  // 4. Unified Lesson Completion and progress tracker
  useEffect(() => {
    if (duration > 0) {
      const progressPercent = (currentTime / duration) * 100;
      if (onProgress) {
        onProgress(progressPercent);
      }

      // Automatically mark as complete at 85% computed watch time
      if (progressPercent > 85 && !hasCompletedTriggered) {
        setHasCompletedTriggered(true);
        if (onCompleted) {
          onCompleted();
        }
      }
    }
  }, [currentTime, duration, hasCompletedTriggered, onCompleted, onProgress]);

  const togglePlay = () => {
    if (playerjsInstanceRef.current) {
      try {
        if (playing) {
          playerjsInstanceRef.current.api("pause");
        } else {
          playerjsInstanceRef.current.api("play");
        }
      } catch (e) {}
    } else {
      setPlaying(!playing);
      setShowControls(true);
    }
  };

  const skip = (seconds: number) => {
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.api("seek", currentTime + seconds);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration || 0,
        Math.max(0, videoRef.current.currentTime + seconds)
      );
      setShowControls(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newTime = (value / 100) * duration;
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.api("seek", newTime);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setShowControls(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    setMuted(value === 0);
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.api("volume", value);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.api("mute", nextMuted ? 1 : 0);
      } catch (e) {}
    } else if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      videoRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (playerjsInstanceRef.current) {
      try {
        playerjsInstanceRef.current.api("speed", speed);
      } catch (e) {}
    } else if (videoRef.current) {
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
  }, [playing, volume, isFullscreen, playerjsLoaded]);

  // Render Section
  if (playerjsLoaded) {
    return (
      <div 
        ref={containerRef}
        tabIndex={0}
        className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden outline-none font-sans rounded-2xl"
        dir="ltr"
      >
        <div id="playerjs-container" className="w-full h-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden outline-none group select-none font-sans rounded-2xl border border-white/10"
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
          className="w-16 h-16 flex items-center justify-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full border border-white/20 hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] cursor-pointer"
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
          <div className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border border-white/10 rounded-lg shadow-lg">
            <Sparkles size={16} />
          </div>
          <div>
            <span className="text-white font-semibold text-sm block sm:text-base">{title}</span>
            <span className="text-indigo-300 text-xs font-semibold block">مشغل أكاديمية العراق الذكي • Smart Player 🔮</span>
          </div>
        </div>

        {hasCompletedTriggered && (
          <div className="flex items-center gap-1.5 bg-emerald-500/90 text-white text-xs font-bold border border-emerald-400 px-2.5 py-1.5 rounded-lg shadow-lg">
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
          <span className="text-slate-300 text-xs font-semibold select-none w-10 text-center">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative flex items-center group/progress h-5 select-none">
            <input
              type="range"
              min="0"
              max="100"
              value={duration > 0 ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
              className="w-full h-1.5 rounded-lg bg-slate-700/85 outline-none appearance-none cursor-pointer accent-violet-500 group-hover/progress:h-2 transition-all"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(51, 65, 85, 0.8) ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(51, 65, 85, 0.8) 100%)`
              }}
            />
          </div>

          <span className="text-slate-300 text-xs font-semibold select-none w-10 text-center">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Play/Pause icon */}
            <button 
              onClick={togglePlay}
              className="p-1.5 text-white hover:text-indigo-400 active:scale-90 transition-transform cursor-pointer"
              title={playing ? "إيقاف مؤقت" : "تشغيل"}
            >
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            {/* Skip 10s back */}
            <button 
              onClick={() => skip(-10)}
              className="p-1.5 text-slate-300 hover:text-white active:scale-95 transition-transform flex items-center justify-center relative cursor-pointer"
              title="رجوع 10 ثواني"
            >
              <RotateCcw size={18} />
              <span className="text-[9px] font-bold absolute" style={{ bottom: '-2px' }}>10</span>
            </button>

            {/* Skip 10s forward */}
            <button 
              onClick={() => skip(10)}
              className="p-1.5 text-slate-300 hover:text-white active:scale-95 transition-transform flex items-center justify-center relative cursor-pointer"
              title="تقدم 10 ثواني"
            >
              <RotateCw size={18} />
              <span className="text-[9px] font-bold absolute" style={{ bottom: '-2px' }}>10</span>
            </button>

            {/* Volume section */}
            <div className="flex items-center gap-1 group/volume">
              <button 
                onClick={toggleMute}
                className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title="سرعة التشغيل"
              >
                <span>{playbackRate}x</span>
                <Settings size={12} className="opacity-70" />
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1 w-24 text-right shadow-2xl z-50">
                  <span className="text-[10px] text-zinc-400 font-semibold px-2 pb-1.5 border-b border-white/5 text-center select-none block">سرعة الفيديو</span>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`text-xs px-2 py-1.5 rounded-lg font-bold transition-colors flex items-center justify-between w-full cursor-pointer ${
                        playbackRate === speed 
                          ? 'bg-indigo-505 bg-indigo-600 text-white font-semibold' 
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
              className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
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
