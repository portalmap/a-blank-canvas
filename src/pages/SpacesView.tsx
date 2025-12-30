import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';

const SpacesView = () => {
  const { activeWorkspace } = useWorkspace();
  const { data: spaces, isLoading } = useSpaces(activeWorkspace?.id);
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          <QuickAutomationButtons
            workspaceId={activeWorkspace.id}
            scopeType="workspace"
            scopeId={activeWorkspace.id}
            scopeName={activeWorkspace.name}
          />
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Space
          </Button>
        </div>
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
                <p className="text-xs text-muted-foreground">
                  Criado em {new Date(space.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSpaceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        workspaceId={activeWorkspace.id}
      />
    </div>
  );
};

export default SpacesView;
