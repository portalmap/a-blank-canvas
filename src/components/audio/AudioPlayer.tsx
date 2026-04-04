import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  src: string;
  description?: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const AudioPlayer = ({ src, description }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 max-w-[280px]">
      <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
        <audio ref={audioRef} src={src} preload="metadata" />
        <Mic className="h-4 w-4 text-primary flex-shrink-0" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div
          ref={progressRef}
          className="flex-1 h-1.5 bg-border rounded-full cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0 min-w-[32px] text-right">
          {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground px-1 italic">{description}</p>
      )}
    </div>
  );
};
