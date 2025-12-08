import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Pencil,
  Check,
  X
} from 'lucide-react';
import { useStatuses } from '@/hooks/useStatuses';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface WorkspaceStatusListProps {
  workspaceId: string;
}

const PRESET_COLORS = [
  '#94a3b8', '#f87171', '#fb923c', '#fbbf24', 
  '#a3e635', '#34d399', '#22d3ee', '#60a5fa', 
  '#a78bfa', '#f472b6',
];

export function WorkspaceStatusList({ workspaceId }: WorkspaceStatusListProps) {
  const { data: statuses, isLoading } = useStatuses(workspaceId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const queryClient = useQueryClient();

  const startEdit = (status: { id: string; name: string; color: string | null }) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color || PRESET_COLORS[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    const { error } = await supabase
      .from('statuses')
      .update({ name: editName, color: editColor })
      .eq('id', editingId);

    if (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    } else {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
    cancelEdit();
  };

  const addStatus = async () => {
    if (!newName.trim()) return;

    const maxOrder = statuses?.reduce((max, s) => Math.max(max, s.order_index), 0) || 0;

    const { error } = await supabase
      .from('statuses')
      .insert({
        workspace_id: workspaceId,
        name: newName,
        color: newColor,
        order_index: maxOrder + 1,
        scope_type: 'workspace',
      });

    if (error) {
      toast.error('Erro ao criar status');
      console.error(error);
    } else {
      toast.success('Status criado!');
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
    setIsAdding(false);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
  };

  const deleteStatus = async (id: string) => {
    const { error } = await supabase
      .from('statuses')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir status');
      console.error(error);
    } else {
      toast.success('Status excluído!');
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
  };

  const setDefault = async (id: string) => {
    // Remove default from all
    await supabase
      .from('statuses')
      .update({ is_default: false })
      .eq('workspace_id', workspaceId);

    // Set new default
    const { error } = await supabase
      .from('statuses')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao definir padrão');
    } else {
      toast.success('Status padrão definido!');
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-2">
      {statuses?.map((status) => (
        <div
          key={status.id}
          className="flex items-center gap-2 p-2 rounded-lg border bg-background"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          {editingId === status.id ? (
            <>
              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      editColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                  />
                ))}
              </div>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 h-8"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: status.color || '#94a3b8' }}
              />
              <span className="flex-1 text-sm">{status.name}</span>
              {status.is_default && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Padrão
                </span>
              )}
              {!status.is_default && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setDefault(status.id)}
                >
                  Definir padrão
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => startEdit(status)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteStatus(status.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
          <div className="flex gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`w-4 h-4 rounded-full transition-transform ${
                  newColor === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewColor(color)}
              />
            ))}
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do status"
            className="flex-1 h-8"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addStatus}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Status
        </Button>
      )}
    </div>
  );
}
