import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('fazer') || normalized.includes('todo')) {
      return 'bg-status-todo text-status-todo-foreground';
    }
    if (normalized.includes('progresso') || normalized.includes('progress')) {
      return 'bg-status-progress text-status-progress-foreground';
    }
    if (normalized.includes('revisão') || normalized.includes('review')) {
      return 'bg-status-review text-status-review-foreground';
    }
    if (normalized.includes('concluí') || normalized.includes('done')) {
      return 'bg-status-done text-status-done-foreground';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Badge className={cn(getStatusColor(status), className)}>
      {status}
    </Badge>
  );
};

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const priorityMap = {
    low: { label: 'Baixa', class: 'bg-priority-low text-priority-low-foreground' },
    medium: { label: 'Média', class: 'bg-priority-medium text-priority-medium-foreground' },
    high: { label: 'Alta', class: 'bg-priority-high text-priority-high-foreground' },
    urgent: { label: 'Urgente', class: 'bg-priority-urgent text-priority-urgent-foreground' },
  };

  const config = priorityMap[priority];

  return (
    <Badge className={cn(config.class, className)}>
      {config.label}
    </Badge>
  );
};