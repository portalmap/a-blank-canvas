import { useEffect, useRef } from 'react';
import { X, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { useThreadMessages, ChatMessageWithSender } from '@/hooks/useChat';

interface ThreadPanelProps {
  parentMessage: ChatMessageWithSender;
  channelId: string;
  channelName: string;
  workspaceId?: string;
  currentUserId?: string;
  onClose: () => void;
}

export const ThreadPanel = ({ parentMessage, channelId, channelName, workspaceId, currentUserId, onClose }: ThreadPanelProps) => {
  const { data: replies, isLoading } = useThreadMessages(parentMessage.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies?.length]);

  return (
    <div className="w-[400px] border-l flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Thread</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="p-4 border-b bg-muted/20 min-w-0 max-w-full overflow-hidden">
        <ChatMessageItem
          message={parentMessage}
          showAvatar={true}
          currentUserId={currentUserId}
          workspaceId={workspaceId}
        />
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1 p-4 min-w-0 [&_[data-radix-scroll-area-viewport]>div]:!block [&_[data-radix-scroll-area-viewport]>div]:!w-full">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies && replies.length > 0 ? (
          <div className="space-y-3 w-full max-w-full">
            <p className="text-xs text-muted-foreground">{replies.length} resposta{replies.length !== 1 ? 's' : ''}</p>
            {replies.map((reply, index) => {
              const prev = replies[index - 1];
              const showAvatar = !prev || prev.sender_id !== reply.sender_id ||
                new Date(reply.created_at).getTime() - new Date(prev.created_at).getTime() > 300000;
              return (
                <ChatMessageItem
                  key={reply.id}
                  message={reply}
                  showAvatar={showAvatar}
                  currentUserId={currentUserId}
                  workspaceId={workspaceId}
                />
              );
            })}
            <div ref={scrollRef} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma resposta ainda. Comece a conversa!
          </p>
        )}
      </ScrollArea>

      {/* Thread input */}
      <ChatInput channelId={channelId} channelName={channelName} workspaceId={workspaceId} replyTo={parentMessage.id} />
    </div>
  );
};
