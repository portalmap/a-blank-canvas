import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpace } from '@/hooks/useSpaces';
import { useFolders, useCreateFolder } from '@/hooks/useFolders';
import { useLists, useCreateList } from '@/hooks/useLists';
import { useTaskStats } from '@/hooks/useTaskStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Loader2, Plus, FolderOpen, List, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskStatsDashboard from '@/components/dashboard/TaskStatsDashboard';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';

const SpaceDetailView = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data: currentSpace, isLoading: spaceLoading } = useSpace(spaceId);
  const { data: folders, isLoading: foldersLoading } = useFolders(spaceId);
  const { data: lists, isLoading: listsLoading } = useLists({ spaceId });
  const { data: taskStats, isLoading: statsLoading } = useTaskStats({ type: 'space', id: spaceId });
  
  const createFolder = useCreateFolder();
  const createList = useCreateList();

  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const handleCreateFolder = async () => {
    if (!spaceId || !newFolderName.trim()) return;

    await createFolder.mutateAsync({
      spaceId,
      name: newFolderName,
      description: newFolderDescription,
    });

    setNewFolderName('');
    setNewFolderDescription('');
    setIsFolderDialogOpen(false);
  };

  const handleCreateList = async () => {
    if (!currentSpace || !spaceId || !newListName.trim()) return;

    await createList.mutateAsync({
      workspaceId: currentSpace.workspace_id,
      spaceId,
      name: newListName,
      description: newListDescription,
    });

    setNewListName('');
    setNewListDescription('');
    setIsListDialogOpen(false);
  };

  if (!activeWorkspace || !currentSpace) {
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
            <BreadcrumbPage>{currentSpace.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: currentSpace.color || '#94a3b8' }}
            />
            {currentSpace.name}
          </h1>
          {currentSpace.description && (
            <p className="text-muted-foreground mt-1">{currentSpace.description}</p>
          )}
        </div>
        <QuickAutomationButtons
          workspaceId={activeWorkspace.id}
          scopeType="space"
          scopeId={spaceId!}
          scopeName={currentSpace.name}
        />
      </div>

      <TaskStatsDashboard stats={taskStats} isLoading={statsLoading} />

      <Tabs defaultValue="folders" className="w-full">
        <TabsList>
          <TabsTrigger value="folders">
            <FolderOpen className="mr-2 h-4 w-4" />
            Pastas
          </TabsTrigger>
          <TabsTrigger value="lists">
            <List className="mr-2 h-4 w-4" />
            Listas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsFolderDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pasta
            </Button>
          </div>

          {foldersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : folders && folders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhuma pasta ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie pastas para organizar suas listas
                </p>
                <Button onClick={() => setIsFolderDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Pasta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders?.map((folder) => (
                <Card 
                  key={folder.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/folder/${folder.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      {folder.name}
                    </CardTitle>
                    {folder.description && (
                      <CardDescription>{folder.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsListDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
            </Button>
          </div>

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
                  Crie listas diretamente no space ou dentro de pastas
                </p>
                <Button onClick={() => setIsListDialogOpen(true)}>
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
        </TabsContent>
      </Tabs>

      {/* Dialog para criar pasta */}
      <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Pasta</DialogTitle>
            <DialogDescription>
              Organize suas listas em pastas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: Design, Desenvolvimento, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-description">Descrição (opcional)</Label>
              <Textarea
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Descreva o propósito desta pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar lista */}
      <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Lista</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <span>{activeWorkspace?.name}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">{currentSpace?.name}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Sprint 1, Backlog, Tarefas Urgentes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">Descrição (opcional)</Label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Descreva o propósito desta lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>
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

export default SpaceDetailView;
