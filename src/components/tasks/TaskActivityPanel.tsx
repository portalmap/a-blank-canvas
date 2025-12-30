import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Activity, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTaskActivities, useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { useCreateTaskComment } from '@/hooks/useTaskComments';
import { useCreateNotification } from '@/hooks/useNotifications';
import { TaskActivityItem } from './TaskActivityItem';
import { CommentAssigneeSelector } from './CommentAssigneeSelector';
import { WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface TaskActivityPanelProps {
  taskId: string;
  workspaceId?: string;
  taskTitle?: string;
}

export const TaskActivityPanel = ({ taskId, workspaceId, taskTitle }: TaskActivityPanelProps) => {
  const [newComment, setNewComment] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<WorkspaceMember | null>(null);
  
  const { activeWorkspace } = useWorkspace();
  const effectiveWorkspaceId = workspaceId || activeWorkspace?.id;
  
  const { data: activities, isLoading } = useTaskActivities(taskId);
  const createComment = useCreateTaskComment();
  const createActivity = useCreateTaskActivity();
  const createNotification = useCreateNotification();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      // Criar comentário com atribuição opcional
      const comment = await createComment.mutateAsync({
        taskId,
        content: newComment.trim(),
        assigneeId: selectedAssignee?.user_id,
      });
      
      // Registrar atividade apropriada
      if (selectedAssignee) {
        await createActivity.mutateAsync({
          taskId,
          activityType: 'assignment.created',
          metadata: { 
            content: newComment.trim(),
            assignee_id: selectedAssignee.user_id,
            assignee_name: selectedAssignee.profile?.full_name || 'Usuário',
          },
        });

        // Criar notificação para o usuário atribuído
        if (effectiveWorkspaceId) {
          await createNotification.mutateAsync({
            userId: selectedAssignee.user_id,
            workspaceId: effectiveWorkspaceId,
            type: 'comment_assignment',
            title: 'Nova atribuição',
            message: `Você foi atribuído em um comentário${taskTitle ? ` na tarefa "${taskTitle}"` : ''}`,
            link: `/tasks/${taskId}`,
            referenceType: 'comment',
            referenceId: comment.id,
          });
        }
      } else {
        await createActivity.mutateAsync({
          taskId,
          activityType: 'comment.created',
          metadata: { content: newComment.trim() },
        });
      }
      
      setNewComment('');
      setSelectedAssignee(null);
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmitComment();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Atividade</h3>
        {activities && (
          <span className="text-xs text-muted-foreground ml-auto">
            {activities.length} {activities.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {/* Activities List */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity) => (
              <TaskActivityItem 
                key={activity.id} 
                activity={activity} 
                taskId={taskId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade registrada</p>
          </div>
        )}
      </ScrollArea>

      {/* Comment Input */}
      <div className="p-4 border-t space-y-2">
        {/* Assignee Badge */}
        {selectedAssignee && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
            <Avatar className="h-5 w-5">
              <AvatarImage src={selectedAssignee.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {(selectedAssignee.profile?.full_name || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-primary flex-1">
              Atribuído a: <strong>{selectedAssignee.profile?.full_name || 'Usuário'}</strong>
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
              onClick={() => setSelectedAssignee(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedAssignee ? "Descreva a ação para o usuário atribuído..." : "Escreva um comentário..."}
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CommentAssigneeSelector
              workspaceId={effectiveWorkspaceId}
              selectedAssignee={selectedAssignee}
              onSelect={setSelectedAssignee}
            />
            <span className="text-xs text-muted-foreground">
              Ctrl+Enter para enviar
            </span>
          </div>
          <Button 
            size="sm" 
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || createComment.isPending}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                {selectedAssignee ? 'Atribuir' : 'Comentar'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
