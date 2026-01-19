import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, isToday, isTomorrow, isPast, isThisWeek, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { ChevronDown, ChevronRight, GitBranch, MoreHorizontal, FolderInput, Archive, Trash2, User } from 'lucide-react';
import { TaskMoveDialog } from '@/components/tasks/TaskMoveDialog';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useDeleteTask, useArchiveTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { GroupByOption } from '@/components/everything/GroupBySelector';
import { TaskWithAssignees } from '@/hooks/useTasksWithAssignees';
import { SortableTableHead } from '@/components/tasks/SortableTableHead';
import { SortConfig, ColumnId, DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_ORDER, AVAILABLE_COLUMNS } from '@/hooks/useColumnPreferences';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  list_id: string;
  workspace_id: string;
  parent_id?: string | null;
  completed_at?: string | null;
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskListViewProps {
  tasks: Task[];
  workspaceId: string;
  listId: string;
  groupBy?: GroupByOption;
  tasksWithAssignees?: TaskWithAssignees[];
  selectedTaskIds?: string[];
  onSelectionChange?: (taskIds: string[]) => void;
  sortConfig?: SortConfig | null;
  onSortChange?: (column: ColumnId) => void;
  visibleColumns?: ColumnId[];
  columnOrder?: ColumnId[];
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgente', color: 'bg-red-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  medium: { label: 'Média', color: 'bg-yellow-500' },
  low: { label: 'Baixa', color: 'bg-blue-500' },
};

const SubtaskCount = ({ parentId }: { parentId: string }) => {
  const { data: subtasks } = useSubtasks(parentId);
  const count = subtasks?.length || 0;
  const completed = subtasks?.filter(s => s.completed_at).length || 0;

  if (count === 0) return null;

  return (
    <Badge variant="outline" className="ml-2 text-xs">
      <GitBranch className="h-3 w-3 mr-1" />
      {completed}/{count}
    </Badge>
  );
};

// Group tasks by due date
function groupTasksByDueDate(tasks: TaskWithAssignees[]) {
  const groups: Record<string, TaskWithAssignees[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDueDate: [],
  };

  const today = startOfDay(new Date());

  tasks.forEach((task) => {
    if (!task.due_date) {
      groups.noDueDate.push(task);
    } else {
      const dueDate = parseLocalDate(task.due_date)!;
      if (isPast(dueDate) && !isToday(dueDate) && !task.completed_at) {
        groups.overdue.push(task);
      } else if (isToday(dueDate)) {
        groups.today.push(task);
      } else if (isTomorrow(dueDate)) {
        groups.tomorrow.push(task);
      } else if (isThisWeek(dueDate, { weekStartsOn: 1 }) || dueDate <= addDays(today, 7)) {
        groups.thisWeek.push(task);
      } else {
        groups.later.push(task);
      }
    }
  });

  return [
    { key: 'overdue', label: 'Atrasadas', tasks: groups.overdue },
    { key: 'today', label: 'Hoje', tasks: groups.today },
    { key: 'tomorrow', label: 'Amanhã', tasks: groups.tomorrow },
    { key: 'thisWeek', label: 'Esta Semana', tasks: groups.thisWeek },
    { key: 'later', label: 'Mais Tarde', tasks: groups.later },
    { key: 'noDueDate', label: 'Sem Data', tasks: groups.noDueDate },
  ].filter((g) => g.tasks.length > 0);
}

// Group tasks by status
function groupTasksByStatus(tasks: TaskWithAssignees[]) {
  const groups = new Map<string, { label: string; color: string | null; tasks: TaskWithAssignees[] }>();

  tasks.forEach((task) => {
    const statusId = task.status?.id || 'no-status';
    const statusName = task.status?.name || 'Sem Status';
    const statusColor = task.status?.color || null;

    if (!groups.has(statusId)) {
      groups.set(statusId, { label: statusName, color: statusColor, tasks: [] });
    }
    groups.get(statusId)!.tasks.push(task);
  });

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    color: value.color,
    tasks: value.tasks,
  }));
}

// Group tasks by assignee
function groupTasksByAssignee(tasks: TaskWithAssignees[]) {
  const groups = new Map<string, { label: string; avatarUrl: string | null; tasks: TaskWithAssignees[] }>();

  // Add unassigned group
  groups.set('unassigned', { label: 'Não Atribuído', avatarUrl: null, tasks: [] });

  tasks.forEach((task) => {
    if (task.assignees.length === 0) {
      groups.get('unassigned')!.tasks.push(task);
    } else {
      task.assignees.forEach((assignee) => {
        if (!groups.has(assignee.id)) {
          groups.set(assignee.id, {
            label: assignee.full_name || 'Sem nome',
            avatarUrl: assignee.avatar_url,
            tasks: [],
          });
        }
        // Avoid duplicate tasks for same assignee
        if (!groups.get(assignee.id)!.tasks.find((t) => t.id === task.id)) {
          groups.get(assignee.id)!.tasks.push(task);
        }
      });
    }
  });

  return Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      avatarUrl: value.avatarUrl,
      tasks: value.tasks,
    }))
    .filter((g) => g.tasks.length > 0);
}

