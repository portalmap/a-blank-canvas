import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Calendar, Clock, Flag, Check, X, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUpdateTask } from '@/hooks/useTasks';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { useUploadAttachment } from '@/hooks/useTaskAttachments';
import { SubtaskList } from './SubtaskList';
import { TaskChecklists } from './TaskChecklists';
import { TaskAttachmentsList } from './TaskAttachmentsList';
import { TaskAssigneesManager } from './TaskAssigneesManager';
import { TaskTagsSelector } from './TaskTagsSelector';
import { cn } from '@/lib/utils';
import { renderTextWithImagesAndLinks } from '@/lib/linkify';
import { toast } from 'sonner';
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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const updateTask = useUpdateTask();
  const createActivity = useCreateTaskActivity();
  const uploadAttachment = useUploadAttachment();
  const { data: statuses } = useStatusesForScope('list', task.list_id, task.workspace_id);

  // Handler para colar imagens
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          try {
            toast.info('Fazendo upload da imagem...');
            const uploaded = await uploadAttachment.mutateAsync({ taskId: task.id, file });
            const imageMarkdown = `![${file.name}](${uploaded.file_url})`;
            setEditDescription(prev => prev + (prev ? '\n' : '') + imageMarkdown);
            toast.success('Imagem adicionada!');
          } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            toast.error('Erro ao fazer upload da imagem');
          }
        }
        break;
      }
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle === task.title) {
      setIsEditingTitle(false);
      return;
    }
    
    const taskId = task.id;
    const oldTitle = task.title;
    const newTitle = editTitle;
    
    try {
      await updateTask.mutateAsync({ id: taskId, title: newTitle });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'title.changed',
        fieldName: 'title',
        oldValue: oldTitle,
        newValue: newTitle,
      });
    } catch (error) {
      console.error('Erro ao atualizar título ou registrar atividade:', error);
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (editDescription === (task.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    
    const taskId = task.id;
    const oldDescription = task.description || null;
    const newDescription = editDescription || null;
    
    try {
      await updateTask.mutateAsync({ id: taskId, description: newDescription });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'description.changed',
        fieldName: 'description',
        oldValue: oldDescription,
        newValue: newDescription,
      });
    } catch (error) {
      console.error('Erro ao atualizar descrição ou registrar atividade:', error);
    }
    setIsEditingDescription(false);
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
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Descrição</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditDescription(task.description || '');
              setIsDescriptionExpanded(true);
            }}
            title="Expandir descrição"
            className="h-7 w-7 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {isEditingDescription ? (
          <div className="space-y-2">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onPaste={handlePaste}
              placeholder="Adicione uma descrição... (Ctrl+V para colar imagens)"
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
            className="min-h-[80px] p-3 border rounded-md cursor-pointer hover:bg-muted/50 whitespace-pre-wrap"
            onClick={() => {
              setEditDescription(task.description || '');
              setIsEditingDescription(true);
            }}
          >
            {task.description ? (
              renderTextWithImagesAndLinks(task.description)
            ) : (
              <span className="text-muted-foreground">Clique para adicionar uma descrição...</span>
            )}
          </div>
        )}
      </div>

      {/* Modal de descrição expandida */}
      <Dialog open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Descrição</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onPaste={handlePaste}
              placeholder="Adicione uma descrição... (Ctrl+V para colar imagens)"
              className="min-h-[300px] resize-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDescriptionExpanded(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              handleSaveDescription();
              setIsDescriptionExpanded(false);
            }}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
