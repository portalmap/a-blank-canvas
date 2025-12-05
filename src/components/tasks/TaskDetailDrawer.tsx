import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { Calendar, User, Clock, Flag, X, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUpdateTask } from '@/hooks/useTasks';
import { useStatuses } from '@/hooks/useStatuses';
import { SubtaskList } from './SubtaskList';
import { TaskComments } from './TaskComments';
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
  status?: {
    name: string;
    color: string | null;
  };
  assignee?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TaskDetailDrawer = ({ task, open, onOpenChange }: TaskDetailDrawerProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const updateTask = useUpdateTask();
  const { data: statuses } = useStatuses(task?.workspace_id);

  if (!task) return null;

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    await updateTask.mutateAsync({ id: task.id, title: editTitle });
    setIsEditingTitle(false);
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

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            {isEditingTitle ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xl font-semibold"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
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

          {/* Subtarefas - só mostra se não for uma subtarefa */}
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

          {/* Comentários */}
          <TaskComments taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
