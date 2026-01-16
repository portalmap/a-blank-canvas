import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/ui/badge-variant';
import { format, startOfDay, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { Calendar, GitBranch } from 'lucide-react';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useUpdateTask } from '@/hooks/useTasks';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { executeStatusChangeAutomations } from '@/hooks/useStatusChangeAutomations';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  start_date: string | null;
  list_id: string;
  workspace_id: string;
  parent_id?: string | null;
  completed_at?: string | null;
  assignee_id?: string | null;
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Status {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
}

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: Status[];
}

const SubtaskBadge = ({ parentId }: { parentId: string }) => {
  const { data: subtasks } = useSubtasks(parentId);
  const count = subtasks?.length || 0;
  const completed = subtasks?.filter(s => s.completed_at).length || 0;

  if (count === 0) return null;

  return (
    <Badge variant="outline" className="text-xs">
      <GitBranch className="h-3 w-3 mr-1" />
      {completed}/{count}
    </Badge>
  );
};

export const TaskKanbanView = ({ tasks, statuses }: TaskKanbanViewProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: updateTask } = useUpdateTask();
  const createActivity = useCreateTaskActivity();

  const sortedStatuses = [...statuses].sort((a, b) => a.order_index - b.order_index);

  // Filtrar apenas tarefas principais (sem parent_id)
  const mainTasks = tasks.filter(t => !t.parent_id);

  const getTasksByStatus = (statusId: string) => {
    return mainTasks.filter((task) => task.status_id === statusId);
  };

  const isOverdue = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    const due = startOfDay(parseLocalDate(dueDate)!);
    const today = startOfDay(new Date());
    return isBefore(due, today);
  };

  const isDueToday = (dueDate: string | null, completedAt?: string | null) => {
    if (!dueDate || completedAt) return false;
    return isToday(parseLocalDate(dueDate)!);
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Se não tem destino ou não mudou de lugar, ignora
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // Se mudou de coluna (status diferente)
    if (destination.droppableId !== source.droppableId) {
      const oldStatus = statuses.find(s => s.id === source.droppableId);
      const newStatus = statuses.find(s => s.id === destination.droppableId);
      const task = tasks.find(t => t.id === draggableId);

      updateTask({
        id: draggableId,
        statusId: destination.droppableId
      });

      // Registrar atividade de mudança de status
      createActivity.mutate({
        taskId: draggableId,
        activityType: 'status.changed',
        fieldName: 'status_id',
        oldValue: oldStatus?.name || null,
        newValue: newStatus?.name || null,
      });

      // Executar automações de mudança de status
      if (task) {
        try {
          const automationResult = await executeStatusChangeAutomations({
            taskId: draggableId,
            workspaceId: task.workspace_id,
            listId: task.list_id,
            oldStatusId: source.droppableId,
            newStatusId: destination.droppableId,
          });

          if (automationResult.automationsExecuted > 0) {
            console.log(`${automationResult.automationsExecuted} automações executadas`);
            // Invalidar queries para atualizar subtarefas
            queryClient.invalidateQueries({ queryKey: ['subtasks', draggableId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }
        } catch (error) {
          console.error('Erro ao executar automações:', error);
        }
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto h-full pb-4">
        {sortedStatuses.map((status) => {
          const statusTasks = getTasksByStatus(status.id);

          return (
            <div
              key={status.id}
              className="flex-shrink-0 w-80 flex flex-col h-full min-h-0"
            >
              <Droppable droppableId={status.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "bg-muted/50 rounded-lg p-4 flex flex-col h-full min-h-[200px] transition-colors",
                      snapshot.isDraggingOver && "bg-muted/80 ring-2 ring-primary/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="font-semibold">{status.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        {statusTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="space-y-3">
                        {statusTasks.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            Nenhuma tarefa
                          </div>
                        ) : (
                          statusTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => !snapshot.isDragging && navigate(`/task/${task.id}`)}
                                >
                                  <Card
                                    className={cn(
                                      "cursor-grab hover:shadow-md transition-all",
                                      task.completed_at && "opacity-60",
                                      snapshot.isDragging && "shadow-xl rotate-2 cursor-grabbing ring-2 ring-primary"
                                    )}
                                  >
                                    <CardHeader className="p-4 pb-3">
                                      <CardTitle className={cn(
                                        "text-sm font-medium",
                                        task.completed_at && "line-through"
                                      )}>
                                        {task.title}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <PriorityBadge priority={task.priority} />
                                        <SubtaskBadge parentId={task.id} />
                                      </div>
                                      {task.due_date && (
                                        <div className={cn(
                                          "flex items-center gap-2 text-xs",
                                          isOverdue(task.due_date, task.completed_at) 
                                            ? "text-destructive" 
                                            : isDueToday(task.due_date, task.completed_at)
                                              ? "text-amber-600"
                                              : "text-muted-foreground"
                                        )}>
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                                          {isOverdue(task.due_date, task.completed_at) && (
                                            <span className="font-medium">Atrasada</span>
                                          )}
                                          {isDueToday(task.due_date, task.completed_at) && (
                                            <span className="font-medium">Hoje</span>
                                          )}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
