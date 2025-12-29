import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces, useCreateSpace } from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';

const SpacesView = () => {
  const { activeWorkspace } = useWorkspace();
  const { data: spaces, isLoading } = useSpaces(activeWorkspace?.id);
  const createSpace = useCreateSpace();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');

  const handleCreateSpace = async () => {
    if (!activeWorkspace || !newSpaceName.trim()) return;

    await createSpace.mutateAsync({
      workspaceId: activeWorkspace.id,
      name: newSpaceName,
      description: newSpaceDescription,
    });

    setNewSpaceName('');
    setNewSpaceDescription('');
    setIsDialogOpen(false);
  };

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Selecione um workspace para continuar</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Spaces</h1>
          <p className="text-muted-foreground">
            Organize seu trabalho em spaces
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Space
        </Button>
      </div>

      {spaces && spaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhum space ainda</p>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro space para começar a organizar tarefas
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Space
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces?.map((space) => (
            <Card 
              key={space.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/space/${space.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: space.color || '#94a3b8' }}
                  />
                  {space.name}
                </CardTitle>
                {space.description && (
                  <CardDescription>{space.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Criado em {new Date(space.created_at).toLocaleDateString('pt-BR')}
                </p>
                <div onClick={(e) => e.stopPropagation()}>
                  <QuickAutomationButtons 
                    workspaceId={activeWorkspace.id}
                    scopeType="space"
                    scopeId={space.id}
                    scopeName={space.name}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Space</DialogTitle>
            <DialogDescription>
              Adicione um novo space para organizar suas pastas e listas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="Ex: Projetos, Marketing, Vendas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={newSpaceDescription}
                onChange={(e) => setNewSpaceDescription(e.target.value)}
                placeholder="Descreva o propósito deste space"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSpace} 
              disabled={!newSpaceName.trim() || createSpace.isPending}
            >
              {createSpace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpacesView;
