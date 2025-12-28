import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Edit2, 
  MessageSquare, 
  Flag, 
  Calendar, 
  User, 
  CheckSquare,
  ListTodo
} from 'lucide-react';
import { TaskActivity, getActivityLabel } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';

interface TaskActivityItemProps {
  activity: TaskActivity;
}

const getActivityIcon = (type: string) => {
  if (type === 'task.created') return Plus;
  if (type === 'comment.created') return MessageSquare;
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
  if (type.includes('status')) return 'bg-purple-500/10 text-purple-500';
  if (type.includes('priority')) return 'bg-orange-500/10 text-orange-500';
  if (type.includes('date')) return 'bg-cyan-500/10 text-cyan-500';
  if (type.includes('assignee')) return 'bg-pink-500/10 text-pink-500';
  if (type.includes('checklist')) return 'bg-emerald-500/10 text-emerald-500';
  return 'bg-muted text-muted-foreground';
};

export const TaskActivityItem = ({ activity }: TaskActivityItemProps) => {
  const Icon = getActivityIcon(activity.activity_type);
  const iconColorClass = getActivityColor(activity.activity_type);
  const userName = activity.user?.full_name || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();
  
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { 
    addSuffix: true, 
    locale: ptBR 
  });
  
  const exactTime = format(new Date(activity.created_at), "dd MMM 'às' HH:mm", { 
    locale: ptBR 
  });

  return (
    <div className="flex gap-3 py-3 border-b border-border/50 last:border-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={cn("p-1.5 rounded-full", iconColorClass)}>
          <Icon className="h-3.5 w-3.5" />
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
              <span className="font-medium">{userName}</span>{' '}
              <span className="text-muted-foreground">
                {getActivityLabel(activity)}
              </span>
            </p>
            
            {/* Comentário inline */}
            {activity.activity_type === 'comment.created' && activity.metadata?.content && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                {activity.metadata.content}
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
