import { useEffect, useRef } from 'react';
import { Hash, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatMessages, ChatMessageWithSender } from '@/hooks/useChat';
import { useMarkChannelAsRead } from '@/hooks/useChatUnread';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';

interface ChatRoomProps {
  channelId: string;
  channelName: string;
  channelType: 'space' | 'custom';
  spaceColor?: string;
  workspaceId?: string;
  onOpenMembers?: () => void;
}

export const ChatRoom = ({ 
  channelId, 
  channelName, 
  channelType,
  spaceColor,
  workspaceId,
  onOpenMembers 
}: ChatRoomProps) => {
  const { data: messages, isLoading } = useChatMessages(channelId);
  const markAsRead = useMarkChannelAsRead();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Marcar canal como lido quando abrir ou receber novas mensagens
  useEffect(() => {
    if (channelId) {
      markAsRead.mutate({ channelId });
    }
  }, [channelId, messages?.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {channelType === 'space' ? (
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: spaceColor || '#6366f1' }}
            />
          ) : (
            <Hash className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="font-semibold">{channelName}</h2>
        </div>
        
        {channelType === 'custom' && onOpenMembers && (
          <Button variant="ghost" size="sm" onClick={onOpenMembers}>
            <Users className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showAvatar = !prevMessage || 
                prevMessage.sender_id !== message.sender_id ||
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 min

              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  showAvatar={showAvatar}
                  currentUserId={user?.id}
                  workspaceId={workspaceId}
                />
              );
            })}
            <div ref={scrollRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Hash className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">Bem-vindo ao #{channelName}</h3>
            <p className="text-sm text-muted-foreground">
              Este é o início do canal. Envie uma mensagem para começar!
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput channelId={channelId} channelName={channelName} workspaceId={workspaceId} />
    </div>
  );
};
