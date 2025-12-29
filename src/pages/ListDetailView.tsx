import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolders } from '@/hooks/useFolders';
import { useList } from '@/hooks/useLists';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import { useStatuses, useDefaultStatus } from '@/hooks/useStatuses';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskListView } from '@/components/views/TaskListView';
import { TaskKanbanView } from '@/components/views/TaskKanbanView';
import { TaskSprintView } from '@/components/views/TaskSprintView';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';

const ListDetailView = () => {
  const { listId } = useParams<{ listId: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data: currentList, isLoading: listLoading } = useList(listId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(listId);
  const { data: statuses } = useStatuses(activeWorkspace?.id);
  const { data: defaultStatus } = useDefaultStatus(activeWorkspace?.id);
  const createTask = useCreateTask();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  
  const { data: spaces } = useSpaces(activeWorkspace?.id);
  const { data: folders } = useFolders(currentList?.space_id);
  
  const currentSpace = spaces?.find(s => s.id === currentList?.space_id);
  const currentFolder = folders?.find(f => f.id === currentList?.folder_id);

  const handleCreateTask = async () => {
    if (!activeWorkspace || !listId || !newTaskTitle.trim() || !defaultStatus) return;

    await createTask.mutateAsync({
      workspaceId: activeWorkspace.id,
      listId,
      statusId: defaultStatus.id,
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setIsDialogOpen(false);
  };

  if (!activeWorkspace || listLoading || !currentList || !currentSpace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const viewMode = (currentList.default_view || 'list') as 'list' | 'kanban' | 'sprint';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/')}>
              {activeWorkspace.name}
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
            <BreadcrumbPage>{currentList.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{currentList.name}</h1>
          {currentList.description && (
            <p className="text-muted-foreground mt-1">{currentList.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <QuickAutomationButtons
            workspaceId={activeWorkspace.id}
            scopeType="list"
            scopeId={listId!}
            scopeName={currentList.name}
          />
          <Button onClick={() => setIsDialogOpen(true)} disabled={!defaultStatus}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {!defaultStatus && statuses !== undefined && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Status não configurados</AlertTitle>
          <AlertDescription>
            Este workspace não possui status configurados. Contate um administrador para criar os status padrão.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={viewMode} className="w-full">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="sprint">Sprint</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <TaskListView tasks={tasks || []} workspaceId={activeWorkspace.id} listId={listId!} />
          )}
        </TabsContent>

        <TabsContent value="kanban">
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <TaskKanbanView tasks={tasks || []} statuses={statuses || []} />
          )}
        </TabsContent>

        <TabsContent value="sprint">
          {tasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <TaskSprintView tasks={tasks || []} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa nesta lista
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Revisar documentação, Implementar feature X"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Descreva os detalhes da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                <SelectTrigger>
                  <SelectValue />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTaskTitle.trim() || createTask.isPending || !defaultStatus}
            >
              {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListDetailView;
