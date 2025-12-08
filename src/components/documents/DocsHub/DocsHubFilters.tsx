import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { DocTagBadge } from './DocTagBadge';
import { DocumentTag } from '@/hooks/useDocuments';

interface DocsHubFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  tags: DocumentTag[];
  selectedTagIds: string[];
  onTagToggle: (tagId: string) => void;
  onClearFilters: () => void;
}

export const DocsHubFilters = ({
  search,
  onSearchChange,
  tags,
  selectedTagIds,
  onTagToggle,
  onClearFilters,
}: DocsHubFiltersProps) => {
  const hasFilters = search || selectedTagIds.length > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {selectedTagIds.length > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground w-5 h-5 text-xs flex items-center justify-center">
                {selectedTagIds.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Filtrar por Tags</h4>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tag criada</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={() => onTagToggle(tag.id)}
                    />
                    <DocTagBadge name={tag.name} color={tag.color} />
                  </label>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
};
