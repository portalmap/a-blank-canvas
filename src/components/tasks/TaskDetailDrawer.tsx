import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Calendar, Clock, Flag, X, Loader2, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUpdateTask } from '@/hooks/useTasks';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { useTask } from '@/hooks/useTask';
import { SubtaskList } from './SubtaskList';
import { TaskComments } from './TaskComments';
import { TaskChecklists } from './TaskChecklists';
import { TaskAssigneesManager } from './TaskAssigneesManager';
import { TaskTagsSelector } from './TaskTagsSelector';
import { cn } from '@/lib/utils';
import { startOfDay, isBefore, isEqual } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

interface TaskDetailDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDetailDrawer = ({ taskId, open, onOpenChange }: TaskDetailDrawerProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const { data: statuses } = useStatusesForScope('list', task?.list_id ?? undefined, task?.workspace_id);

  // Sync local state when task data changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
    }
  }, [task]);

  if (!taskId) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!task) return null;

  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    
    const trimmedTitle = editTitle.trim();
    // Só salva se houver mudança real e título não vazio
    if (!trimmedTitle || trimmedTitle === task.title) {
      setEditTitle(task.title); // Restaura o original
      return;
    }
    
    try {
      await updateTask.mutateAsync({ id: task.id, title: trimmedTitle });
    } catch (error) {
      console.error('Erro ao atualizar título:', error);
      setEditTitle(task.title); // Restaura em caso de erro
    }
  };

  const handleSaveDescription = async () => {
    await updateTask.mutateAsync({ id: task.id, description: editDescription || null });
    setIsEditingDescription(false);
  };

  const handleStatusChange = async (statusId: string) => {
    await updateTask.mutateAsync({ id: task.id, statusId });
  };

  const handlePriorityChange = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    await updateTask.mutateAsync({ id: task.id, priority });
  };

  const handleStartDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTask.mutateAsync({ id: task.id, startDate: e.target.value || null });
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateTask.mutateAsync({ id: task.id, dueDate: e.target.value || null });
  };

  // Comparar apenas datas, ignorando horários (usando parseLocalDate para evitar problemas de timezone)
  const dueDate = task.due_date ? startOfDay(parseLocalDate(task.due_date)!) : null;
  const today = startOfDay(new Date());
  const isDueToday = dueDate && isEqual(dueDate, today) && !task.completed_at;
  const isOverdue = dueDate && isBefore(dueDate, today) && !task.completed_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 text-xl font-semibold"
                autoFocus
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
            ) : (
              <SheetTitle 
                className="text-xl cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2"
                onClick={() => {
                  setEditTitle(task.title);
                  setIsEditingTitle(true);
                }}
              >
                {task.title}
              </SheetTitle>
            )}
          </div>

          {task.parent_id && (
            <div className="text-sm text-muted-foreground">
              Subtarefa
            </div>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
                    onClick={() => updateTask.mutateAsync({ id: task.id, startDate: null })}
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
                    onClick={() => updateTask.mutateAsync({ id: task.id, dueDate: null })}
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
                  placeholder="Adicione uma descrição..."
                  rows={4}
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
                {task.description || (
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
                  placeholder="Adicione uma descrição..."
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

          {/* Subtarefas - só mostra se não for uma subtarefa */}
          {!task.parent_id && (
            <>
              <SubtaskList 
                parentTask={{
                  id: task.id,
                  title: task.title,
                  list_id: task.list_id || '',
                  workspace_id: task.workspace_id,
                  status_id: task.status_id || '',
                }}
                statuses={statuses || []}
              />
              <Separator />
            </>
          )}

          {/* Checklists */}
          <TaskChecklists taskId={task.id} />

          <Separator />

          {/* Comentários */}
          <TaskComments taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
