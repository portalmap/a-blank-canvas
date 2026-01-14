import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSpace } from '@/hooks/useSpaces';
import { useFolder } from '@/hooks/useFolders';
import { useList, useListsForWorkspace } from '@/hooks/useLists';
import { useDuplicateTask } from '@/hooks/useDuplicate';
import { useDeleteTask } from '@/hooks/useTasks';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, PanelRightClose, PanelRight, Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { TaskMainContent } from '@/components/tasks/TaskMainContent';
import { TaskActivityPanel } from '@/components/tasks/TaskActivityPanel';
import { useState, useEffect } from 'react';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const useTask = (taskId?: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status_id,
          priority,
          assignee_id,
          start_date,
          due_date,
          list_id,
          workspace_id,
          parent_id,
          completed_at,
          created_at,
          assignee:profiles(full_name, avatar_url),
          status:statuses(name, color)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
};

const TaskView = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [hasLoggedCreation, setHasLoggedCreation] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const deleteTask = useDeleteTask();
  const { data: currentList } = useList(task?.list_id);
  const { data: currentSpace } = useSpace(currentList?.space_id);
  const { data: currentFolder } = useFolder(currentList?.folder_id);
  const { data: allLists } = useListsForWorkspace(task?.workspace_id);
  const duplicateTask = useDuplicateTask();
  const createActivity = useCreateTaskActivity();

  // Fetch workspace directly from task to display in breadcrumb
  const { data: taskWorkspace } = useQuery({
    queryKey: ['workspace', task?.workspace_id],
    queryFn: async () => {
      if (!task?.workspace_id) return null;
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('id', task.workspace_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!task?.workspace_id,
  });

  const handleDuplicateTask = async () => {
    if (!task || !selectedListId) return;
    
    const newTaskId = await duplicateTask.mutateAsync({
      taskId: task.id,
      targetListId: selectedListId,
    });
    
    setIsDuplicateDialogOpen(false);
    setSelectedListId('');
    
    // Navigate to the new task
    if (newTaskId) {
      navigate(`/task/${newTaskId}`);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    
    await deleteTask.mutateAsync({
      id: task.id,
      taskTitle: task.title,
    });
    
    setIsDeleteDialogOpen(false);
    navigate(-1);
  };

  // Registrar atividade de criação se for a primeira visita
  useEffect(() => {
    const checkAndLogCreation = async () => {
      if (!task || hasLoggedCreation) return;

      // Verificar se já existe atividade de criação
      const { data: existingActivity } = await supabase
        .from('task_activities')
        .select('id')
        .eq('task_id', task.id)
        .eq('activity_type', 'task.created')
        .limit(1);

      if (!existingActivity || existingActivity.length === 0) {
        // Registrar criação
        await createActivity.mutateAsync({
          taskId: task.id,
          activityType: 'task.created',
        });
      }
      setHasLoggedCreation(true);
    };

    checkAndLogCreation();
  }, [task?.id, hasLoggedCreation]);

  if (taskLoading || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {taskWorkspace && currentSpace && currentList && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/')}>
                    {taskWorkspace.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate(`/space/${currentSpace.id}`)}>
                    {currentSpace.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {currentFolder && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate(`/folder/${currentFolder.id}`)}>
                        {currentFolder.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate(`/list/${currentList.id}`)}>
                    {currentList.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[200px] truncate">
                    {task.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setSelectedListId(task.list_id);
                  setIsDuplicateDialogOpen(true);
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar Tarefa
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Tarefa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowActivityPanel(!showActivityPanel)}
              title={showActivityPanel ? 'Ocultar atividades' : 'Mostrar atividades'}
            >
              {showActivityPanel ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task Content */}
        <ScrollArea className={cn(
          "flex-1 transition-all duration-200",
          showActivityPanel ? "lg:w-[65%]" : "w-full"
        )}>
          <div className="p-6 max-w-3xl mx-auto">
            <TaskMainContent task={task} />
          </div>
        </ScrollArea>

        {/* Activity Panel */}
        {showActivityPanel && (
          <div className="hidden lg:flex w-[35%] border-l bg-muted/30">
            <TaskActivityPanel 
              taskId={task.id} 
              workspaceId={task.workspace_id}
              taskTitle={task.title}
            />
          </div>
        )}
      </div>

      {/* Duplicate Task Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Tarefa</DialogTitle>
            <DialogDescription>
              Selecione a lista de destino para duplicar "{task.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lista de destino</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma lista" />
                </SelectTrigger>
                <SelectContent>
                  {allLists?.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                      {list.id === task.list_id && (
                        <span className="text-muted-foreground text-xs ml-2">(atual)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDuplicateTask}
              disabled={!selectedListId || duplicateTask.isPending}
            >
              {duplicateTask.isPending ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A tarefa "{task.title}" será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTask.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskView;
