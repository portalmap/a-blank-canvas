import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Calendar, MapPin } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek, addDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AllTask } from '@/hooks/useAllTasks';
import type { GroupByOption } from './GroupBySelector';
import type { SortConfig, ColumnId } from '@/hooks/useColumnPreferences';
import { SortableTableHead } from '@/components/tasks/SortableTableHead';

type TaskWithAssignees = AllTask & { 
  assignees: Array<{ id: string; full_name: string | null; avatar_url: string | null }> 
};

interface EverythingTableViewProps {
  tasks: TaskWithAssignees[];
  groupBy: GroupByOption;
  selectedTaskIds?: string[];
  onSelectionChange?: (taskIds: string[]) => void;
  sortConfig?: SortConfig | null;
  onSortChange?: (column: ColumnId) => void;
  visibleColumns: ColumnId[];
  columnOrder: ColumnId[];
}

const priorityConfig = {
  urgent: { label: 'Urgente', color: 'bg-red-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  medium: { label: 'Média', color: 'bg-yellow-500' },
  low: { label: 'Baixa', color: 'bg-blue-500' },
};

function groupTasksByDueDate(tasks: TaskWithAssignees[]) {
  const groups: Record<string, TaskWithAssignees[]> = {
    'Em atraso': [],
    'Hoje': [],
    'Amanhã': [],
    'Esta semana': [],
    'Próxima semana': [],
    'Mais tarde': [],
    'Sem data': [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeekStart = addDays(today, 7);
  const nextWeekEnd = addDays(today, 14);

  tasks.forEach((task) => {
    if (!task.due_date) {
      groups['Sem data'].push(task);
    } else {
      const dueDate = parseLocalDate(task.due_date)!;

      if (isPast(dueDate) && !isToday(dueDate) && !task.completed_at) {
        groups['Em atraso'].push(task);
      } else if (isToday(dueDate)) {
        groups['Hoje'].push(task);
      } else if (isTomorrow(dueDate)) {
        groups['Amanhã'].push(task);
      } else if (isThisWeek(dueDate, { weekStartsOn: 0 })) {
        groups['Esta semana'].push(task);
      } else if (isAfter(dueDate, nextWeekStart) && !isAfter(dueDate, nextWeekEnd)) {
        groups['Próxima semana'].push(task);
      } else {
        groups['Mais tarde'].push(task);
      }
    }
  });

  return Object.entries(groups).filter(([_, tasks]) => tasks.length > 0);
}

function groupTasksByStatus(tasks: TaskWithAssignees[]) {
  const groups: Record<string, TaskWithAssignees[]> = {};

  tasks.forEach((task) => {
    const statusName = task.status?.name || 'Sem status';
    if (!groups[statusName]) groups[statusName] = [];
    groups[statusName].push(task);
  });

  return Object.entries(groups);
}

function groupTasksByAssignee(tasks: TaskWithAssignees[]) {
  const groups: Record<string, TaskWithAssignees[]> = {};

  tasks.forEach((task) => {
    if (task.assignees.length === 0) {
      const key = 'Não atribuído';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    } else {
      task.assignees.forEach((assignee) => {
        const key = assignee.full_name || 'Sem nome';
        if (!groups[key]) groups[key] = [];
        if (!groups[key].find(t => t.id === task.id)) {
          groups[key].push(task);
        }
      });
    }
  });

  return Object.entries(groups);
}

function groupTasksByPriority(tasks: TaskWithAssignees[]) {
  const order = ['urgent', 'high', 'medium', 'low'];
  const groups: Record<string, TaskWithAssignees[]> = {};

  tasks.forEach((task) => {
    const priority = task.priority || 'medium';
    const label = priorityConfig[priority]?.label || 'Média';
    if (!groups[label]) groups[label] = [];
    groups[label].push(task);
  });

  return Object.entries(groups).sort((a, b) => {
    const aIndex = order.indexOf(Object.keys(priorityConfig).find(k => priorityConfig[k as keyof typeof priorityConfig].label === a[0]) || 'medium');
    const bIndex = order.indexOf(Object.keys(priorityConfig).find(k => priorityConfig[k as keyof typeof priorityConfig].label === b[0]) || 'medium');
    return aIndex - bIndex;
  });
}

export function EverythingTableView({ tasks, groupBy, selectedTaskIds = [], onSelectionChange, sortConfig = null, onSortChange, visibleColumns, columnOrder }: EverythingTableViewProps) {
  const navigate = useNavigate();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedTaskIds, taskId]);
    } else {
      onSelectionChange(selectedTaskIds.filter(id => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(tasks.map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const groupedTasks = (() => {
    switch (groupBy) {
      case 'due_date':
        return groupTasksByDueDate(tasks);
      case 'status':
        return groupTasksByStatus(tasks);
      case 'assignee':
        return groupTasksByAssignee(tasks);
      case 'priority':
        return groupTasksByPriority(tasks);
      default:
        return [['Todas as tarefas', tasks]];
    }
  })();

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOverdue = (task: TaskWithAssignees) => {
    if (!task.due_date || task.completed_at) return false;
    const dueDate = parseLocalDate(task.due_date)!;
    return isPast(dueDate) && !isToday(dueDate);
  };

  // Get ordered visible columns (excluding checkbox and actions which are always shown)
  const orderedColumns = columnOrder
    .filter(col => visibleColumns.includes(col) && !['checkbox', 'actions'].includes(col));

  const renderTaskRow = (task: TaskWithAssignees) => {
    const isSelected = selectedTaskIds.includes(task.id);
    
    const renderCellContent = (columnId: ColumnId) => {
      switch (columnId) {
        case 'title':
          return (
            <TableCell key={columnId} className="max-w-md">
              <div className="flex flex-col gap-1">
                <span className="font-medium truncate">{task.title}</span>
                {task.list && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {task.list.space?.name}
                      {task.list.folder && ` > ${task.list.folder.name}`}
                      {` > ${task.list.name}`}
                    </span>
                  </div>
                )}
              </div>
            </TableCell>
          );
        case 'status':
          return (
            <TableCell key={columnId}>
              {task.status && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: task.status.color || undefined,
                    backgroundColor: task.status.color ? `${task.status.color}20` : undefined,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: task.status.color || '#6b7280' }}
                  />
                  {task.status.name}
                </Badge>
              )}
            </TableCell>
          );
        case 'assignee':
          return (
            <TableCell key={columnId}>
              <div className="flex -space-x-2">
                {task.assignees.length > 0 ? (
                  task.assignees.slice(0, 3).map((assignee) => (
                    <Tooltip key={assignee.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarImage src={assignee.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(assignee.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{assignee.full_name || 'Sem nome'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
                {task.assignees.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background cursor-default">
                        +{task.assignees.length - 3}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        {task.assignees.slice(3).map((assignee) => (
                          <span key={assignee.id}>{assignee.full_name || 'Sem nome'}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TableCell>
          );
        case 'due_date':
          return (
            <TableCell key={columnId}>
              {task.due_date ? (
                <span
                  className={cn(
                    'text-sm flex items-center gap-1',
                    isOverdue(task) && 'text-red-500 font-medium'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {format(parseLocalDate(task.due_date)!, 'dd/MM/yy', { locale: ptBR })}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
          );
        case 'start_date':
          return (
            <TableCell key={columnId}>
              {task.start_date ? (
                <span className="text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseLocalDate(task.start_date)!, 'dd/MM/yy', { locale: ptBR })}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </TableCell>
          );
        case 'priority':
          return (
            <TableCell key={columnId}>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs text-white',
                  priorityConfig[task.priority]?.color
                )}
              >
                {priorityConfig[task.priority]?.label || 'Média'}
              </Badge>
            </TableCell>
          );
        default:
          return null;
      }
    };
    
    return (
      <TableRow
        key={task.id}
        className={cn("hover:bg-muted/50 cursor-pointer", isSelected && "bg-primary/5")}
        onClick={() => navigate(`/task/${task.id}`)}
      >
        {onSelectionChange && (
          <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
            />
          </TableCell>
        )}
        {orderedColumns.map(col => renderCellContent(col))}
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/task/${task.id}`)}>
                Ver detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  // Column header mapping
  const columnLabels: Record<ColumnId, string> = {
    checkbox: '',
    title: 'Tarefa',
    status: 'Status',
    assignee: 'Responsável',
    due_date: 'Vencimento',
    start_date: 'Data de início',
    priority: 'Prioridade',
    tags: 'Etiquetas',
    comments: 'Comentários',
    subtasks: 'Subtarefas',
    actions: '',
  };

  const renderTableHeader = (tasksForSelection: TaskWithAssignees[]) => (
    <TableHeader>
      <TableRow>
        {onSelectionChange && (
          <TableHead className="w-10">
            <Checkbox
              checked={tasksForSelection.length > 0 && tasksForSelection.every(t => selectedTaskIds.includes(t.id))}
              onCheckedChange={(checked) => {
                if (checked) {
                  const newIds = [...selectedTaskIds, ...tasksForSelection.map(t => t.id).filter(id => !selectedTaskIds.includes(id))];
                  onSelectionChange(newIds);
                } else {
                  const groupIds = tasksForSelection.map(t => t.id);
                  onSelectionChange(selectedTaskIds.filter(id => !groupIds.includes(id)));
                }
              }}
            />
          </TableHead>
        )}
        {onSortChange ? (
          <>
            {orderedColumns.map(col => (
              <SortableTableHead 
                key={col} 
                columnId={col} 
                label={columnLabels[col]} 
                sortConfig={sortConfig} 
                onSort={onSortChange}
                className={col === 'title' ? 'w-[40%]' : undefined}
              />
            ))}
          </>
        ) : (
          <>
            {orderedColumns.map(col => (
              <TableHead key={col} className={col === 'title' ? 'w-[40%]' : undefined}>
                {columnLabels[col]}
              </TableHead>
            ))}
          </>
        )}
        <TableHead className="w-10"></TableHead>
      </TableRow>
    </TableHeader>
  );

  const colSpan = (onSelectionChange ? 1 : 0) + orderedColumns.length + 1;

  if (groupBy === 'none') {
    return (
      <Table>
        {renderTableHeader(tasks)}
        <TableBody>
          {tasks.map(renderTaskRow)}
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTasks.map(([groupName, groupTasks]) => {
        const name = groupName as string;
        const tasksInGroup = groupTasks as TaskWithAssignees[];
        const isCollapsed = collapsedGroups.has(name);
        
        return (
          <Collapsible
            key={name}
            open={!isCollapsed}
            onOpenChange={() => toggleGroup(name)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md cursor-pointer">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="font-medium">{name}</span>
                <Badge variant="secondary" className="text-xs">
                  {tasksInGroup.length}
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                {renderTableHeader(tasksInGroup)}
                <TableBody>
                  {tasksInGroup.map(renderTaskRow)}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      
      {groupedTasks.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          Nenhuma tarefa encontrada
        </div>
      )}
    </div>
  );
}
