import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration = 30,
  className = "",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => {
    if (audioRef.current && !audioUrl.startsWith("mock")) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const barHeights = [20, 45, 75, 30, 90, 60, 40, 85, 100, 50, 65, 35, 70, 40, 55, 80, 45, 30];

  return (
    <div
      className={`flex items-center space-x-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-sm ${className}`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {formatTime(currentTime)}
          </span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Waveform Visualization */}
        <div className="flex items-center space-x-1 h-5 cursor-pointer">
          {barHeights.map((h, i) => {
            const progressRatio = currentTime / (duration || 1);
            const isFilled = i / barHeights.length <= progressRatio;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "bg-indigo-600 dark:bg-indigo-400"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              />
            );
          })}
        </div>
      </div>

      <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />

      {audioUrl && !audioUrl.startsWith("mock") && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          className="hidden"
        />
      )}
    </div>
  );
};
