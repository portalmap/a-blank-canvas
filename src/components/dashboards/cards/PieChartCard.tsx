import { memo, useMemo } from 'react';
import { MoreHorizontal, Trash2, Move, Maximize2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PieChartCardProps {
  title: string;
  data: Array<{ name: string; value: number; color?: string }>;
  groupBy?: 'status' | 'priority' | 'assignee';
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PieChartCardComponent = ({
  title,
  data,
  groupBy,
  onDelete,
  onEdit,
  onExpand,
}: PieChartCardProps) => {
  const chartData = useMemo(() => 
    data.map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length],
    })),
    [data]
  );

  const total = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

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
      <CardContent className="flex-1 min-h-0">
        {chartData.length === 0 || total === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value, 'Tarefas']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const PieChartCard = memo(PieChartCardComponent);
