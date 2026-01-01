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
  StatusTemplateItem 
} from '@/hooks/useStatusTemplates';

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

  const handleSave = async () => {
    if (!name.trim()) return;

    // Ordenar items pela sequência visual de categorias antes de salvar
    const orderedItems = CATEGORY_ORDER.flatMap(category => 
      items.filter(item => item.category === category)
    );

    const formattedItems = orderedItems.map((item, index) => ({
      name: item.name,
      color: item.color,
      is_default: item.is_default,
      order_index: index,
      category: item.category,
    }));

    if (templateId) {
      await updateTemplate.mutateAsync({ id: templateId, name, description, items: formattedItems });
    } else {
      await createTemplate.mutateAsync({ workspaceId, name, description, items: formattedItems });
    }
    
    onClose();
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
          disabled={!name.trim() || items.length === 0}
        >
          {templateId ? 'Salvar Alterações' : 'Criar Modelo'}
        </Button>
      </div>
    </div>
  );
}
