import { useState, useRef, KeyboardEvent } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSendMessage } from '@/hooks/useChat';
import { useCreateNotification } from '@/hooks/useNotifications';
import { CommentAssigneeSelector } from '@/components/tasks/CommentAssigneeSelector';
import { WorkspaceMember } from '@/hooks/useWorkspaceMembers';

interface ChatInputProps {
  channelId: string;
  channelName: string;
  workspaceId?: string;
}

export const ChatInput = ({ channelId, channelName, workspaceId }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<WorkspaceMember | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();
  const createNotification = useCreateNotification();

  const getDisplayName = (member: WorkspaceMember) => {
    const fullName = member.profile?.full_name;
    if (!fullName) return 'Usuário';
    if (fullName.includes('@')) {
      return fullName.split('@')[0];
    }
    return fullName;
  };

  const getInitials = (member: WorkspaceMember) => {
    const name = getDisplayName(member);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sendMessage.isPending) return;

    setContent('');
    const assigneeId = selectedAssignee?.user_id;
    
    const result = await sendMessage.mutateAsync({ 
      channelId, 
      content: trimmedContent,
      assigneeId,
    });

    // Criar notificação se houver atribuição
    if (selectedAssignee && workspaceId && result.hasAssignee) {
      await createNotification.mutateAsync({
        userId: selectedAssignee.user_id,
        workspaceId,
        type: 'chat_assignment',
        title: 'Nova atribuição no chat',
        message: `Você foi atribuído em uma mensagem no canal #${channelName}`,
      });
    }

    setSelectedAssignee(null);
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
      {/* Badge de atribuição */}
      {selectedAssignee && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md mb-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={selectedAssignee.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(selectedAssignee)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            Atribuído a: <strong>{getDisplayName(selectedAssignee)}</strong>
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 ml-auto"
            onClick={() => setSelectedAssignee(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

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
        <CommentAssigneeSelector
          workspaceId={workspaceId}
          selectedAssignee={selectedAssignee}
          onSelect={setSelectedAssignee}
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
