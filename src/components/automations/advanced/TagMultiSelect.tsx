import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ChevronDown, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface TagMultiSelectProps {
  label: string;
  placeholder?: string;
  tags: TagItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const TagMultiSelect = ({
  label,
  placeholder = 'Qualquer etiqueta',
  tags,
  selectedIds,
  onSelectionChange,
}: TagMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onSelectionChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onSelectionChange([...selectedIds, tagId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === tags.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tags.map((t) => t.id));
    }
  };

  const getTagById = (id: string) => tags.find((t) => t.id === id);

  const selectedTags = selectedIds
    .map(getTagById)
    .filter(Boolean) as TagItem[];

  const maxVisibleBadges = 2;
  const visibleBadges = selectedTags.slice(0, maxVisibleBadges);
  const remainingCount = selectedTags.length - maxVisibleBadges;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 px-3 py-2"
          >
            <div className="flex flex-wrap gap-1.5 items-center">
              {selectedTags.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleBadges.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-2 py-0.5"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#6366f1' }}
                      />
                      <span className="truncate max-w-[100px]">{tag.name}</span>
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5">
                      +{remainingCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Pesquisar etiquetas..."
              value={search}
              onValueChange={setSearch}
            />
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Etiquetas
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedIds.length === tags.length ? 'Limpar' : 'Marcar tudo'}
              </button>
            </div>
            <CommandList>
              <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
              <CommandGroup>
                {filteredTags.map((tag) => {
                  const isSelected = selectedIds.includes(tag.id);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleToggle(tag.id)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        className={cn(
                          'pointer-events-none',
                          isSelected && 'data-[state=checked]:bg-primary'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
