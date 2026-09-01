import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Check,
  Ban,
  Circle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { 
  useStatusTemplate, 
  useCreateStatusTemplate, 
  useUpdateStatusTemplate,
  countTasksForTemplateItems,
  StatusTemplateItem 
} from '@/hooks/useStatusTemplates';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StatusTemplateEditorProps {
  workspaceId: string;
  templateId: string | null;
  onClose: () => void;
}

type StatusCategory = 'not_started' | 'active' | 'in_progress' | 'done';

interface StatusItemForm {
  id?: string;
  name: string;
  color: string;
  is_default: boolean;
  category: StatusCategory;
}

const PRESET_COLORS = [
  '#94a3b8', '#f87171', '#fb923c', '#fbbf24', 
  '#a3e635', '#34d399', '#22d3ee', '#60a5fa', 
  '#a78bfa', '#f472b6',
];

const CATEGORY_CONFIG: Record<StatusCategory, { label: string; icon: React.ElementType; color: string }> = {
  not_started: { label: 'Inativa', icon: Ban, color: 'text-muted-foreground' },
  active: { label: 'Ativa', icon: Circle, color: 'text-blue-500' },
  in_progress: { label: 'Executando', icon: Loader2, color: 'text-yellow-500' },
  done: { label: 'Finalizada', icon: CheckCircle2, color: 'text-green-500' },
};

const CATEGORY_ORDER: StatusCategory[] = ['not_started', 'active', 'in_progress', 'done'];

