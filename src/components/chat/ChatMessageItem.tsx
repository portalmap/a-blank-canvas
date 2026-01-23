import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessageWithSender } from '@/hooks/useChat';
import { useUpdateChatMessage } from '@/hooks/useChat';

interface ChatMessageItemProps {
  message: ChatMessageWithSender;
  showAvatar: boolean;
  currentUserId?: string;
}

export const ChatMessageItem = ({ message, showAvatar, currentUserId }: ChatMessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const updateMessage = useUpdateChatMessage();

  const senderName = message.sender?.full_name || 'Usuário';
  const initials = senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const isAuthor = currentUserId === message.sender_id;
  const isEdited = !!message.edited_at;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    
    await updateMessage.mutateAsync({
      messageId: message.id,
      content: editContent.trim(),
      channelId: message.channel_id,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={cn("flex gap-3 group relative", !showAvatar && "pl-10")}>
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
              {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
            </span>
          </div>
        )}
        
        {isEditing ? (
          <div className="flex gap-2 items-center">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1"
            />
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={handleSaveEdit}
              disabled={updateMessage.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8"
              onClick={handleCancelEdit}
              disabled={updateMessage.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {isEdited && (
              <span className="text-xs text-muted-foreground ml-1">(editado)</span>
            )}
          </p>
        )}
      </div>

      {/* Botão de editar - apenas para autor */}
      {isAuthor && !isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};
