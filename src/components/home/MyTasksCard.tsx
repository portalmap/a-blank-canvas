import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronRight, Calendar, ClipboardList } from 'lucide-react';
import { useMyAssignedTasks, MyAssignedTask } from '@/hooks/useMyAssignedTasks';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const priorityConfig = {
  urgent: { label: 'Urgente', color: 'bg-red-500', order: 1 },
  high: { label: 'Alta', color: 'bg-orange-500', order: 2 },
  medium: { label: 'Média', color: 'bg-yellow-500', order: 3 },
  low: { label: 'Baixa', color: 'bg-blue-500', order: 4 },
};

export const MyTasksCard = () => {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useMyAssignedTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    urgent: true,
    high: true,
    medium: true,
    low: true,
  });

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group tasks by priority
  const groupedTasks = filteredTasks.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(task);
    return acc;
  }, {} as Record<string, MyAssignedTask[]>);

  const toggleGroup = (priority: string) => {
    setExpandedGroups(prev => ({ ...prev, [priority]: !prev[priority] }));
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);

    return (
      <span className={cn(
        "text-xs flex items-center gap-1",
        isOverdue && "text-destructive",
        isDueToday && "text-orange-500",
        !isOverdue && !isDueToday && "text-muted-foreground"
      )}>
        <Calendar className="h-3 w-3" />
        {format(date, "dd MMM", { locale: ptBR })}
      </span>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Atribuídas a mim
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma tarefa encontrada' : 'Você não tem tarefas atribuídas'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(['urgent', 'high', 'medium', 'low'] as const).map(priority => {
              const tasksInGroup = groupedTasks[priority] || [];
              if (tasksInGroup.length === 0) return null;

              const config = priorityConfig[priority];

              return (
                <Collapsible
                  key={priority}
                  open={expandedGroups[priority]}
                  onOpenChange={() => toggleGroup(priority)}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      expandedGroups[priority] && "rotate-90"
                    )} />
                    <div className={cn("w-2 h-2 rounded-full", config.color)} />
                    <span className="font-medium text-sm">{config.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {tasksInGroup.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 border-l pl-4 space-y-1 py-1">
                      {tasksInGroup.map(task => (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/task/${task.id}`)}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </p>
                            {task.list && (
                              <p className="text-xs text-muted-foreground truncate">
                                {task.list.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {task.status && (
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: task.status.color, color: task.status.color }}
                              >
                                {task.status.name}
                              </Badge>
                            )}
                            {getDueDateDisplay(task.due_date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