// Group tasks by priority
function groupTasksByPriority(tasks: TaskWithAssignees[]) {
  const priorityOrder = ['urgent', 'high', 'medium', 'low'];
  const groups = new Map<string, TaskWithAssignees[]>();

  priorityOrder.forEach((p) => groups.set(p, []));

  tasks.forEach((task) => {
    const priority = task.priority || 'medium';
    if (groups.has(priority)) {
      groups.get(priority)!.push(task);
    } else {
      groups.get('medium')!.push(task);
    }
  });

  return priorityOrder
    .map((p) => ({
      key: p,
      label: priorityConfig[p]?.label || p,
      color: priorityConfig[p]?.color || 'bg-gray-500',
      tasks: groups.get(p) || [],
    }))
    .filter((g) => g.tasks.length > 0);
}

const getInitials = (name: string | null) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const TaskListView = ({ 
  tasks, 
  workspaceId, 
  listId, 
  groupBy = 'none', 
  tasksWithAssignees, 
  selectedTaskIds = [], 
  onSelectionChange, 
  sortConfig = null, 
  onSortChange,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  columnOrder = DEFAULT_COLUMN_ORDER
}: TaskListViewProps) => {
  const navigate = useNavigate();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();

  // Get ordered visible columns (excluding checkbox and actions which are handled separately)
  const orderedVisibleColumns = columnOrder
    .filter(colId => visibleColumns.includes(colId) && colId !== 'checkbox' && colId !== 'actions')
    .map(colId => AVAILABLE_COLUMNS.find(c => c.id === colId)!)
    .filter(Boolean);

  // Check if a column is visible
  const isColumnVisible = (colId: ColumnId) => visibleColumns.includes(colId);

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
      onSelectionChange(tasks.filter(t => !t.parent_id).map(t => t.id));
    } else {
      onSelectionChange([]);
    }
  };

  const isOverdue = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    return new Date(dueDate) < new Date();
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handleDelete = () => {
    if (deleteTaskId) {
      deleteTask.mutate({ id: deleteTaskId });
      setDeleteTaskId(null);
    }
  };

  // Filtrar apenas tarefas principais (sem parent_id)
  const mainTasks = tasks.filter(t => !t.parent_id);

  const renderTaskRow = (task: Task, isSubtask = false) => {
    const isExpanded = expandedTasks.has(task.id);
    const subtasks = tasks.filter(t => t.parent_id === task.id);
    const hasSubtasks = subtasks.length > 0;
    const isSelected = selectedTaskIds.includes(task.id);

    // Render cell content based on column ID
    const renderCellContent = (colId: ColumnId) => {
      switch (colId) {
        case 'title':
          return (
            <div className="flex items-center">
              {!isSubtask && hasSubtasks && (
                <button
                  onClick={(e) => toggleExpand(task.id, e)}
                  className="mr-2 p-1 hover:bg-muted rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!isSubtask && !hasSubtasks && <div className="w-7" />}
              <span className={cn(task.completed_at && "line-through text-muted-foreground")}>
                {task.title}
              </span>
              {!isSubtask && <SubtaskCount parentId={task.id} />}
            </div>
          );
        case 'status':
          return <StatusBadge status={task.status?.name || 'Sem status'} />;
        case 'priority':
          return <PriorityBadge priority={task.priority} />;
        case 'start_date':
          return task.start_date ? format(parseLocalDate(task.start_date)!, 'dd/MM/yyyy', { locale: ptBR }) : '-';
        case 'due_date':
          return task.due_date ? format(parseLocalDate(task.due_date)!, 'dd/MM/yyyy', { locale: ptBR }) : '-';
        case 'assignee':
          return task.assignee ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assignee.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assignee.full_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{task.assignee.full_name || 'Sem nome'}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        case 'tags':
          return <span className="text-muted-foreground">-</span>;
        case 'comments':
          return <span className="text-muted-foreground">-</span>;
        case 'subtasks':
          return <SubtaskCount parentId={task.id} />;
        default:
          return null;
      }
    };

    return (
      <Fragment key={task.id}>
        <TableRow 
          className={cn(
            "cursor-pointer hover:bg-muted/50",
            isSubtask && "bg-muted/20",
            isSelected && "bg-primary/5"
          )}
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
          {orderedVisibleColumns.map((col) => (
            <TableCell 
              key={col.id}
              className={cn(col.id === 'title' && isSubtask && "pl-10", col.id === 'title' && "font-medium")}
            >
              {renderCellContent(col.id)}
            </TableCell>
          ))}
          {isColumnVisible('actions') && (
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setMoveTaskId(task.id)}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Mover
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => archiveTask.mutate(task.id)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteTaskId(task.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          )}
        </TableRow>
        {isExpanded && subtasks.map(subtask => renderTaskRow(subtask, true))}
      </Fragment>
    );
  };

  // Convert TaskWithAssignees to Task format for rendering
  const convertToTask = (t: TaskWithAssignees): Task => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status_id: t.status_id,
    priority: t.priority,
    assignee_id: t.assignees[0]?.id || null,
    start_date: t.start_date,
    due_date: t.due_date,
    list_id: t.list_id,
    workspace_id: t.workspace_id,
    parent_id: t.parent_id,
    completed_at: t.completed_at,
    status: t.status ? { name: t.status.name, color: t.status.color } : undefined,
    assignee: t.assignees[0] || undefined,
  });

  const renderGroupedTable = (groupTasks: TaskWithAssignees[]) => {
    const convertedTasks = groupTasks.map(convertToTask);
    const filteredTasks = convertedTasks.filter(t => !t.parent_id);

    if (filteredTasks.length === 0) return null;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && <TableHead className="w-10"></TableHead>}
            {onSortChange ? (
              orderedVisibleColumns.map((col) => (
                <SortableTableHead 
                  key={col.id}
                  columnId={col.id} 
                  label={col.label} 
                  sortConfig={sortConfig} 
                  onSort={onSortChange} 
                />
              ))
            ) : (
              orderedVisibleColumns.map((col) => (
                <TableHead key={col.id}>{col.label}</TableHead>
              ))
            )}
            {isColumnVisible('actions') && <TableHead className="w-12">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => renderTaskRow(task))}
        </TableBody>
      </Table>
    );
  };

  // Render grouped view
  if (groupBy !== 'none' && tasksWithAssignees) {
    let groups: { key: string; label: string; tasks: TaskWithAssignees[]; color?: string | null; avatarUrl?: string | null }[] = [];

    switch (groupBy) {
      case 'due_date':
        groups = groupTasksByDueDate(tasksWithAssignees);
        break;
      case 'status':
        groups = groupTasksByStatus(tasksWithAssignees);
        break;
      case 'assignee':
        groups = groupTasksByAssignee(tasksWithAssignees);
        break;
      case 'priority':
        groups = groupTasksByPriority(tasksWithAssignees);
        break;
    }

    if (groups.length === 0) {
      return (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Nenhuma tarefa encontrada
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);

            return (
              <Collapsible key={group.key} open={!isCollapsed} onOpenChange={() => toggleGroup(group.key)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}

                      {groupBy === 'assignee' && (
                        group.avatarUrl ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={group.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {getInitials(group.label)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )
                      )}

                      {groupBy === 'status' && group.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      )}

                      {groupBy === 'priority' && group.color && (
                        <div className={cn('w-3 h-3 rounded-full', group.color)} />
                      )}

                      <span className="font-medium">{group.label}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {group.tasks.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {renderGroupedTable(group.tasks)}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        <TaskMoveDialog
          taskId={moveTaskId}
          open={!!moveTaskId}
          onOpenChange={(open) => !open && setMoveTaskId(null)}
          workspaceId={workspaceId}
          currentListId={listId}
        />

        <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Render flat table (original behavior)
  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={mainTasks.length > 0 && selectedTaskIds.length === mainTasks.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </TableHead>
              )}
              {onSortChange ? (
                orderedVisibleColumns.map((col) => (
                  <SortableTableHead 
                    key={col.id}
                    columnId={col.id} 
                    label={col.label} 
                    sortConfig={sortConfig || null} 
                    onSort={onSortChange} 
                  />
                ))
              ) : (
                orderedVisibleColumns.map((col) => (
                  <TableHead key={col.id}>{col.label}</TableHead>
                ))
              )}
              {isColumnVisible('actions') && <TableHead className="w-12">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {mainTasks.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={orderedVisibleColumns.length + (onSelectionChange ? 1 : 0) + (isColumnVisible('actions') ? 1 : 0)} 
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhuma tarefa encontrada
                </TableCell>
              </TableRow>
            ) : (
              mainTasks.map((task) => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>

      <TaskMoveDialog
        taskId={moveTaskId}
        open={!!moveTaskId}
        onOpenChange={(open) => !open && setMoveTaskId(null)}
        workspaceId={workspaceId}
        currentListId={listId}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
