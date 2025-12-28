import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Calendar, User, Clock, Flag, Check, X } from 'lucide-react';
import { useUpdateTask } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { SubtaskList } from './SubtaskList';
import { TaskChecklists } from './TaskChecklists';
import { cn } from '@/lib/utils';

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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const updateTask = useUpdateTask();
  const createActivity = useCreateTaskActivity();
  const { data: statuses } = useStatuses(task.workspace_id);

  const logActivity = async (
    activityType: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null
  ) => {
    try {
      await createActivity.mutateAsync({
        taskId: task.id,
        activityType,
        fieldName,
        oldValue,
        newValue,
      });
    } catch (error) {
      console.error('Erro ao registrar atividade:', error);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }
    await updateTask.mutateAsync({ id: task.id, title: editTitle });
    await logActivity('title.changed', 'title', task.title, editTitle);
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (editDescription === (task.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    await updateTask.mutateAsync({ id: task.id, description: editDescription || null });
    await logActivity('description.changed', 'description', task.description || null, editDescription || null);
    setIsEditingDescription(false);
  };

  const handleStatusChange = async (statusId: string) => {
    const oldStatus = statuses?.find(s => s.id === task.status_id);
    const newStatus = statuses?.find(s => s.id === statusId);
    await updateTask.mutateAsync({ id: task.id, statusId });
    await logActivity('status.changed', 'status_id', oldStatus?.name || null, newStatus?.name || null);
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    await updateTask.mutateAsync({ id: task.id, priority });
    await logActivity('priority.changed', 'priority', task.priority, priority);
  };

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value || null;
    await updateTask.mutateAsync({ id: task.id, startDate: newDate });
    await logActivity('start_date.changed', 'start_date', task.start_date || null, newDate);
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value || null;
    await updateTask.mutateAsync({ id: task.id, dueDate: newDate });
    await logActivity('due_date.changed', 'due_date', task.due_date || null, newDate);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed_at;

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        {isEditingTitle ? (
          <div className="flex gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            />
            <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
          <Input 
            type="date" 
            value={task.start_date || ''} 
            onChange={handleStartDateChange}
          />
        </div>

        <div className="space-y-2">
          <label className={cn(
            "text-sm font-medium flex items-center gap-2",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            <Clock className="h-4 w-4" /> Data de Entrega
          </label>
          <Input 
            type="date" 
            value={task.due_date || ''} 
            onChange={handleDueDateChange}
            className={cn(isOverdue && "border-destructive")}
          />
          {isOverdue && (
            <p className="text-xs text-destructive">Tarefa atrasada!</p>
          )}
        </div>
      </div>

      {/* Responsável */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" /> Responsável
        </label>
        <div className="flex items-center gap-2 p-2 border rounded-md">
          {task.assignee ? (
            <>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {task.assignee.avatar_url ? (
                  <img 
                    src={task.assignee.avatar_url} 
                    alt={task.assignee.full_name || ''} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <span>{task.assignee.full_name || 'Sem nome'}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Não atribuído</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Descrição */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Descrição</label>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              rows={4}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveDescription}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="min-h-[80px] p-3 border rounded-md cursor-pointer hover:bg-muted/50"
            onClick={() => {
              setEditDescription(task.description || '');
              setIsEditingDescription(true);
            }}
          >
            {task.description || (
              <span className="text-muted-foreground">Clique para adicionar uma descrição...</span>
            )}
          </div>
        )}
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
    </div>
  );
};
