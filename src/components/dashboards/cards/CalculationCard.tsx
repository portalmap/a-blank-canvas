import { memo } from 'react';
import { MoreHorizontal, Trash2, Move, Maximize2, CheckCircle, AlertTriangle, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CalculationCardProps {
  title: string;
  value: number;
  suffix?: string;
  metric?: 'total' | 'completed' | 'overdue' | 'on_track';
  total?: number;
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

const metricConfig = {
  total: {
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
  },
  on_track: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
};

const CalculationCardComponent = ({
  title,
  value,
  suffix,
  metric = 'total',
  total,
  onDelete,
  onEdit,
  onExpand,
}: CalculationCardProps) => {
  const config = metricConfig[metric];
  const Icon = config.icon;
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Move className="mr-2 h-4 w-4" />
              Redimensionar
            </DropdownMenuItem>
            {onExpand && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExpand(); }}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expandir
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{value}</span>
              {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
            </div>
            {percentage !== null && metric !== 'total' && (
              <p className="text-xs text-muted-foreground mt-1">
                {percentage}% do total
              </p>
            )}
          </div>
          <div className={cn('h-12 w-12 rounded-full flex items-center justify-center', config.bgColor)}>
            <Icon className={cn('h-6 w-6', config.color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const CalculationCard = memo(CalculationCardComponent);
