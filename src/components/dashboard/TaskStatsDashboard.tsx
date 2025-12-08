import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, AlertTriangle, Flame, ListTodo, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  onTrack: number;
  highPriority: number;
  byStatus: { name: string; color: string; count: number }[];
  completionRate: number;
}

interface TaskStatsDashboardProps {
  stats: TaskStats | undefined;
  isLoading: boolean;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  variant = 'default' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) => {
  const variantStyles = {
    default: 'bg-card text-card-foreground',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-destructive',
  };

  return (
    <div className={`rounded-lg p-4 ${variantStyles[variant]} border`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
};

const TaskStatsDashboard = ({ stats, isLoading }: TaskStatsDashboardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visão Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhuma tarefa encontrada neste escopo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Visão Geral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={ListTodo} label="Total" value={stats.total} />
          <StatCard icon={CheckCircle2} label="Concluídas" value={stats.completed} variant="success" />
          <StatCard icon={Clock} label="Em Dia" value={stats.onTrack} />
          <StatCard icon={AlertTriangle} label="Atrasadas" value={stats.overdue} variant="danger" />
          <StatCard icon={Flame} label="Urgentes" value={stats.highPriority} variant="warning" />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{stats.completionRate.toFixed(1)}%</span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>

        {/* Status Distribution */}
        {stats.byStatus.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="w-full md:w-40 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byStatus}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                  >
                    {stats.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} tarefas`, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
              {stats.byStatus.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: status.color }} 
                  />
                  <span className="text-sm truncate">{status.name}</span>
                  <span className="text-xs text-muted-foreground">({status.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskStatsDashboard;
