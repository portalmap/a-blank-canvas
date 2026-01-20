import { useState } from 'react';
import { Filter, X, Tag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type ViewMode = 'assigned' | 'my-spaces';

export interface FilterState {
  statuses: string[];
  priorities: string[];
  tags: string[];
  showCompleted: boolean;
  viewMode: ViewMode;
}

interface EverythingFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableStatuses: Array<{ id: string; name: string; color: string | null }>;
  availableTags?: Array<{ id: string; name: string; color: string | null }>;
  isAdmin?: boolean;
}

const priorityOptions = [
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500' },
  { value: 'low', label: 'Baixa', color: 'bg-blue-500' },
];

export function EverythingFilters({ filters, onChange, availableStatuses, availableTags = [], isAdmin = false }: EverythingFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = 
    filters.statuses.length + 
    filters.priorities.length + 
    (filters.tags?.length || 0) +
    (filters.showCompleted ? 1 : 0);

  const toggleStatus = (statusId: string) => {
    const newStatuses = filters.statuses.includes(statusId)
      ? filters.statuses.filter(s => s !== statusId)
      : [...filters.statuses, statusId];
    onChange({ ...filters, statuses: newStatuses });
  };

  const togglePriority = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onChange({ ...filters, priorities: newPriorities });
  };

  const toggleTag = (tagId: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];
    onChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onChange({
      statuses: [],
      priorities: [],
      tags: [],
      showCompleted: false,
      viewMode: filters.viewMode, // Mantém o viewMode atual
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* View Scope Filter - Only for non-admins */}
          {!isAdmin && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Escopo de visualização
                </Label>
                <RadioGroup
                  value={filters.viewMode}
                  onValueChange={(value: ViewMode) => onChange({ ...filters, viewMode: value })}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="assigned" id="assigned" />
                    <Label htmlFor="assigned" className="text-sm font-normal cursor-pointer">
                      Apenas minhas tarefas
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="my-spaces" id="my-spaces" />
                    <Label htmlFor="my-spaces" className="text-sm font-normal cursor-pointer">
                      Todas as tarefas dos meus Spaces
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Separator />
            </>
          )}

          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableStatuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleStatus(status.id)}
                >
                  <Checkbox
                    checked={filters.statuses.includes(status.id)}
                    onCheckedChange={() => toggleStatus(status.id)}
                  />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color || '#6b7280' }}
                  />
                  <span className="text-sm truncate">{status.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prioridade</Label>
            <div className="grid grid-cols-2 gap-2">
              {priorityOptions.map((priority) => (
                <div
                  key={priority.value}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => togglePriority(priority.value)}
                >
                  <Checkbox
                    checked={filters.priorities.includes(priority.value)}
                    onCheckedChange={() => togglePriority(priority.value)}
                  />
                  <div className={`w-2 h-2 rounded-full ${priority.color}`} />
                  <span className="text-sm">{priority.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Etiquetas
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Checkbox
                        checked={(filters.tags || []).includes(tag.id)}
                        onCheckedChange={() => toggleTag(tag.id)}
                      />
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      />
                      <span className="text-sm truncate">{tag.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Show Completed Toggle */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onChange({ ...filters, showCompleted: !filters.showCompleted })}
          >
            <Checkbox
              checked={filters.showCompleted}
              onCheckedChange={(checked) => onChange({ ...filters, showCompleted: !!checked })}
            />
            <span className="text-sm">Mostrar tarefas concluídas</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
