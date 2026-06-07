import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTaskTags, useCreateTaskTag } from "@/hooks/useTaskTags";
import { useBulkAddTags } from "@/hooks/useBulkTaskActions";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface TagsBulkPopoverProps {
  children: ReactNode;
  taskIds: string[];
  workspaceId: string;
  onSuccess: () => void;
}

export function TagsBulkPopover({
  children,
  taskIds,
  workspaceId,
  onSuccess,
}: TagsBulkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const { data: tags } = useTaskTags(workspaceId);
  const createTag = useCreateTaskTag();
  const addTags = useBulkAddTags();

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTag.mutate(
      { workspaceId, name: newTagName.trim() },
      {
        onSuccess: () => {
          setNewTagName("");
          setShowNewTagInput(false);
        },
      }
    );
  };

  const handleApply = () => {
    if (selectedTags.length === 0) return;
    addTags.mutate(
      { taskIds, tagIds: selectedTags },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedTags([]);
          onSuccess();
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            Adicionar etiquetas
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tags?.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                onClick={() => handleToggleTag(tag.id)}
              >
                <Checkbox
                  checked={selectedTags.includes(tag.id)}
                  onCheckedChange={() => handleToggleTag(tag.id)}
                />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color || "#6366f1" }}
                />
                <span className="text-sm truncate">{tag.name}</span>
              </div>
            ))}

            {(!tags || tags.length === 0) && !showNewTagInput && (
              <div className="text-sm text-muted-foreground text-center py-2">
                Nenhuma etiqueta criada
              </div>
            )}
          </div>

          {showNewTagInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="Nome da etiqueta"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                className="h-8"
              />
              <Button
                size="sm"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTag.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowNewTagInput(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova etiqueta
            </Button>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={selectedTags.length === 0 || addTags.isPending}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
