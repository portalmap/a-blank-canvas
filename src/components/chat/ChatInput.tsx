import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendMessage } from '@/hooks/useChat';

interface ChatInputProps {
  channelId: string;
  channelName: string;
}

export const ChatInput = ({ channelId, channelName }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sendMessage.isPending) return;

    setContent('');
    await sendMessage.mutateAsync({ channelId, content: trimmedContent });
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Mensagem em #${channelName}`}
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || sendMessage.isPending}
          size="icon"
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
};
