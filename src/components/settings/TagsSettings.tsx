import { useState } from 'react';
import { Tag, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTaskTags, useCreateTaskTag, useDeleteTaskTag, useUpdateTaskTag, useTagUsageCount } from '@/hooks/useTaskTags';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

interface TagItemProps {
  tag: { id: string; name: string; color: string | null };
  workspaceId: string;
  onDelete: (tagId: string) => void;
}

function TagItem({ tag, workspaceId, onDelete }: TagItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color || TAG_COLORS[0]);
  
  const updateTag = useUpdateTaskTag();
  const { data: usageCount = 0 } = useTagUsageCount(tag.id);

  const handleSave = async () => {
    if (!editName.trim()) return;
    
    await updateTag.mutateAsync({
      tagId: tag.id,
      workspaceId,
      name: editName.trim(),
      color: editColor,
    });
    
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-8 w-40"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-1">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                "w-5 h-5 rounded-full transition-all",
                editColor === color && "ring-2 ring-offset-2 ring-primary"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setEditColor(color)}
            />
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setIsEditing(false);
              setEditName(tag.name);
              setEditColor(tag.color || TAG_COLORS[0]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors group">
      <span
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color || '#6b7280' }}
      />
      <span className="font-medium">{tag.name}</span>
      <Badge variant="secondary" className="text-xs">
        {usageCount} {usageCount === 1 ? 'tarefa' : 'tarefas'}
      </Badge>
      <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(tag.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function TagsSettings() {
  const { activeWorkspace } = useWorkspace();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);

  const { data: tags = [], isLoading } = useTaskTags(activeWorkspace?.id);
  const createTag = useCreateTaskTag();
  const deleteTag = useDeleteTaskTag();

  const handleCreate = async () => {
    if (!newTagName.trim() || !activeWorkspace?.id) return;
    
    await createTag.mutateAsync({
      workspaceId: activeWorkspace.id,
      name: newTagName.trim(),
      color: newTagColor,
    });
    
    setNewTagName('');
    setNewTagColor(TAG_COLORS[0]);
    setShowCreateForm(false);
  };

  const handleDelete = async () => {
    if (!deleteTagId || !activeWorkspace?.id) return;
    
    await deleteTag.mutateAsync({
      tagId: deleteTagId,
      workspaceId: activeWorkspace.id,
    });
    
    setDeleteTagId(null);
  };

  if (!activeWorkspace) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Selecione um workspace para gerenciar etiquetas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Etiquetas do Workspace
              </CardTitle>
              <CardDescription>
                Gerencie as etiquetas disponíveis para categorizar tarefas.
              </CardDescription>
            </div>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Etiqueta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create Form */}
          {showCreateForm && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <p className="text-sm font-medium">Criar Nova Etiqueta</p>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Nome da etiqueta"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-9 w-48"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <div className="flex gap-1">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        newTagColor === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newTagName.trim() || createTag.isPending}
                >
                  Criar Etiqueta
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Tags List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando etiquetas...
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma etiqueta criada ainda.</p>
              <p className="text-sm">Crie etiquetas para organizar suas tarefas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <TagItem
                  key={tag.id}
                  tag={tag}
                  workspaceId={activeWorkspace.id}
                  onDelete={setDeleteTagId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTagId} onOpenChange={(open) => !open && setDeleteTagId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etiqueta será removida de todas as tarefas que a utilizam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
