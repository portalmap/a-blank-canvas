import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit2, 
  MessageSquare, 
  Flag, 
  Calendar, 
  User, 
  CheckSquare,
  ListTodo,
  Zap,
  CheckCircle2,
  UserCheck,
  Paperclip
} from 'lucide-react';
import { TaskActivity, getActivityLabel } from '@/hooks/useTaskActivities';
import { useResolveCommentAssignment, useTaskComments } from '@/hooks/useTaskComments';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';
import { renderTextWithImagesAndLinks } from '@/lib/linkify';

interface TaskActivityItemProps {
  activity: TaskActivity;
  taskId?: string;
}

const getActivityIcon = (type: string) => {
  if (type === 'task.created') return Plus;
  if (type === 'comment.created') return MessageSquare;
  if (type === 'assignment.created') return UserCheck;
  if (type === 'assignment.resolved') return CheckCircle2;
  if (type === 'attachment.added') return Paperclip;
  if (type.includes('status') || type.includes('priority')) return Flag;
  if (type.includes('date')) return Calendar;
  if (type.includes('assignee')) return User;
  if (type.includes('checklist')) return CheckSquare;
  if (type.includes('subtask')) return ListTodo;
  return Edit2;
};

const getActivityColor = (type: string) => {
  if (type === 'task.created') return 'bg-green-500/10 text-green-500';
  if (type === 'comment.created') return 'bg-blue-500/10 text-blue-500';
  if (type === 'assignment.created') return 'bg-amber-500/10 text-amber-500';
  if (type === 'assignment.resolved') return 'bg-emerald-500/10 text-emerald-500';
  if (type === 'attachment.added') return 'bg-indigo-500/10 text-indigo-500';
  if (type.includes('status')) return 'bg-purple-500/10 text-purple-500';
  if (type.includes('priority')) return 'bg-orange-500/10 text-orange-500';
  if (type.includes('date')) return 'bg-cyan-500/10 text-cyan-500';
  if (type.includes('assignee')) return 'bg-pink-500/10 text-pink-500';
  if (type.includes('checklist')) return 'bg-emerald-500/10 text-emerald-500';
  return 'bg-muted text-muted-foreground';
};

export const TaskActivityItem = ({ activity, taskId }: TaskActivityItemProps) => {
  const Icon = getActivityIcon(activity.activity_type);
  const iconColorClass = getActivityColor(activity.activity_type);
  const userName = activity.user?.full_name || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();
  const isAutomation = activity.metadata?.created_by === 'automation';
  const isPortal = activity.metadata?.created_by === 'portal';
  
  const { data: comments } = useTaskComments(taskId);
  const resolveAssignment = useResolveCommentAssignment();
  const createActivity = useCreateTaskActivity();
  
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });
  
  const exactTime = format(new Date(activity.created_at), "dd MMM 'às' HH:mm", { 
    locale: ptBR 
  });

  // Find the related comment for assignment activities
  const relatedComment = activity.activity_type === 'assignment.created' && comments
    ? comments.find(c => 
        c.assignee_id === activity.metadata?.assignee_id &&
        c.content === activity.metadata?.content
      )
    : null;

  const isResolved = relatedComment?.resolved_at != null;
  const canResolve = activity.activity_type === 'assignment.created' && !isResolved && taskId;

  const handleResolve = async () => {
    if (!relatedComment || !taskId) return;
    
    try {
      await resolveAssignment.mutateAsync({
        commentId: relatedComment.id,
        taskId,
      });

      await createActivity.mutateAsync({
        taskId,
        activityType: 'assignment.resolved',
        metadata: {
          assignee_id: activity.metadata?.assignee_id,
          assignee_name: activity.metadata?.assignee_name,
          content: activity.metadata?.content,
        },
      });
    } catch (error) {
      console.error('Erro ao resolver atribuição:', error);
    }
  };

  return (
    <div className={cn(
      "flex gap-3 py-3 border-b border-border/50 last:border-0",
      isResolved && "opacity-60"
    )}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn("p-1.5 rounded-full", iconColorClass)}>
          {isAutomation ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="flex-1 w-px bg-border/50 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={activity.user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              {isAutomation ? (
                <>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ⚡ {activity.metadata?.automation_name || 'Automação'}
                  </span>{' '}
                </>
              ) : isPortal ? (
                <>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    🌐 Portal MAP
                  </span>{' '}
                </>
              ) : (
                <span className="font-medium">{userName}</span>
              )}{' '}
              <span className="text-muted-foreground">
                {getActivityLabel(activity)}
              </span>
            </p>
            
            {/* Assignment badge */}
            {activity.activity_type === 'assignment.created' && activity.metadata?.assignee_name && (
              <div className={cn(
                "mt-2 flex items-center gap-2 p-2 rounded-md text-sm",
                isResolved 
                  ? "bg-emerald-500/10 border border-emerald-500/20" 
                  : "bg-amber-500/10 border border-amber-500/20"
              )}>
                <UserCheck className={cn(
                  "h-4 w-4",
                  isResolved ? "text-emerald-500" : "text-amber-500"
                )} />
                <span className={cn(
                  "flex-1",
                  isResolved ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                )}>
                  {isResolved ? (
                    <>Atribuição resolvida por {relatedComment?.resolver?.full_name || 'usuário'}</>
                  ) : (
                    <>Atribuído a: <strong>{activity.metadata.assignee_name}</strong></>
                  )}
                </span>
                {canResolve && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleResolve}
                    disabled={resolveAssignment.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Resolver
                  </Button>
                )}
              </div>
            )}
            
            {/* Comment/Assignment content */}
            {(activity.activity_type === 'comment.created' || activity.activity_type === 'assignment.created') && 
             (activity.metadata?.content || activity.metadata?.comment_content) && (
              <div className={cn(
                "mt-2 p-3 rounded-md text-sm whitespace-pre-wrap",
                isResolved ? "bg-muted/30" : "bg-muted/50"
              )}>
                {renderTextWithImagesAndLinks(activity.metadata.content || activity.metadata.comment_content)}
              </div>
            )}

            {/* Resolved indicator */}
            {activity.activity_type === 'assignment.resolved' && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-500/10 rounded-md text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span>Atribuição de "{activity.metadata?.assignee_name}" foi resolvida</span>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1" title={exactTime}>
              {timeAgo}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
