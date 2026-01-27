import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { 
  Flag, 
  Calendar, 
  Clock, 
  User, 
  Tag as TagIcon, 
  Maximize2,
  ChevronRight,
  CheckSquare,
  Paperclip,
  X,
  Plus
} from 'lucide-react';

export interface TaskData {
  title: string;
  description: string;
  priority: string;
  startDateOffset: number | null;
  dueDateOffset: number | null;
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}

interface StatusTemplateItem {
  id: string;
  name: string;
  color: string | null;
}

interface TemplateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskData | null;
  onSave: (task: TaskData) => void;
  statusTemplateItems?: StatusTemplateItem[];
  availableTags?: { id: string; name: string; color: string | null }[];
}

export const TemplateTaskDialog = ({
  open,
  onOpenChange,
  task,
  onSave,
  statusTemplateItems = [],
  availableTags = [],
}: TemplateTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startDateOffset, setStartDateOffset] = useState<string>('');
  const [dueDateOffset, setDueDateOffset] = useState<string>('');
  const [statusTemplateItemId, setStatusTemplateItemId] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);

  const selectedStatus = statusTemplateItems.find(s => s.id === statusTemplateItemId);

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setPriority(task.priority || 'medium');
        setStartDateOffset(task.startDateOffset !== null ? String(task.startDateOffset) : '');
        setDueDateOffset(task.dueDateOffset !== null ? String(task.dueDateOffset) : '');
        setStatusTemplateItemId(task.statusTemplateItemId || '');
        
        if (task.estimatedTime !== null) {
          const hours = Math.floor(task.estimatedTime / 60);
          const minutes = task.estimatedTime % 60;
          setEstimatedHours(hours > 0 ? String(hours) : '');
          setEstimatedMinutes(minutes > 0 ? String(minutes) : '');
        } else {
          setEstimatedHours('');
          setEstimatedMinutes('');
        }
        
        setIsMilestone(task.isMilestone || false);
        setTagNames(task.tagNames || []);
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setStartDateOffset('');
        setDueDateOffset('');
        setStatusTemplateItemId('');
        setEstimatedHours('');
        setEstimatedMinutes('');
        setIsMilestone(false);
        setTagNames([]);
      }
      setTagInput('');
    }
  }, [task, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    
    const hours = parseInt(estimatedHours) || 0;
    const minutes = parseInt(estimatedMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;
    
    onSave({ 
      title: title.trim(), 
      description, 
      priority,
      startDateOffset: startDateOffset !== '' ? parseInt(startDateOffset) : null,
      dueDateOffset: dueDateOffset !== '' ? parseInt(dueDateOffset) : null,
      statusTemplateItemId: statusTemplateItemId || null,
      estimatedTime: totalMinutes > 0 ? totalMinutes : null,
      isMilestone,
      tagNames,
    });
    onOpenChange(false);
  };

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !tagNames.includes(trimmed)) {
      setTagNames([...tagNames, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tagName: string) => {
    setTagNames(tagNames.filter(t => t !== tagName));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addTag(tagInput);
    }
  };

  const getTagColor = (name: string) => {
    const tag = availableTags.find(t => t.name === name);
    return tag?.color || '#6b7280';
  };

  const suggestedTags = availableTags
    .filter(t => !tagNames.includes(t.name) && t.name.toLowerCase().includes(tagInput.toLowerCase()));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {task ? 'Editar Tarefa do Template' : 'Nova Tarefa do Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Título - idêntico ao TaskMainContent */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="Título da tarefa..."
                autoFocus
              />
            </div>

            {/* Status e Prioridade - grid igual TaskMainContent */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Status
                </label>
                <Select 
                  value={statusTemplateItemId || '__default__'} 
                  onValueChange={(val) => setStatusTemplateItemId(val === '__default__' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <StatusBadge status={selectedStatus?.name || 'Padrão da lista'} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">Padrão da lista</SelectItem>
                    {statusTemplateItems.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Prioridade
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue>
                      <PriorityBadge priority={priority as 'low' | 'medium' | 'high' | 'urgent'} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas - igual TaskMainContent mas com offset */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Data de Início
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={startDateOffset}
                    onChange={(e) => setStartDateOffset(e.target.value)}
                    placeholder="Ex: 0"
                    className="pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    dias após
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Data de Entrega
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={dueDateOffset}
                    onChange={(e) => setDueDateOffset(e.target.value)}
                    placeholder="Ex: 7"
                    className="pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    dias após
                  </span>
                </div>
              </div>
            </div>

            {/* Responsáveis - placeholder igual estrutura TaskAssigneesManager */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Responsáveis
              </label>
              <div className="min-h-[80px] p-3 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Os responsáveis serão atribuídos quando a tarefa for criada a partir do template.
                </p>
              </div>
            </div>

            {/* Etiquetas - igual estrutura TaskTagsSelector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TagIcon className="h-4 w-4" /> Etiquetas
              </label>
              <div className="space-y-2">
                {tagNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagNames.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{ 
                          backgroundColor: `${getTagColor(tag)}20`,
                          borderColor: getTagColor(tag),
                          color: getTagColor(tag)
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="+ Adicionar etiqueta"
                    className="pr-10"
                  />
                  {tagInput && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => addTag(tagInput)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {tagInput && suggestedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.slice(0, 5).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setTagNames([...tagNames, tag.name]);
                          setTagInput('');
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Descrição - igual TaskMainContent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Descrição</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDescriptionExpanded(true)}
                  title="Expandir descrição"
                  className="h-7 w-7 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição..."
                className="min-h-[80px]"
              />
            </div>

            <Separator />

            {/* Tempo Estimado e Marco */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Tempo Estimado
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-16"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">h</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="w-16"
                    placeholder="0"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4" /> Marco
                </label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="milestone"
                    checked={isMilestone}
                    onCheckedChange={(checked) => setIsMilestone(!!checked)}
                  />
                  <label htmlFor="milestone" className="text-sm cursor-pointer">
                    É um marco (milestone)
                  </label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Subtarefas - Placeholder igual SubtaskList */}
            <Collapsible open={isSubtasksOpen} onOpenChange={setIsSubtasksOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <ChevronRight className={`h-4 w-4 transition-transform ${isSubtasksOpen ? 'rotate-90' : ''}`} />
                  Subtarefas
                </span>
                <span className="text-xs text-muted-foreground">+ Adicionar</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 mt-2 border rounded-md bg-muted/30">
                  <p className="text-sm text-muted-foreground text-center">
                    Adicione subtarefas após criar o space
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Checklists - Placeholder igual TaskChecklists */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" /> Checklists
                </label>
                <span className="text-xs text-muted-foreground">+ Adicionar</span>
              </div>
              <div className="p-3 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Adicione checklists após criar o space
                </p>
              </div>
            </div>

            <Separator />

            {/* Anexos - Placeholder igual TaskAttachmentsList */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Anexos
                </label>
                <span className="text-xs text-muted-foreground">+ Adicionar</span>
              </div>
              <div className="p-3 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Adicione anexos após criar o space
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de descrição expandida - igual TaskMainContent */}
      <Dialog open={isDescriptionExpanded} onOpenChange={setIsDescriptionExpanded}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Descrição</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição..."
              className="min-h-[300px] resize-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsDescriptionExpanded(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
