import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Clock, AlertTriangle, Flame, ListTodo, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  list_name?: string;
  priority?: string;
}

interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  onTrack: number;
  highPriority: number;
  byStatus: { name: string; color: string; count: number }[];
  completionRate: number;
  overdueTasks: OverdueTask[];
}

interface TaskStatsDashboardProps {
  stats: TaskStats | undefined;
  isLoading: boolean;
  filterComponent?: React.ReactNode;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  variant = 'default',
  onClick,
  clickable = false,
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  clickable?: boolean;
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

  const hoverStyles = {
    default: 'hover:ring-primary/50',
    success: 'hover:ring-emerald-500/50',
    warning: 'hover:ring-amber-500/50',
    danger: 'hover:ring-destructive/50',
  };

  return (
    <div 
      className={`rounded-lg p-4 ${variantStyles[variant]} border transition-all ${
        clickable ? `cursor-pointer hover:ring-2 ${hoverStyles[variant]}` : ''
      }`}
      onClick={onClick}
    >
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

const priorityLabels: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
};

const TaskStatsDashboard = ({ stats, isLoading, filterComponent }: TaskStatsDashboardProps) => {
  const navigate = useNavigate();
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visão Geral
            </CardTitle>
            {filterComponent}
          </div>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visão Geral
            </CardTitle>
            {filterComponent}
          </div>
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
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Visão Geral
            </CardTitle>
            {filterComponent}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={ListTodo} label="Total" value={stats.total} />
            <StatCard icon={CheckCircle2} label="Concluídas" value={stats.completed} variant="success" />
            <StatCard icon={Clock} label="Em Dia" value={stats.onTrack} />
            <StatCard 
              icon={AlertTriangle} 
              label="Atrasadas" 
              value={stats.overdue} 
              variant="danger"
              clickable={stats.overdue > 0}
              onClick={() => stats.overdue > 0 && setShowOverdueDialog(true)}
            />
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

      {/* Overdue Tasks Dialog */}
      <Dialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tarefas Atrasadas ({stats.overdueTasks.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] space-y-2">
            {stats.overdueTasks.map((task) => (
              <div 
                key={task.id}
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setShowOverdueDialog(false);
                  navigate(`/task/${task.id}`);
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{task.title}</p>
                    {task.list_name && (
                      <p className="text-xs text-muted-foreground truncate">{task.list_name}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-destructive font-medium">
                      {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                    {task.priority && (
                      <Badge variant="outline" className="text-xs">
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskStatsDashboard;
