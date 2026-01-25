import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Check, X, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ChatMessageWithSender } from '@/hooks/useChat';
import { useUpdateChatMessage, useResolveChatAssignment } from '@/hooks/useChat';
import { CommentAssigneeSelector } from '@/components/tasks/CommentAssigneeSelector';
import { WorkspaceMember } from '@/hooks/useWorkspaceMembers';

interface ChatMessageItemProps {
  message: ChatMessageWithSender;
  showAvatar: boolean;
  currentUserId?: string;
  workspaceId?: string;
}

export const ChatMessageItem = ({ message, showAvatar, currentUserId, workspaceId }: ChatMessageItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editAssignee, setEditAssignee] = useState<WorkspaceMember | null>(null);
  const updateMessage = useUpdateChatMessage();
  const resolveAssignment = useResolveChatAssignment();

  // Initialize editAssignee when entering edit mode
  useEffect(() => {
    if (isEditing && message.assignee) {
      setEditAssignee({
        id: '',
        user_id: message.assignee.id,
        workspace_id: workspaceId || '',
        role: 'member',
        created_at: '',
        profile: {
          id: message.assignee.id,
          full_name: message.assignee.full_name,
          avatar_url: message.assignee.avatar_url,
        },
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
    
    // If nothing changed, just close
    if (!contentChanged && !assigneeChanged) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    
    // Content must not be empty
    if (!editContent.trim()) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    
    await updateMessage.mutateAsync({
      messageId: message.id,
      content: editContent.trim(),
      channelId: message.channel_id,
      assigneeId: editAssignee?.user_id || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleResolve = () => {
    resolveAssignment.mutate({
      messageId: message.id,
      channelId: message.channel_id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const getAssigneeName = () => {
    if (!message.assignee) return 'Usuário';
    const fullName = message.assignee.full_name;
    if (!fullName) return 'Usuário';
    if (fullName.includes('@')) return fullName.split('@')[0];
    return fullName;
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
          <div className="space-y-2">
            {/* Assignee selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Atribuir a:</span>
              <CommentAssigneeSelector
                workspaceId={workspaceId}
                selectedAssignee={editAssignee}
                onSelect={setEditAssignee}
              />
            </div>
            
            {/* Content input and buttons */}
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
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
              {isEdited && (
                <span className="text-xs text-muted-foreground ml-1">(editado)</span>
              )}
            </p>
            
            {/* Indicador de atribuição */}
            {hasAssignment && (
              <div className="flex items-center gap-2 mt-1 text-xs text-primary">
                <UserPlus className="h-3 w-3" />
                <span>Atribuído a: {getAssigneeName()}</span>
                {isAssignee && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={handleResolve}
                    disabled={resolveAssignment.isPending}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Resolver
                  </Button>
                )}
              </div>
            )}

            {/* Indicador de resolvido */}
            {isResolved && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                <span>(resolvido)</span>
              </div>
            )}
          </>
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
