import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Calendar, Clock, Flag, X } from 'lucide-react';
import { useUpdateTask } from '@/hooks/useTasks';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { SubtaskList } from './SubtaskList';
import { TaskChecklists } from './TaskChecklists';
import { TaskAttachmentsList } from './TaskAttachmentsList';
import { TaskAssigneesManager } from './TaskAssigneesManager';
import { TaskTagsSelector } from './TaskTagsSelector';
import { SimpleRichTextEditor } from '@/components/documents/editor';
import { cn } from '@/lib/utils';
import { startOfDay, isBefore, isEqual } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';
interface Task {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  list_id: string;
  workspace_id: string;
  parent_id?: string | null;
  completed_at?: string | null;
  created_at?: string;
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskMainContentProps {
  task: Task;
}

export const TaskMainContent = ({ task }: TaskMainContentProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState(task.description || '');

  const updateTask = useUpdateTask();
  const createActivity = useCreateTaskActivity();
  const { data: statuses } = useStatusesForScope('list', task.list_id, task.workspace_id);

  // Sincroniza descrição quando a tarefa muda
  useEffect(() => {
    setEditDescription(task.description || '');
  }, [task.id, task.description]);

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    
    const trimmedTitle = editTitle.trim();
    // Só salva se houver mudança real e título não vazio
    if (!trimmedTitle || trimmedTitle === task.title) {
      setEditTitle(task.title); // Restaura o original
      return;
    }
    
    const taskId = task.id;
    const oldTitle = task.title;
    
    try {
      await updateTask.mutateAsync({ id: taskId, title: trimmedTitle });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'title.changed',
        fieldName: 'title',
        oldValue: oldTitle,
        newValue: trimmedTitle,
      });
    } catch (error) {
      console.error('Erro ao atualizar título ou registrar atividade:', error);
      setEditTitle(task.title); // Restaura em caso de erro
    }
  };

  const handleDescriptionChange = async (newDescription: string) => {
    setEditDescription(newDescription);
    
    // Debounce could be added here, but for now save on each change
    const oldDescription = task.description || null;
    
    if (newDescription === oldDescription) return;
    
    try {
      await updateTask.mutateAsync({ id: task.id, description: newDescription || null });
      await createActivity.mutateAsync({
        taskId: task.id,
        activityType: 'description.changed',
        fieldName: 'description',
        oldValue: oldDescription,
        newValue: newDescription || null,
      });
    } catch (error) {
      console.error('Erro ao atualizar descrição ou registrar atividade:', error);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    const taskId = task.id;
    const oldStatus = statuses?.find(s => s.id === task.status_id);
    const newStatus = statuses?.find(s => s.id === statusId);
    const oldStatusName = oldStatus?.name || null;
    const newStatusName = newStatus?.name || null;
    
    try {
      await updateTask.mutateAsync({ id: taskId, statusId });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'status.changed',
        fieldName: 'status_id',
        oldValue: oldStatusName,
        newValue: newStatusName,
      });
    } catch (error) {
      console.error('Erro ao atualizar status ou registrar atividade:', error);
    }
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const taskId = task.id;
    const oldPriority = task.priority;
    
    try {
      await updateTask.mutateAsync({ id: taskId, priority });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'priority.changed',
        fieldName: 'priority',
        oldValue: oldPriority,
        newValue: priority,
      });
    } catch (error) {
      console.error('Erro ao atualizar prioridade ou registrar atividade:', error);
    }
  };

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const taskId = task.id;
    const oldDate = task.start_date || null;
    const newDate = e.target.value || null;
    
    try {
      await updateTask.mutateAsync({ id: taskId, startDate: newDate });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'start_date.changed',
        fieldName: 'start_date',
        oldValue: oldDate,
        newValue: newDate,
      });
    } catch (error) {
      console.error('Erro ao atualizar data de início ou registrar atividade:', error);
    }
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const taskId = task.id;
    const oldDate = task.due_date || null;
    const newDate = e.target.value || null;
    
    try {
      await updateTask.mutateAsync({ id: taskId, dueDate: newDate });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'due_date.changed',
        fieldName: 'due_date',
        oldValue: oldDate,
        newValue: newDate,
      });
    } catch (error) {
      console.error('Erro ao atualizar data de entrega ou registrar atividade:', error);
    }
  };

  // Comparar apenas datas, ignorando horários (usando parseLocalDate para evitar problemas de timezone)
  const dueDate = task.due_date ? startOfDay(parseLocalDate(task.due_date)!) : null;
  const today = startOfDay(new Date());
  const isDueToday = dueDate && isEqual(dueDate, today) && !task.completed_at;
  const isOverdue = dueDate && isBefore(dueDate, today) && !task.completed_at;

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        {isEditingTitle ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-2xl font-bold"
            autoFocus
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <h1 
            className="text-2xl font-bold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2"
            onClick={() => {
              setEditTitle(task.title);
              setIsEditingTitle(true);
            }}
          >
            {task.title}
          </h1>
        )}
        {task.parent_id && (
          <p className="text-sm text-muted-foreground mt-1">Subtarefa</p>
        )}
      </div>

      {/* Status e Prioridade */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Flag className="h-4 w-4" /> Status
          </label>
          <Select value={task.status_id} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue>
                <StatusBadge status={task.status?.name || 'Sem status'} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statuses?.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Flag className="h-4 w-4" /> Prioridade
          </label>
          <Select value={task.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger>
              <SelectValue>
                <PriorityBadge priority={task.priority} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Data de Início
          </label>
          <div className="relative">
            <Input 
              type="date" 
              value={task.start_date || ''} 
              onChange={handleStartDateChange}
              className="pr-8"
            />
            {task.start_date && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
                onClick={async () => {
                  const oldDate = task.start_date || null;
                  await updateTask.mutateAsync({ id: task.id, startDate: null });
                  await createActivity.mutateAsync({
                    taskId: task.id,
                    activityType: 'start_date.changed',
                    fieldName: 'start_date',
                    oldValue: oldDate,
                    newValue: null,
                  });
                }}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className={cn(
            "text-sm font-medium flex items-center gap-2",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Clock className="h-4 w-4" /> Data de Entrega
          </label>
          <div className="relative">
            <Input 
              type="date" 
              value={task.due_date || ''} 
              onChange={handleDueDateChange}
              className={cn("pr-8", isOverdue && "border-destructive")}
            />
            {task.due_date && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
                onClick={async () => {
                  const oldDate = task.due_date || null;
                  await updateTask.mutateAsync({ id: task.id, dueDate: null });
                  await createActivity.mutateAsync({
                    taskId: task.id,
                    activityType: 'due_date.changed',
                    fieldName: 'due_date',
                    oldValue: oldDate,
                    newValue: null,
                  });
                }}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
          {isDueToday && (
            <p className="text-xs text-amber-600 font-medium">Entregar hoje</p>
          )}
          {isOverdue && (
            <p className="text-xs text-destructive font-medium">Tarefa atrasada!</p>
          )}
        </div>
      </div>

      {/* Responsáveis */}
      <TaskAssigneesManager taskId={task.id} workspaceId={task.workspace_id} />

      {/* Etiquetas */}
      <TaskTagsSelector taskId={task.id} workspaceId={task.workspace_id} />

      <Separator />

      {/* Descrição */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Descrição</label>
        <SimpleRichTextEditor
          content={editDescription}
          onChange={handleDescriptionChange}
          placeholder="Adicione uma descrição..."
          minHeight="100px"
        />
      </div>

      <Separator />

      {/* Subtarefas */}
      {!task.parent_id && (
        <>
          <SubtaskList 
            parentTask={task}
            statuses={statuses || []}
          />
          <Separator />
        </>
      )}

      {/* Checklists */}
      <TaskChecklists taskId={task.id} />

      <Separator />

      {/* Anexos */}
      <TaskAttachmentsList taskId={task.id} />
    </div>
  );
};
