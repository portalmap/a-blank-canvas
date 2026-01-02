import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatMessageWithSender } from '@/hooks/useChat';

interface ChatMessageItemProps {
  message: ChatMessageWithSender;
  showAvatar: boolean;
}

export const ChatMessageItem = ({ message, showAvatar }: ChatMessageItemProps) => {
  const senderName = message.sender?.full_name || 'Usuário';
  const initials = senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className={cn("flex gap-3", !showAvatar && "pl-10")}>
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
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
};
