import { MoreHorizontal, Trash2, Move, Maximize2 } from 'lucide-react';
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

interface PriorityBreakdownCardProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

const priorityConfig: Record<string, { label: string; color: string; progressColor: string }> = {
  low: { 
    label: 'Baixa', 
    color: 'text-muted-foreground',
    progressColor: 'bg-muted-foreground',
  },
  medium: { 
    label: 'Média', 
    color: 'text-yellow-600',
    progressColor: 'bg-yellow-500',
  },
  high: { 
    label: 'Alta', 
    color: 'text-orange-600',
    progressColor: 'bg-orange-500',
  },
  urgent: { 
    label: 'Urgente', 
    color: 'text-red-600',
    progressColor: 'bg-red-500',
  },
};

export const PriorityBreakdownCard = ({
  title,
  data,
  onDelete,
  onEdit,
  onExpand,
}: PriorityBreakdownCardProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const orderedPriorities = ['urgent', 'high', 'medium', 'low'];
  const orderedData = orderedPriorities
    .map(p => data.find(d => d.name === p))
    .filter(Boolean) as Array<{ name: string; value: number }>;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
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
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {total === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-8">
            Sem dados disponíveis
          </div>
        ) : (
          <div className="space-y-4">
            {orderedData.map((item) => {
              const config = priorityConfig[item.name];
              const percentage = Math.round((item.value / total) * 100);

              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn('font-medium', config?.color)}>
                      {config?.label || item.name}
                    </span>
                    <span className="text-muted-foreground">
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', config?.progressColor)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
