import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateWorkspace } from '@/hooks/useWorkspaces';

interface WorkspaceEditDialogProps {
  workspace: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkspaceEditDialog = ({ workspace, open, onOpenChange }: WorkspaceEditDialogProps) => {
  const updateWorkspace = useUpdateWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
    }
  }, [workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim()) return;

    try {
      await updateWorkspace.mutateAsync({
        id: workspace.id,
        name: name.trim(),
        description: description.trim() || null,
      });
      
      onOpenChange(false);
    } catch (error) {
      // O erro já é tratado no hook, não precisa fazer nada aqui
      console.error('Erro ao salvar workspace:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Workspace</DialogTitle>
          <DialogDescription>
            Atualize as informações do seu workspace
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Workspace *</Label>
            <Input
              id="name"
              placeholder="Meu Projeto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição do workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
