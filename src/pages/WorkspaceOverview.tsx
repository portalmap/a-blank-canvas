import { useState } from 'react';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspaces';
import { useCanCreateWorkspace } from '@/hooks/useCanCreateWorkspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const WorkspaceOverview = () => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const { data: canCreate } = useCanCreateWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    await createWorkspace.mutateAsync(newWorkspaceName);
    setNewWorkspaceName('');
    setDialogOpen(false);
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
            <Link key={workspace.id} to={`/workspace/${workspace.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    {workspace.name}
                  </CardTitle>
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
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkspaceOverview;