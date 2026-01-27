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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Flag, Clock, Calendar, Tag } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: '#94a3b8' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
];

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
      e.preventDefault();
      handleSave();
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Revisar briefing do cliente"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções ou detalhes da tarefa..."
              rows={3}
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status Inicial</Label>
              <Select value={statusTemplateItemId} onValueChange={setStatusTemplateItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Padrão da lista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Padrão da lista</SelectItem>
                  {statusTemplateItems.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: status.color || '#6b7280' }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Offsets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Início (dias)
              </Label>
              <Input
                type="number"
                value={startDateOffset}
                onChange={(e) => setStartDateOffset(e.target.value)}
                placeholder="Ex: 0"
              />
              <p className="text-xs text-muted-foreground">
                Dias após criação do space
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Entrega (dias)
              </Label>
              <Input
                type="number"
                value={dueDateOffset}
                onChange={(e) => setDueDateOffset(e.target.value)}
                placeholder="Ex: 7"
              />
              <p className="text-xs text-muted-foreground">
                Dias após criação do space
              </p>
            </div>
          </div>

          {/* Estimated Time & Milestone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Tempo estimado
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0"
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">h</span>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="0"
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="h-3 w-3" />
                Marco
              </Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="is-milestone"
                  checked={isMilestone}
                  onCheckedChange={(checked) => setIsMilestone(checked === true)}
                />
                <label
                  htmlFor="is-milestone"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  É um marco (milestone)
                </label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-3 w-3" />
              Etiquetas
            </Label>
            
            <div className="flex flex-wrap gap-2 mb-2">
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

            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Digite o nome da etiqueta..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                Adicionar
              </Button>
            </div>

            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-muted-foreground mr-1">Sugestões:</span>
                {availableTags
                  .filter(t => !tagNames.includes(t.name))
                  .slice(0, 8)
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      className="text-xs px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                      style={{ 
                        borderColor: tag.color || '#6b7280',
                        color: tag.color || '#6b7280'
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {task ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
