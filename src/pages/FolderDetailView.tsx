import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpace } from '@/hooks/useSpaces';
import { useFolder } from '@/hooks/useFolders';
import { useLists, useCreateList } from '@/hooks/useLists';
import { useTaskStats } from '@/hooks/useTaskStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Loader2, Plus, List, FolderOpen, ChevronRight } from 'lucide-react';
import TaskStatsDashboard from '@/components/dashboard/TaskStatsDashboard';
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';

const FolderDetailView = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data: currentFolder, isLoading: folderLoading } = useFolder(folderId);
  const { data: lists, isLoading: listsLoading } = useLists({ folderId });
  const { data: currentSpace, isLoading: spaceLoading } = useSpace(currentFolder?.space_id);
  
  const [dateRange, setDateRange] = useState<{ startDate: Date | undefined; endDate: Date | undefined }>({
    startDate: undefined,
    endDate: undefined,
  });

  const handleDateRangeChange = useCallback((range: { startDate: Date | undefined; endDate: Date | undefined }) => {
    setDateRange(range);
  }, []);

  const { data: taskStats, isLoading: statsLoading } = useTaskStats({ 
    type: 'folder', 
    id: folderId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const createList = useCreateList();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const handleCreateList = async () => {
    if (!currentSpace || !currentFolder || !newListName.trim()) return;

    await createList.mutateAsync({
      workspaceId: currentSpace.workspace_id,
      spaceId: currentFolder.space_id,
      folderId: currentFolder.id,
      name: newListName,
      description: newListDescription,
    });

    setNewListName('');
    setNewListDescription('');
    setIsDialogOpen(false);
  };

  if (!activeWorkspace || folderLoading || listsLoading || spaceLoading || !currentFolder || !currentSpace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{currentFolder.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            {currentFolder.name}
          </h1>
          {currentFolder.description && (
            <p className="text-muted-foreground mt-1">{currentFolder.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <QuickAutomationButtons
            workspaceId={activeWorkspace.id}
            scopeType="folder"
            scopeId={folderId!}
            scopeName={currentFolder.name}
          />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Lista
          </Button>
        </div>
      </div>

      <TaskStatsDashboard 
        stats={taskStats} 
        isLoading={statsLoading}
        filterComponent={<DateRangeFilter onDateRangeChange={handleDateRangeChange} />}
      />

      {listsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lists && lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <List className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma lista ainda</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crie listas dentro desta pasta para organizar tarefas
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists?.map((list) => (
            <Card 
              key={list.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/list/${list.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  {list.name}
                </CardTitle>
                {list.description && (
                  <CardDescription>{list.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <span>{activeWorkspace?.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span>{currentSpace?.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">{currentFolder?.name}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Sprint 1, Backlog, Tarefas Urgentes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Descreva o propósito desta lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateList} 
              disabled={!newListName.trim() || createList.isPending}
            >
              {createList.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolderDetailView;
