import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useTaskProductivityClassification,
  getClassificationLabel,
  getClassificationColor,
} from '@/hooks/useProductivityClassification';
import { cn } from '@/lib/utils';

interface TaskProductivityIndicatorProps {
  task: {
    start_date?: string | null;
    due_date?: string | null;
    completed_at?: string | null;
  };
  size?: 'sm' | 'md';
}

export const TaskProductivityIndicator = ({ task, size = 'sm' }: TaskProductivityIndicatorProps) => {
  const result = useTaskProductivityClassification(task);

  if (!result) return null;

  const { classification, percentage } = result;
  const label = getClassificationLabel(classification);
  const colors = getClassificationColor(classification);
  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-block rounded-full shrink-0', sizeClass, colors.bg)} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{Math.round(percentage)}% do prazo utilizado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
