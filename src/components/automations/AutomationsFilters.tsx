import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSpaces } from '@/hooks/useSpaces';
import { useFoldersForWorkspace } from '@/hooks/useFolders';
import { useListsForWorkspace } from '@/hooks/useLists';

export interface AutomationsFilterState {
  scopeType: 'all' | 'space' | 'folder' | 'list';
  scopeId: string | null;
  searchTerm: string;
}

interface AutomationsFiltersProps {
  workspaceId: string;
  filters: AutomationsFilterState;
  onChange: (filters: AutomationsFilterState) => void;
}

export function AutomationsFilters({ workspaceId, filters, onChange }: AutomationsFiltersProps) {
  const { data: spaces = [] } = useSpaces(workspaceId);
  const { data: folders = [] } = useFoldersForWorkspace(workspaceId);
  const { data: lists = [] } = useListsForWorkspace(workspaceId);

  const handleScopeTypeChange = (value: string) => {
    onChange({
      ...filters,
      scopeType: value as AutomationsFilterState['scopeType'],
      scopeId: null,
    });
  };

  const handleScopeIdChange = (value: string) => {
    onChange({
      ...filters,
      scopeId: value === 'all' ? null : value,
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      searchTerm: e.target.value,
    });
  };

  const getItemsForScope = () => {
    switch (filters.scopeType) {
      case 'space':
        return spaces.map(s => ({ id: s.id, name: s.name }));
      case 'folder':
        return folders.map(f => ({ id: f.id, name: f.name }));
      case 'list':
        return lists.map(l => ({ id: l.id, name: l.name }));
      default:
        return [];
    }
  };

  const getScopeLabel = () => {
    switch (filters.scopeType) {
      case 'space':
        return 'Space';
      case 'folder':
        return 'Pasta';
      case 'list':
        return 'Lista';
      default:
        return '';
    }
  };

  const items = getItemsForScope();
  const showItemSelector = filters.scopeType !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border rounded-lg">
      {/* Scope Type Selector */}
      <div className="flex-shrink-0 w-full sm:w-[180px]">
        <Select value={filters.scopeType} onValueChange={handleScopeTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Automações</SelectItem>
            <SelectItem value="space">Spaces</SelectItem>
            <SelectItem value="folder">Pastas</SelectItem>
            <SelectItem value="list">Listas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditional Item Selector */}
      {showItemSelector && (
        <div className="flex-shrink-0 w-full sm:w-[220px]">
          <Select 
            value={filters.scopeId || 'all'} 
            onValueChange={handleScopeIdChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecionar ${getScopeLabel()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos os {filters.scopeType === 'space' ? 'Spaces' : filters.scopeType === 'folder' ? 'Pastas' : 'Listas'}
              </SelectItem>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da automação..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
