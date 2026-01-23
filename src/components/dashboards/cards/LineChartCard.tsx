import { MoreHorizontal, Trash2, Move, Maximize2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LineChartCardProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
}

export const LineChartCard = ({
  title,
  data,
  timeRange,
  onDelete,
  onEdit,
  onExpand,
}: LineChartCardProps) => {
  // Generate sample data if none provided
  const chartData = data.length > 0 ? data : generateSampleData(timeRange);

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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              width={30}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Tarefas']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

function generateSampleData(timeRange?: string) {
  const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
  const points = Math.min(days, 12);
  const interval = Math.floor(days / points);

  return Array.from({ length: points }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - i - 1) * interval);
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      value: Math.floor(Math.random() * 20) + 5,
    };
  });
}
