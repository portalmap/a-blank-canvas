import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useArchivedSpaces, useRestoreSpace, useDeleteSpace } from '@/hooks/useSpaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Archive, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from "@/lib/router-compat";
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

const ArchivedSpaces = () => {
  const { activeWorkspace } = useWorkspace();
  const { data: archivedSpaces, isLoading } = useArchivedSpaces(activeWorkspace?.id);
  const restoreSpace = useRestoreSpace();
  const deleteSpace = useDeleteSpace();
  const navigate = useNavigate();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Spaces Arquivados</h1>
          <p className="text-muted-foreground">
            Gerencie os spaces arquivados do workspace
          </p>
        </div>
      </div>

      {!archivedSpaces || archivedSpaces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Archive className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhum space arquivado</p>
            <p className="text-sm text-muted-foreground">
              Spaces arquivados aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {archivedSpaces.map((space) => (
            <Card key={space.id}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: space.color || '#94a3b8' }}
                  />
                  <div>
                    <p className="font-medium">{space.name}</p>
                    {space.description && (
                      <p className="text-sm text-muted-foreground">{space.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Arquivado em {new Date(space.archived_at!).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreSpace.mutate(space.id)}
                    disabled={restoreSpace.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restaurar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(space.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Space Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as pastas, listas e tarefas dentro deste space serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteSpace.mutate(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivedSpaces;
