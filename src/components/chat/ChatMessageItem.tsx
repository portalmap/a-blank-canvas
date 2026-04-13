import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Check, X, UserPlus, MessageSquare, Pin, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessageWithSender } from '@/hooks/useChat';

const isOnlyEmojis = (text: string): boolean => {
  const stripped = text.replace(/\s/g, '');
  if (!stripped) return false;
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)+$/u;
  return emojiRegex.test(stripped);
};
import { ChatAttachments } from './ChatAttachments';
import { StickerMessage, isStickerMessage } from './stickers/StickerMessage';
import { useUpdateChatMessage, useResolveChatAssignment } from '@/hooks/useChat';
import { CommentAssigneeSelector } from '@/components/tasks/CommentAssigneeSelector';
import { WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { MessageReactions } from './MessageReactions';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { GroupedReaction } from '@/hooks/useChatReactions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatMessageItemProps {
  message: ChatMessageWithSender;
  showAvatar: boolean;
  currentUserId?: string;
  workspaceId?: string;
  isHighlighted?: boolean;
  reactions?: GroupedReaction[];
  isPinned?: boolean;
  replyCount?: number;
  onToggleReaction?: (emoji: string) => void;
  onOpenThread?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  canPin?: boolean;
}

export const ChatMessageItem = ({
  message, showAvatar, currentUserId, workspaceId, isHighlighted,
  reactions = [], isPinned, replyCount, onToggleReaction, onOpenThread, onPin, onUnpin, canPin,
}: ChatMessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editAssignee, setEditAssignee] = useState<WorkspaceMember | null>(null);
  const updateMessage = useUpdateChatMessage();
  const resolveAssignment = useResolveChatAssignment();

  useEffect(() => {
    if (isEditing && message.assignee) {
      setEditAssignee({
        id: '', user_id: message.assignee.id, workspace_id: workspaceId || '',
        role: 'member', created_at: '',
        profile: { id: message.assignee.id, full_name: message.assignee.full_name, avatar_url: message.assignee.avatar_url },
      } as WorkspaceMember);
    } else if (!isEditing) {
      setEditAssignee(null);
    }
  }, [isEditing, message.assignee, workspaceId]);

  const senderName = message.sender?.full_name || 'Usuário';
  const initials = senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const isAuthor = currentUserId === message.sender_id;
  const isEdited = !!message.edited_at;
  const isAssignee = currentUserId === message.assignee_id;
  const hasAssignment = !!message.assignee_id && !message.resolved_at;
  const isResolved = !!message.resolved_at;

  const handleSaveEdit = async () => {
    const contentChanged = editContent.trim() !== message.content;
    const assigneeChanged = editAssignee?.user_id !== message.assignee_id;
    if (!contentChanged && !assigneeChanged) { setIsEditing(false); setEditContent(message.content); return; }
    if (!editContent.trim()) { setIsEditing(false); setEditContent(message.content); return; }
    await updateMessage.mutateAsync({
      messageId: message.id, content: editContent.trim(),
      channelId: message.channel_id, assigneeId: editAssignee?.user_id || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => { setIsEditing(false); setEditContent(message.content); };
  const handleResolve = () => { resolveAssignment.mutate({ messageId: message.id, channelId: message.channel_id }); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    else if (e.key === 'Escape') { handleCancelEdit(); }
  };

  const getAssigneeName = () => {
    if (!message.assignee) return 'Usuário';
    const fullName = message.assignee.full_name;
    if (!fullName) return 'Usuário';
    return fullName.includes('@') ? fullName.split('@')[0] : fullName;
  };

  return (
    <div
      id={`chat-msg-${message.id}`}
      className={cn(
        "flex gap-3 group relative rounded-md px-1 -mx-1 transition-colors duration-1000",
        !showAvatar && "pl-10",
        isHighlighted && "animate-highlight-fade",
        isPinned && "border-l-2 border-primary/40 pl-2"
      )}
    >
      {showAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-medium text-sm">{senderName}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {isPinned && <Pin className="h-3 w-3 text-primary/60" />}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Atribuir a:</span>
              <CommentAssigneeSelector workspaceId={workspaceId} selectedAssignee={editAssignee} onSelect={setEditAssignee} />
            </div>
            <div className="flex gap-2 items-center">
              <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={handleKeyDown} autoFocus className="flex-1" />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit} disabled={updateMessage.isPending}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit} disabled={updateMessage.isPending}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <>
            {(() => {
              const stickerId = isStickerMessage(message.content);
              if (stickerId) {
                return <StickerMessage stickerId={stickerId} />;
              }
              return (
                <>
                  <p className={cn("<p className={cn("whitespace-pre-wrap break-words overflow-hidden", isOnlyEmojis(message.content) ? "text-3xl leading-relaxed" : "text-sm")}>", isOnlyEmojis(message.content) ? "text-3xl leading-relaxed" : "text-sm")}>
                    {message.content}
                    {isEdited && <span className="text-xs text-muted-foreground ml-1">(editado)</span>}
                  </p>
                  <ChatAttachments attachments={message.attachments as any[] || []} />
                </>
              );
            })()}

            {hasAssignment && (
              <div className="flex items-center gap-2 mt-1 text-xs text-primary">
                <UserPlus className="h-3 w-3" />
                <span>Atribuído a: {getAssigneeName()}</span>
                {isAssignee && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleResolve} disabled={resolveAssignment.isPending}>
                    <Check className="h-3 w-3 mr-1" />Resolver
                  </Button>
                )}
              </div>
            )}

            {isResolved && (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <UserPlus className="h-3 w-3" />
                <span>Atribuído a: {getAssigneeName()}</span>
                <Check className="h-3 w-3 ml-1" /><span>(resolvido)</span>
              </div>
            )}

            {/* Reactions */}
            {onToggleReaction && (
              <MessageReactions reactions={reactions} onToggleReaction={onToggleReaction} onAddReaction={onToggleReaction} />
            )}

            {/* Thread indicator */}
            {replyCount && replyCount > 0 && onOpenThread && (
              <button onClick={onOpenThread} className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                <MessageSquare className="h-3 w-3" />
                {replyCount} resposta{replyCount !== 1 ? 's' : ''} — clique para ver
              </button>
            )}
          </>
        )}
      </div>

      {/* Hover action buttons */}
      {!isEditing && (
        <div className="absolute top-0 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-md shadow-sm px-0.5">
          {onToggleReaction && (
            <EmojiPickerPopover
              onEmojiSelect={onToggleReaction}
              triggerClassName="h-6 w-6"
              side="top"
            />
          )}
          {onOpenThread && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenThread}>
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Responder em fio</TooltipContent>
            </Tooltip>
          )}
          {canPin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={isPinned ? onUnpin : onPin}>
                  <Pin className={cn("h-3 w-3", isPinned && "text-primary")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isPinned ? 'Desafixar' : 'Fixar'}</TooltipContent>
            </Tooltip>
          )}
          {isAuthor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};
