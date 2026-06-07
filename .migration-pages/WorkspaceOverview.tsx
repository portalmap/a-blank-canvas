import { useState } from 'react';
import { useWorkspaces, useCreateWorkspace, useDefaultWorkspace, useSetDefaultWorkspace } from '@/hooks/useWorkspaces';
import { useCanCreateWorkspace } from '@/hooks/useCanCreateWorkspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Home, Pencil, Star } from 'lucide-react';
import { WorkspaceEditDialog } from '@/components/workspace/WorkspaceEditDialog';

const WorkspaceOverview = () => {
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const { data: canCreate } = useCanCreateWorkspace();
  const { data: defaultWorkspaceId } = useDefaultWorkspace();
  const setDefaultWorkspace = useSetDefaultWorkspace();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);

  const handleToggleDefault = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDefault = defaultWorkspaceId === workspaceId ? null : workspaceId;
    setDefaultWorkspace.mutate(newDefault);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    await createWorkspace.mutateAsync(newWorkspaceName);
    setNewWorkspaceName('');
    setDialogOpen(false);
  };

  const handleSelectWorkspace = (workspace: any) => {
    setActiveWorkspace(workspace);
    navigate('/spaces');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Workspaces</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus projetos e equipes
          </p>
        </div>

        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Workspace</DialogTitle>
                <DialogDescription>
                  Crie um novo workspace para organizar seus projetos
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Workspace</Label>
                  <Input
                    id="name"
                    placeholder="Meu Projeto"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createWorkspace.isPending}>
                  {createWorkspace.isPending ? 'Criando...' : 'Criar Workspace'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces && workspaces.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhum workspace ainda</p>
              <p className="text-muted-foreground mb-4">
                {canCreate 
                  ? 'Crie seu primeiro workspace para começar'
                  : 'Você ainda não foi adicionado a nenhum workspace'}
              </p>
              {canCreate && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Workspace
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          workspaces?.map((workspace) => (
            <div key={workspace.id} className="relative group">
              <Card 
                className={`hover:shadow-lg transition-all cursor-pointer h-full ${
                  activeWorkspace?.id === workspace.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectWorkspace(workspace)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-primary" />
                      {workspace.name}
                      {defaultWorkspaceId === workspace.id && (
                        <Badge variant="secondary" className="text-xs">Padrão</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`transition-opacity ${
                          defaultWorkspaceId === workspace.id 
                            ? 'opacity-100' 
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => handleToggleDefault(workspace.id, e)}
                        title={defaultWorkspaceId === workspace.id ? 'Remover como padrão' : 'Definir como padrão'}
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            defaultWorkspaceId === workspace.id 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedWorkspace({
                            id: workspace.id,
                            name: workspace.name,
                            description: workspace.description,
                          });
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {workspace.description || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Criado em {new Date(workspace.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </CardContent>
                </Card>
            </div>
          ))
        )}
      </div>

      <WorkspaceEditDialog
        workspace={selectedWorkspace}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
};

export default WorkspaceOverview;