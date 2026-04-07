import { useState, useEffect, useRef, useMemo } from 'react';
import { Hash, Users, Loader2, Search, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatMessages, ChatMessageWithSender } from '@/hooks/useChat';
import { useMarkChannelAsRead } from '@/hooks/useChatUnread';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { ThreadPanel } from './ThreadPanel';
import { ChatSearchDialog } from './ChatSearchDialog';
import { PinnedMessagesSheet } from './PinnedMessagesSheet';
import { useMessageReactions, groupReactions, useToggleReaction } from '@/hooks/useChatReactions';
import { usePinnedMessages, usePinMessage, useUnpinMessage } from '@/hooks/useChatPins';

interface ChatRoomProps {
  channelId: string;
  channelName: string;
  channelType: 'space' | 'custom' | 'dm' | 'group_dm';
  spaceColor?: string;
  workspaceId?: string;
  highlightMessageId?: string;
  onOpenMembers?: () => void;
}

export const ChatRoom = ({ 
  channelId, channelName, channelType, spaceColor, workspaceId,
  highlightMessageId, onOpenMembers,
}: ChatRoomProps) => {
  const { data: messages, isLoading } = useChatMessages(channelId);
  const markAsRead = useMarkChannelAsRead();
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightScrolledRef = useRef(false);

  const [threadMessage, setThreadMessage] = useState<ChatMessageWithSender | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Reactions & pins
  const { data: allReactions } = useMessageReactions(channelId);
  const toggleReaction = useToggleReaction();
  const { data: pinnedMessages } = usePinnedMessages(channelId);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  const pinnedIds = useMemo(() => new Set(pinnedMessages?.map(p => p.message_id) || []), [pinnedMessages]);
  const canPin = userRole?.isAdmin || userRole?.isOwner || userRole?.isGlobalOwner;

  // Reply counts
  const replyCounts = useMemo(() => {
    if (!messages) return new Map<string, number>();
    const counts = new Map<string, number>();
    messages.forEach(m => {
      if (m.reply_to) {
        counts.set(m.reply_to, (counts.get(m.reply_to) || 0) + 1);
      }
    });
    return counts;
  }, [messages]);

  // Filter: only show top-level messages (no reply_to)
  const topLevelMessages = useMemo(() => {
    return messages?.filter(m => !m.reply_to) || [];
  }, [messages]);

  useEffect(() => {
    if (channelId) markAsRead.mutate({ channelId });
  }, [channelId, messages?.length]);

  useEffect(() => {
    if (highlightMessageId && messages?.length && !highlightScrolledRef.current) {
      const el = document.getElementById(`chat-msg-${highlightMessageId}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); highlightScrolledRef.current = true; return; }
    }
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, highlightMessageId]);

  const handleNavigateToMessage = (chId: string, msgId: string) => {
    if (chId === channelId) {
      const el = document.getElementById(`chat-msg-${msgId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex-1 flex h-full">
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {channelType === 'space' ? (
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: spaceColor || '#6366f1' }} />
            ) : channelType === 'dm' || channelType === 'group_dm' ? (
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Hash className="h-4 w-4 text-muted-foreground" />
            )}
            <h2 className="font-semibold">{channelName}</h2>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <PinnedMessagesSheet channelId={channelId} canUnpin={!!canPin} />
            {(channelType === 'custom' || channelType === 'group_dm') && onOpenMembers && (
              <Button variant="ghost" size="sm" onClick={onOpenMembers}>
                <Users className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : topLevelMessages.length > 0 ? (
            <div className="space-y-4">
              {topLevelMessages.map((message, index) => {
                const prevMessage = topLevelMessages[index - 1];
                const showAvatar = !prevMessage ||
                  prevMessage.sender_id !== message.sender_id ||
                  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000;

                const msgReactions = allReactions ? groupReactions(allReactions, message.id, user?.id) : [];

                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    currentUserId={user?.id}
                    workspaceId={workspaceId}
                    isHighlighted={message.id === highlightMessageId}
                    reactions={msgReactions}
                    isPinned={pinnedIds.has(message.id)}
                    replyCount={replyCounts.get(message.id)}
                    onToggleReaction={(emoji) => toggleReaction.mutate({ messageId: message.id, emoji, channelId })}
                    onOpenThread={() => setThreadMessage(message)}
                    onPin={() => pinMessage.mutate({ messageId: message.id, channelId })}
                    onUnpin={() => unpinMessage.mutate({ messageId: message.id, channelId })}
                    canPin={!!canPin}
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

        <ChatInput channelId={channelId} channelName={channelName} workspaceId={workspaceId} />
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          channelId={channelId}
          channelName={channelName}
          workspaceId={workspaceId}
          currentUserId={user?.id}
          onClose={() => setThreadMessage(null)}
        />
      )}

      <ChatSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        currentChannelId={channelId}
        onNavigateToMessage={handleNavigateToMessage}
      />
    </div>
  );
};
