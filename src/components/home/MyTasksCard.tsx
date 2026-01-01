import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ClipboardList, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { useMyAssignedTasks, MyAssignedTask } from '@/hooks/useMyAssignedTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useColumnPreferences, DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_ORDER, ColumnId } from '@/hooks/useColumnPreferences';
import { GroupBySelector, GroupByOption } from '@/components/everything/GroupBySelector';
import { EverythingFilters, FilterState } from '@/components/everything/EverythingFilters';
import { ColumnSelector } from '@/components/tasks/ColumnSelector';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const priorityConfig = {
  urgent: { label: 'Urgente', color: 'bg-red-500', order: 1 },
  high: { label: 'Alta', color: 'bg-orange-500', order: 2 },
  medium: { label: 'Média', color: 'bg-yellow-500', order: 3 },
  low: { label: 'Baixa', color: 'bg-blue-500', order: 4 },
};

export function MyTasksCard() {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const { data: tasks = [], isLoading } = useMyAssignedTasks();
  const { data: statuses = [] } = useStatuses(activeWorkspace?.id);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('priority');
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    priorities: [],
    showCompleted: false,
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    urgent: true,
    high: true,
    medium: true,
    low: true,
  });

  const { data: columnPrefs } = useColumnPreferences(null, 'everything');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    if (columnPrefs) {
      setVisibleColumns(columnPrefs.visible_columns);
      setColumnOrder(columnPrefs.column_order);
    }
  }, [columnPrefs]);

  const availableStatuses = useMemo(() => {
    return statuses.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color || '#6b7280',
    }));
  }, [statuses]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (filters.statuses.length > 0 && task.status) {
        if (!filters.statuses.includes(task.status.id)) return false;
      }
      
      // Priority filter
      if (filters.priorities.length > 0) {
        if (!filters.priorities.includes(task.priority)) return false;
      }
      
      return true;
    });
  }, [tasks, searchTerm, filters]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, MyAssignedTask[]> = {};
    
    if (groupBy === 'none') {
      return { all: filteredTasks };
    }
    
    if (groupBy === 'priority') {
      Object.keys(priorityConfig).forEach(key => {
        groups[key] = [];
      });
      
      filteredTasks.forEach(task => {
        if (groups[task.priority]) {
          groups[task.priority].push(task);
        }
      });
    } else if (groupBy === 'status') {
      filteredTasks.forEach(task => {
        const statusName = task.status?.name || 'Sem status';
        if (!groups[statusName]) {
          groups[statusName] = [];
        }
        groups[statusName].push(task);
      });
    } else if (groupBy === 'due_date') {
      filteredTasks.forEach(task => {
        let groupKey = 'Sem data';
        if (task.due_date) {
          const date = parseISO(task.due_date);
          if (isPast(date) && !isToday(date)) {
            groupKey = 'Atrasadas';
          } else if (isToday(date)) {
            groupKey = 'Hoje';
          } else {
            groupKey = format(date, "dd 'de' MMMM", { locale: ptBR });
          }
        }
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(task);
      });
    }
    
    return groups;
  }, [filteredTasks, groupBy]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);

    return (
      <span className={cn(
        "text-xs flex items-center gap-1",
        isOverdue && "text-destructive",
        isDueToday && "text-orange-500"
      )}>
        <Calendar className="h-3 w-3" />
        {format(date, "dd MMM", { locale: ptBR })}
      </span>
    );
  };

  const getGroupLabel = (key: string) => {
    if (groupBy === 'priority') {
      return priorityConfig[key as keyof typeof priorityConfig]?.label || key;
    }
    return key;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Atribuídas a mim
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Atribuídas a mim
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length}
            </Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48 h-8"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Tabs defaultValue="list" className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="list" className="text-xs px-3 h-7">Lista</TabsTrigger>
              <TabsTrigger value="kanban" className="text-xs px-3 h-7" disabled>Quadro</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <GroupBySelector value={groupBy} onChange={setGroupBy} />
            <EverythingFilters
              filters={filters}
              onChange={setFilters}
              availableStatuses={availableStatuses}
            />
            <ColumnSelector
              listId={null}
              scope="everything"
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
              onColumnsChange={setVisibleColumns}
              onOrderChange={setColumnOrder}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto pt-0">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-xs">Você não tem tarefas atribuídas no momento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedTasks).map(([group, groupTasks]) => (
              <Collapsible
                key={group}
                open={expandedGroups[group] !== false}
                onOpenChange={() => toggleGroup(group)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-2 hover:bg-accent/50 rounded-md transition-colors">
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    expandedGroups[group] !== false && "rotate-90"
                  )} />
                  {groupBy === 'priority' && (
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      priorityConfig[group as keyof typeof priorityConfig]?.color
                    )} />
                  )}
                  <span className="text-sm font-medium">{getGroupLabel(group)}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {groupTasks.length}
                  </Badge>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 ml-6">
                  {groupTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/task/${task.id}`)}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-sm truncate">{task.title}</span>
                        {task.list && (
                          <span className="text-xs text-muted-foreground truncate hidden group-hover:inline">
                            {task.list.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: task.status.color,
                              color: task.status.color,
                            }}
                          >
                            {task.status.name}
                          </Badge>
                        )}
                        {getDueDateDisplay(task.due_date)}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
