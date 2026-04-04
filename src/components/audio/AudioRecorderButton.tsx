import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Send, X, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AudioRecorderButtonProps {
  onAudioReady: (file: File, description?: string) => void;
  disabled?: boolean;
}

export const AudioRecorderButton = ({ onAudioReady, disabled }: AudioRecorderButtonProps) => {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setPreviewUrl(null);
    setElapsed(0);
    setDescription('');
    setIsPreviewPlaying(false);
    chunksRef.current = [];
    blobRef.current = null;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState('preview');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const discard = () => {
    cleanup();
    setState('idle');
  };

  const send = () => {
    if (!blobRef.current) return;
    const ext = blobRef.current.type.includes('webm') ? 'webm' : 'ogg';
    const file = new File([blobRef.current], `audio_${Date.now()}.${ext}`, {
      type: blobRef.current.type,
    });
    onAudioReady(file, description.trim() || undefined);
    cleanup();
    setState('idle');
  };

  const togglePreview = () => {
    if (!previewUrl) return;
    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(previewUrl);
        previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      }
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/30 animate-pulse">
        <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono text-destructive">{formatTime(elapsed)}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={stopRecording}>
          <Square className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  if (state === 'preview') {
    return (
      <div className="flex flex-col gap-2 p-3 bg-muted/60 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePreview}>
            {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-xs text-muted-foreground">{formatTime(elapsed)}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={discard}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" className="h-7 w-7" onClick={send}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Input
          placeholder="Adicionar descrição do áudio..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
        />
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="flex-shrink-0"
      onClick={startRecording}
      disabled={disabled}
      title="Gravar áudio"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};
