import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Activity } from 'lucide-react';
import { useTaskActivities, useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { useCreateTaskComment } from '@/hooks/useTaskComments';
import { TaskActivityItem } from './TaskActivityItem';

interface TaskActivityPanelProps {
  taskId: string;
}

export const TaskActivityPanel = ({ taskId }: TaskActivityPanelProps) => {
  const [newComment, setNewComment] = useState('');
  
  const { data: activities, isLoading } = useTaskActivities(taskId);
  const createComment = useCreateTaskComment();
  const createActivity = useCreateTaskActivity();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      // Criar comentário
      await createComment.mutateAsync({
        taskId,
        content: newComment.trim(),
      });
      
      // Registrar atividade
      await createActivity.mutateAsync({
        taskId,
        activityType: 'comment.created',
        metadata: { content: newComment.trim() },
      });
      
      setNewComment('');
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
              <TaskActivityItem key={activity.id} activity={activity} />
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
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva um comentário..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter para enviar
          </span>
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
                Comentar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
