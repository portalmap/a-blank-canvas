import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  useTaskChecklists, 
  useCreateTaskChecklist, 
  useDeleteTaskChecklist,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem 
} from '@/hooks/useTaskChecklists';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';

interface TaskChecklistsProps {
  taskId: string;
}

export const TaskChecklists = ({ taskId }: TaskChecklistsProps) => {
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());

  const { data: checklists, isLoading } = useTaskChecklists(taskId);
  const createChecklist = useCreateTaskChecklist();
  const deleteChecklist = useDeleteTaskChecklist();
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const createActivity = useCreateTaskActivity();

  const handleToggleItem = async (item: any, checklistTitle: string) => {
    const isCompleting = !item.is_completed;
    
    try {
      await updateItem.mutateAsync({
        id: item.id,
        isCompleted: isCompleting,
        taskId,
      });
      
      await createActivity.mutateAsync({
        taskId,
        activityType: isCompleting ? 'checklist.item.completed' : 'checklist.item.uncompleted',
        metadata: {
          item_name: item.content,
          checklist_title: checklistTitle,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar item do checklist:', error);
    }
  };

  const handleDeleteChecklist = async (checklist: any) => {
    const checklistTitle = checklist.title;
    const itemsCount = checklist.items?.length || 0;
    
    try {
      await deleteChecklist.mutateAsync({ id: checklist.id, taskId });
      
      await createActivity.mutateAsync({
        taskId,
        activityType: 'checklist.deleted',
        metadata: {
          checklist_title: checklistTitle,
          items_count: itemsCount,
        },
      });
    } catch (error) {
      console.error('Erro ao excluir checklist:', error);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;

    const result = await createChecklist.mutateAsync({
      taskId,
      title: newChecklistTitle,
    });

    setExpandedChecklists(prev => new Set([...prev, result.id]));
    setNewChecklistTitle('');
    setIsAddingChecklist(false);
  };

  const handleCreateItem = async (checklistId: string) => {
    if (!newItemContent.trim()) return;

    await createItem.mutateAsync({
      checklistId,
      content: newItemContent,
      taskId,
    });

    setNewItemContent('');
    setAddingItemTo(null);
  };

  const toggleExpanded = (checklistId: string) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="h-4 w-4" />
          Checklists
          {checklists && checklists.length > 0 && (
            <span className="text-muted-foreground">({checklists.length})</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAddingChecklist(true)}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {isAddingChecklist && (
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="Nome da checklist..."
            className="flex-1 h-8"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChecklist();
              if (e.key === 'Escape') setIsAddingChecklist(false);
            }}
          />
          <Button 
            size="sm" 
            onClick={handleCreateChecklist}
            disabled={!newChecklistTitle.trim() || createChecklist.isPending}
          >
            Criar
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsAddingChecklist(false)}
          >
            Cancelar
          </Button>
        </div>
      )}

      {checklists?.length === 0 && !isAddingChecklist ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma checklist
        </p>
      ) : (
        <div className="space-y-4">
          {checklists?.map((checklist) => {
            const completedItems = checklist.items?.filter(i => i.is_completed).length || 0;
            const totalItems = checklist.items?.length || 0;
            const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
            const isExpanded = expandedChecklists.has(checklist.id);

            return (
              <div key={checklist.id} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpanded(checklist.id)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {checklist.title}
                    {totalItems > 0 && (
                      <span className="text-muted-foreground text-xs">
                        ({completedItems}/{totalItems})
                      </span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteChecklist(checklist)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {totalItems > 0 && (
                  <Progress value={progressPercent} className="h-2" />
                )}

                {isExpanded && (
                  <div className="space-y-2 pl-2">
                    {checklist.items?.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center gap-2 group"
                      >
                      <Checkbox
                          checked={item.is_completed}
                          onCheckedChange={() => handleToggleItem(item, checklist.title)}
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          item.is_completed && "line-through text-muted-foreground"
                        )}>
                          {item.content}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem.mutate({ id: item.id, taskId })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {addingItemTo === checklist.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          placeholder="Novo item..."
                          className="flex-1 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateItem(checklist.id);
                            if (e.key === 'Escape') setAddingItemTo(null);
                          }}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => handleCreateItem(checklist.id)}
                          disabled={!newItemContent.trim()}
                        >
                          Adicionar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground"
                        onClick={() => {
                          setAddingItemTo(checklist.id);
                          setNewItemContent('');
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar item
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
