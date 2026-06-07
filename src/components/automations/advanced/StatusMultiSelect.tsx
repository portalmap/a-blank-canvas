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
import { ChevronDown, Circle, CircleDot, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusItem {
  id: string;
  name: string;
  color: string | null;
  category?: string | null;
}

interface StatusMultiSelectProps {
  label: string;
  placeholder?: string;
  statuses: StatusItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const getCategoryIcon = (category: string | null | undefined) => {
  switch (category) {
    case 'not_started':
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'active':
    case 'in_progress':
      return <CircleDot className="h-3.5 w-3.5 text-primary" />;
    case 'done':
    case 'closed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export const StatusMultiSelect = ({
  label,
  placeholder = 'Qualquer status',
  statuses,
  selectedIds,
  onSelectionChange,
}: StatusMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredStatuses = statuses.filter((status) =>
    status.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (statusId: string) => {
    if (selectedIds.includes(statusId)) {
      onSelectionChange(selectedIds.filter((id) => id !== statusId));
    } else {
      onSelectionChange([...selectedIds, statusId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === statuses.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(statuses.map((s) => s.id));
    }
  };

  const getStatusById = (id: string) => statuses.find((s) => s.id === id);

  const selectedStatuses = selectedIds
    .map(getStatusById)
    .filter(Boolean) as StatusItem[];

  const maxVisibleBadges = 2;
  const visibleBadges = selectedStatuses.slice(0, maxVisibleBadges);
  const remainingCount = selectedStatuses.length - maxVisibleBadges;

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
              {selectedStatuses.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleBadges.map((status) => (
                    <Badge
                      key={status.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 px-2 py-0.5"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: status.color || '#94a3b8' }}
                      />
                      <span className="truncate max-w-[100px]">{status.name}</span>
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
              placeholder="Pesquisar status..."
              value={search}
              onValueChange={setSearch}
            />
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedIds.length === statuses.length ? 'Limpar' : 'Marcar tudo'}
              </button>
            </div>
            <CommandList>
              <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredStatuses.map((status) => {
                  const isSelected = selectedIds.includes(status.id);
                  return (
                    <CommandItem
                      key={status.id}
                      value={status.id}
                      onSelect={() => handleToggle(status.id)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getCategoryIcon(status.category)}
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: status.color || '#94a3b8' }}
                        />
                        <span className="truncate">{status.name}</span>
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
