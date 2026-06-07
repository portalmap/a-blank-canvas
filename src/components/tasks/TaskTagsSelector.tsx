import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskTags, useTaskTagRelations, useAddTaskTag, useRemoveTaskTag, useCreateTaskTag } from '@/hooks/useTaskTags';
import { cn } from '@/lib/utils';

interface TaskTagsSelectorProps {
  taskId: string;
  workspaceId: string;
  compact?: boolean;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

export function TaskTagsSelector({ taskId, workspaceId, compact = false }: TaskTagsSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: allTags = [] } = useTaskTags(workspaceId);
  const { data: taskTagRelations = [] } = useTaskTagRelations(taskId);
  const addTagMutation = useAddTaskTag();
  const removeTagMutation = useRemoveTaskTag();
  const createTagMutation = useCreateTaskTag();

  const taskTagIds = taskTagRelations.map(r => r.tag_id);

  const handleToggleTag = async (tagId: string) => {
    if (taskTagIds.includes(tagId)) {
      await removeTagMutation.mutateAsync({ taskId, tagId });
    } else {
      await addTagMutation.mutateAsync({ taskId, tagId });
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    const newTag = await createTagMutation.mutateAsync({
      workspaceId,
      name: newTagName.trim(),
      color: selectedColor,
    });
    
    if (newTag) {
      await addTagMutation.mutateAsync({ taskId, tagId: newTag.id });
    }
    
    setNewTagName('');
    setShowCreateForm(false);
  };

  const currentTags = taskTagRelations.map(r => r.tag).filter(Boolean);

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Tag className="h-4 w-4" /> Etiquetas
        </label>
      )}
      
      <div className="flex flex-wrap items-center gap-1.5">
        {currentTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="text-xs px-2 py-0.5 gap-1 group cursor-default"
            style={{
              borderColor: tag.color || undefined,
              backgroundColor: tag.color ? `${tag.color}20` : undefined,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tag.color || '#6b7280' }}
            />
            {tag.name}
            <button
              onClick={() => removeTagMutation.mutate({ taskId, tagId: tag.id })}
              className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs text-muted-foreground hover:text-foreground",
                compact && "h-5"
              )}
            >
              <Plus className="h-3 w-3 mr-1" />
              {currentTags.length === 0 ? 'Adicionar etiqueta' : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Etiquetas disponíveis
              </p>
              
              {allTags.length === 0 && !showCreateForm && (
                <p className="text-xs text-muted-foreground px-1 py-2">
                  Nenhuma etiqueta criada ainda.
                </p>
              )}
              
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allTags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={taskTagIds.includes(tag.id)}
                      onCheckedChange={() => handleToggleTag(tag.id)}
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                    />
                    <span className="text-sm truncate">{tag.name}</span>
                  </label>
                ))}
              </div>
              
              <div className="border-t pt-2">
                {showCreateForm ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome da etiqueta"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    />
                    <div className="flex flex-wrap gap-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-5 h-5 rounded-full transition-all",
                            selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || createTagMutation.isPending}
                      >
                        Criar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewTagName('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Criar nova etiqueta
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
