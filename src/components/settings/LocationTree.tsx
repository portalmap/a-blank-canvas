import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronDown, Folder, List, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LocationNodeSpace {
  id: string;
  name: string;
  color?: string | null;
}

export interface LocationNodeFolder {
  id: string;
  name: string;
  space_id?: string | null;
}

export interface LocationNodeList {
  id: string;
  name: string;
  space_id?: string | null;
  folder_id?: string | null;
}

export interface LocationTreeProps {
  idPrefix: string;
  density?: 'compact' | 'comfortable';
  search?: string;
  spaces: LocationNodeSpace[];
  folders: LocationNodeFolder[];
  lists: LocationNodeList[];
  applyToWorkspace: boolean;
  onToggleWorkspace: (checked: boolean) => void;
  selectedSpaces: string[];
  selectedFolders: string[];
  selectedLists: string[];
  expandedSpaces: string[];
  expandedFolders: string[];
  onToggleExpand: (type: 'space' | 'folder', id: string) => void;
  onToggleSelection: (type: 'space' | 'folder' | 'list', id: string) => void;
}

const matches = (name: string, search: string) =>
  !search || name.toLowerCase().includes(search.toLowerCase());

export function LocationTree({
  idPrefix,
  density = 'compact',
  search = '',
  spaces,
  folders,
  lists,
  applyToWorkspace,
  onToggleWorkspace,
  selectedSpaces,
  selectedFolders,
  selectedLists,
  expandedSpaces,
  expandedFolders,
  onToggleExpand,
  onToggleSelection,
}: LocationTreeProps) {
  const rowClass = cn(
    'flex items-center gap-2 rounded hover:bg-muted/50 transition-colors',
    density === 'comfortable' ? 'px-3 py-2.5' : 'p-2'
  );
  const labelClass = cn(
    'flex items-center gap-2 cursor-pointer flex-1 min-w-0',
    density === 'comfortable' ? 'text-sm' : 'text-sm'
  );

  const foldersForSpace = (spaceId: string) => folders.filter((f) => f.space_id === spaceId);
  const listsForFolder = (folderId: string) => lists.filter((l) => l.folder_id === folderId);
  const listsInSpace = (spaceId: string) =>
    lists.filter((l) => l.space_id === spaceId && !l.folder_id);

  const spaceHasMatch = (spaceId: string, spaceName: string) => {
    if (matches(spaceName, search)) return true;
    if (listsInSpace(spaceId).some((l) => matches(l.name, search))) return true;
    return foldersForSpace(spaceId).some(
      (f) => matches(f.name, search) || listsForFolder(f.id).some((l) => matches(l.name, search))
    );
  };

  const searching = search.trim().length > 0;

  const visibleSpaces = spaces.filter((s) => spaceHasMatch(s.id, s.name));

  return (
    <div className="space-y-1">
      {(!searching || matches('Todo o Workspace', search)) && (
        <div className={rowClass}>
          <div className="w-5" />
          <Checkbox
            id={`${idPrefix}-apply-workspace`}
            checked={applyToWorkspace}
            onCheckedChange={(checked) => onToggleWorkspace(!!checked)}
          />
          <Label htmlFor={`${idPrefix}-apply-workspace`} className={labelClass}>
            <Layout className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate font-medium">Todo o Workspace</span>
          </Label>
        </div>
      )}

      {visibleSpaces.map((space) => {
        const spaceExpanded = searching || expandedSpaces.includes(space.id);
        const spaceFolders = foldersForSpace(space.id).filter(
          (f) =>
            !searching ||
            matches(f.name, search) ||
            listsForFolder(f.id).some((l) => matches(l.name, search))
        );
        const spaceLists = listsInSpace(space.id).filter((l) => !searching || matches(l.name, search));

        return (
          <div key={space.id} className="space-y-0.5">
            <div className={rowClass}>
              <button
                type="button"
                onClick={() => onToggleExpand('space', space.id)}
                className="p-0.5 hover:bg-muted rounded shrink-0"
                aria-label={spaceExpanded ? 'Recolher' : 'Expandir'}
              >
                {spaceExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <Checkbox
                id={`${idPrefix}-space-${space.id}`}
                checked={selectedSpaces.includes(space.id)}
                onCheckedChange={() => onToggleSelection('space', space.id)}
              />
              <Label htmlFor={`${idPrefix}-space-${space.id}`} className={labelClass}>
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: space.color || '#94a3b8' }}
                />
                <span className="truncate">{space.name}</span>
              </Label>
            </div>

            {spaceExpanded && (
              <div className="ml-7 space-y-0.5 border-l border-border/60 pl-2">
                {spaceFolders.map((folder) => {
                  const folderExpanded = searching || expandedFolders.includes(folder.id);
                  const folderLists = listsForFolder(folder.id).filter(
                    (l) => !searching || matches(l.name, search) || matches(folder.name, search)
                  );
                  return (
                    <div key={folder.id} className="space-y-0.5">
                      <div className={rowClass}>
                        <button
                          type="button"
                          onClick={() => onToggleExpand('folder', folder.id)}
                          className="p-0.5 hover:bg-muted rounded shrink-0"
                          aria-label={folderExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {folderExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <Checkbox
                          id={`${idPrefix}-folder-${folder.id}`}
                          checked={selectedFolders.includes(folder.id)}
                          onCheckedChange={() => onToggleSelection('folder', folder.id)}
                        />
                        <Label htmlFor={`${idPrefix}-folder-${folder.id}`} className={labelClass}>
                          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </Label>
                      </div>

                      {folderExpanded && (
                        <div className="ml-7 space-y-0.5 border-l border-border/60 pl-2">
                          {folderLists.map((list) => (
                            <div key={list.id} className={rowClass}>
                              <div className="w-5" />
                              <Checkbox
                                id={`${idPrefix}-list-${list.id}`}
                                checked={selectedLists.includes(list.id)}
                                onCheckedChange={() => onToggleSelection('list', list.id)}
                              />
                              <Label htmlFor={`${idPrefix}-list-${list.id}`} className={labelClass}>
                                <List className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate">{list.name}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {spaceLists.map((list) => (
                  <div key={list.id} className={rowClass}>
                    <div className="w-5" />
                    <Checkbox
                      id={`${idPrefix}-list-${list.id}`}
                      checked={selectedLists.includes(list.id)}
                      onCheckedChange={() => onToggleSelection('list', list.id)}
                    />
                    <Label htmlFor={`${idPrefix}-list-${list.id}`} className={labelClass}>
                      <List className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{list.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {searching && visibleSpaces.length === 0 && (
        <p className="text-sm text-muted-foreground p-3">Nenhum local encontrado.</p>
      )}
    </div>
  );
}
