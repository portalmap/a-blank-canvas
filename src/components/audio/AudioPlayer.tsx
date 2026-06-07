import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

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

  const handleTranscribe = async () => {
    if (transcription !== null || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], 'audio.webm', { type: blob.type || 'audio/webm' });

      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) throw error;
      setTranscription(data?.transcription || 'Não foi possível transcrever.');
    } catch (err: any) {
      console.error('Transcription error:', err);
      toast.error('Erro ao transcrever áudio');
      setTranscription(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 max-w-[320px]">
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={handleTranscribe}
          disabled={isTranscribing || transcription !== null}
          title="Transcrever áudio"
        >
          {isTranscribing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground px-1 italic">{description}</p>
      )}
      {transcription && (
        <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-foreground border border-border/50">
          <span className="font-medium text-muted-foreground text-[10px] uppercase tracking-wide">Transcrição</span>
          <p className="mt-0.5">{transcription}</p>
        </div>
      )}
    </div>
  );
};
