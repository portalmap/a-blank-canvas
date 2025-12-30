import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  CheckCircle2,
  Ban
} from 'lucide-react';
import { useStatuses } from '@/hooks/useStatuses';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WorkspaceStatusListProps {
  workspaceId: string;
}

type StatusCategory = 'not_started' | 'active' | 'in_progress' | 'done';

const PRESET_COLORS = [
  '#94a3b8', '#f87171', '#fb923c', '#fbbf24', 
  '#a3e635', '#34d399', '#22d3ee', '#60a5fa', 
  '#a78bfa', '#f472b6',
];

const CATEGORY_CONFIG: Record<StatusCategory, { 
  label: string; 
  icon: React.ElementType; 
  color: string;
  description: string;
}> = {
  not_started: { 
    label: 'Inativa', 
    icon: Ban, 
    color: 'text-muted-foreground',
    description: 'Tarefas que ainda não foram iniciadas'
  },
  active: { 
    label: 'Ativa', 
    icon: Circle, 
    color: 'text-blue-500',
    description: 'Tarefas prontas para trabalhar'
  },
  in_progress: { 
    label: 'Executando', 
    icon: Loader2, 
    color: 'text-yellow-500',
    description: 'Tarefas em andamento'
  },
  done: { 
    label: 'Finalizada', 
    icon: CheckCircle2, 
    color: 'text-green-500',
    description: 'Tarefas concluídas'
  },
};

const CATEGORY_ORDER: StatusCategory[] = ['not_started', 'active', 'in_progress', 'done'];

export function WorkspaceStatusList({ workspaceId }: WorkspaceStatusListProps) {
  const { data: statuses, isLoading } = useStatuses(workspaceId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [addingCategory, setAddingCategory] = useState<StatusCategory | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [expandedCategories, setExpandedCategories] = useState<Record<StatusCategory, boolean>>({
    not_started: true,
    active: true,
    in_progress: true,
    done: true,
  });
  const queryClient = useQueryClient();

  const toggleCategory = (category: StatusCategory) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

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

  const addStatus = async (category: StatusCategory) => {
    if (!newName.trim()) return;

    const categoryStatuses = statuses?.filter(s => (s.category || 'active') === category) || [];
    const maxOrder = categoryStatuses.reduce((max, s) => Math.max(max, s.order_index), -1);

    const { error } = await supabase
      .from('statuses')
      .insert({
        workspace_id: workspaceId,
        name: newName,
        color: newColor,
        order_index: maxOrder + 1,
        scope_type: 'workspace',
        category,
      });

    if (error) {
      toast.error('Erro ao criar status');
      console.error(error);
    } else {
      toast.success('Status criado!');
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
    setAddingCategory(null);
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

  const updateStatusCategory = async (id: string, category: StatusCategory) => {
    const { error } = await supabase
      .from('statuses')
      .update({ category })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao mover status');
      console.error(error);
    } else {
      queryClient.invalidateQueries({ queryKey: ['statuses', workspaceId] });
    }
  };

  const getStatusesByCategory = (category: StatusCategory) => {
    return statuses?.filter(s => (s.category || 'active') === category)
      .sort((a, b) => a.order_index - b.order_index) || [];
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-3">
      {CATEGORY_ORDER.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const categoryStatuses = getStatusesByCategory(category);
        const isExpanded = expandedCategories[category];

        return (
          <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
            <div className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="font-medium text-sm">{config.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({categoryStatuses.length})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingCategory(category);
                      setExpandedCategories(prev => ({ ...prev, [category]: true }));
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-2 space-y-1">
                  {categoryStatuses.length === 0 && addingCategory !== category && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {config.description}
                    </p>
                  )}

                  {categoryStatuses.map((status) => (
                    <div
                      key={status.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {editingId === status.id ? (
                        <>
                          <div className="flex gap-1 flex-wrap">
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
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
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
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {addingCategory === category && (
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                      <div className="flex gap-1 flex-wrap">
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
                        onKeyDown={(e) => e.key === 'Enter' && addStatus(category)}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addStatus(category)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddingCategory(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