export function StatusTemplateEditor({ workspaceId, templateId, onClose }: StatusTemplateEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<StatusItemForm[]>([]);
  const [checkingRemoval, setCheckingRemoval] = useState(false);
  const [pendingOrdered, setPendingOrdered] = useState<StatusItemForm[] | null>(null);
  const [removalTargets, setRemovalTargets] = useState<{ id: string; name: string; count: number }[]>([]);
  const [targetByRemoved, setTargetByRemoved] = useState<Record<string, string>>({});


  const { data: template, isLoading } = useStatusTemplate(templateId || undefined);
  const createTemplate = useCreateStatusTemplate();
  const updateTemplate = useUpdateStatusTemplate();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setItems(
        template.status_template_items
          ?.sort((a, b) => a.order_index - b.order_index)
          .map(item => ({
            id: item.id,
            name: item.name,
            color: item.color || '#94a3b8',
            is_default: item.is_default,
            category: item.category as StatusCategory,
          })) || []
      );
    } else if (!templateId) {
      // Default items for new template
      setItems([
        { name: 'A Fazer', color: '#94a3b8', is_default: true, category: 'not_started' },
        { name: 'Aberto', color: '#60a5fa', is_default: false, category: 'active' },
        { name: 'Em Progresso', color: '#fbbf24', is_default: false, category: 'in_progress' },
        { name: 'Concluído', color: '#22c55e', is_default: false, category: 'done' },
      ]);
    }
  }, [template, templateId]);

  const addItem = (category: StatusCategory) => {
    setItems([...items, { 
      name: '', 
      color: PRESET_COLORS[items.length % PRESET_COLORS.length], 
      is_default: false, 
      category 
    }]);
  };

  const updateItem = (index: number, updates: Partial<StatusItemForm>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // Ensure only one default
    if (updates.is_default) {
      newItems.forEach((item, i) => {
        if (i !== index) item.is_default = false;
      });
    }
    
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Chave estável para identificar o destino escolhido (itens novos ainda não têm id)
  const itemKey = (item: StatusItemForm, index: number) =>
    item.id ? `existing:${item.id}` : `new:${index}`;


  // Ordena os itens pela sequência visual de categorias
  const buildOrderedItems = () =>
    CATEGORY_ORDER.flatMap(category => items.filter(item => item.category === category));

  const formatItems = (
    ordered: StatusItemForm[],
    reassignByKey: Record<string, string[]> = {}
  ) =>
    ordered.map((item, index) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      is_default: item.is_default,
      order_index: index,
      category: item.category,
      reassignFrom: reassignByKey[itemKey(item, index)],
    }));

  const persist = async (
    ordered: StatusItemForm[],
    reassignByKey: Record<string, string[]> = {}
  ) => {
    const formattedItems = formatItems(ordered, reassignByKey);

    if (templateId) {
      await updateTemplate.mutateAsync({ id: templateId, name, description, items: formattedItems });
    } else {
      await createTemplate.mutateAsync({
        workspaceId,
        name,
        description,
        items: formattedItems.map(({ id: _id, reassignFrom: _r, ...rest }) => rest),
      });
    }

    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const ordered = buildOrderedItems();

    // Modelo novo: nada a excluir
    if (!templateId || !template) {
      await persist(ordered);
      return;
    }

    const keptIds = new Set(ordered.map(i => i.id).filter(Boolean) as string[]);
    const removedItems = (template.status_template_items || []).filter(ti => !keptIds.has(ti.id));

    if (removedItems.length === 0) {
      await persist(ordered);
      return;
    }

    setCheckingRemoval(true);
    try {
      const counts = await countTasksForTemplateItems(removedItems.map(i => i.id));
      const withTasks = removedItems
        .map(i => ({ id: i.id, name: i.name, count: counts[i.id] || 0 }))
        .filter(i => i.count > 0);

      if (withTasks.length === 0) {
        await persist(ordered);
        return;
      }

      setPendingOrdered(ordered);
      setRemovalTargets(withTasks);
      setTargetByRemoved({});
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível verificar as tarefas das etapas removidas');
    } finally {
      setCheckingRemoval(false);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!pendingOrdered) return;

    const reassignByKey: Record<string, string[]> = {};
    for (const removed of removalTargets) {
      const key = targetByRemoved[removed.id];
      if (!key) return;
      reassignByKey[key] = [...(reassignByKey[key] || []), removed.id];
    }

    const ordered = pendingOrdered;
    setPendingOrdered(null);
    setRemovalTargets([]);
    await persist(ordered, reassignByKey);
  };

  const getItemsByCategory = (category: StatusCategory) => 
    items.map((item, index) => ({ ...item, originalIndex: index }))
         .filter(item => item.category === category);

  if (isLoading && templateId) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {templateId ? 'Editar Modelo' : 'Novo Modelo de Status'}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Modelo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do modelo</Label>
            <Input
              id="name"
              placeholder="Ex: Kanban, Scrum, Marketing..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva quando usar este modelo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {CATEGORY_ORDER.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <CardTitle className="text-base">{config.label}</CardTitle>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addItem(category)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {getItemsByCategory(category).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum status nesta categoria
                </p>
              ) : (
                getItemsByCategory(category).map((item) => (
                  <div
                    key={item.originalIndex}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-background"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            item.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateItem(item.originalIndex, { color })}
                        />
                      ))}
                    </div>

                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(item.originalIndex, { name: e.target.value })}
                      placeholder="Nome do status"
                      className="flex-1"
                    />

                    <Button
                      variant={item.is_default ? 'default' : 'outline'}
                      size="sm"
                      className="shrink-0"
                      onClick={() => updateItem(item.originalIndex, { is_default: !item.is_default })}
                    >
                      {item.is_default && <Check className="h-3 w-3 mr-1" />}
                      Padrão
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.originalIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={
            !name.trim() ||
            items.length === 0 ||
            checkingRemoval ||
            updateTemplate.isPending ||
            createTemplate.isPending
          }
        >
          {checkingRemoval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {templateId ? 'Salvar Alterações' : 'Criar Modelo'}
        </Button>
      </div>

      <Dialog
        open={removalTargets.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setRemovalTargets([]);
            setPendingOrdered(null);
            setTargetByRemoved({});
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferir tarefas antes de excluir</DialogTitle>
            <DialogDescription>
              Não é possível excluir uma etapa que ainda tem tarefas. Escolha para qual etapa
              as tarefas devem ser transferidas — a exclusão acontece depois da transferência.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {removalTargets.map((removed) => (
              <div key={removed.id} className="space-y-2">
                <Label>
                  {removed.name}{' '}
                  <span className="text-muted-foreground font-normal">
                    ({removed.count} {removed.count === 1 ? 'tarefa' : 'tarefas'})
                  </span>
                </Label>
                <Select
                  value={targetByRemoved[removed.id] || ''}
                  onValueChange={(value) =>
                    setTargetByRemoved((prev) => ({ ...prev, [removed.id]: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildOrderedItems().map((item, index) => (
                      <SelectItem key={itemKey(item, index)} value={itemKey(item, index)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name || 'Sem nome'}
                          {!item.id && (
                            <Badge variant="secondary" className="ml-1">nova</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemovalTargets([]);
                setPendingOrdered(null);
                setTargetByRemoved({});
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRemoval}
              disabled={
                removalTargets.some((r) => !targetByRemoved[r.id]) || updateTemplate.isPending
              }
            >
              Transferir e salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
