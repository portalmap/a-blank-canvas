import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolders, useFolder } from '@/hooks/useFolders';
import { useLists, useList } from '@/hooks/useLists';
import { Building2, LayoutGrid, Folder, List } from 'lucide-react';
import type { AutomationScope } from '@/hooks/useAutomations';

interface ScopeSelectorProps {
  workspaceId: string;
  value: { scopeType: AutomationScope; scopeId?: string };
  onChange: (value: { scopeType: AutomationScope; scopeId?: string }) => void;
}

export function ScopeSelector({ workspaceId, value, onChange }: ScopeSelectorProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | undefined>();
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const initializedRef = useRef(false);
  
  const { data: spaces = [] } = useSpaces(workspaceId);
  const { data: folders = [] } = useFolders(selectedSpaceId);
  const { data: lists = [] } = useLists({ spaceId: selectedSpaceId, folderId: selectedFolderId });

  // Resolve hierarchy for editing mode
  const listIdToResolve = value.scopeType === 'list' ? value.scopeId : undefined;
  const folderIdToResolve = value.scopeType === 'folder' ? value.scopeId : undefined;
  
  const { data: resolvedList } = useList(listIdToResolve);
  const folderToFetch = folderIdToResolve || resolvedList?.folder_id;
  const { data: resolvedFolder } = useFolder(folderToFetch);

  // Initialize local state from resolved hierarchy (only once on mount/edit)
  useEffect(() => {
    if (initializedRef.current) return;
    
    if (value.scopeType === 'space' && value.scopeId) {
      setSelectedSpaceId(value.scopeId);
      setSelectedFolderId(undefined);
      initializedRef.current = true;
    } else if (value.scopeType === 'folder' && resolvedFolder) {
      setSelectedSpaceId(resolvedFolder.space_id);
      setSelectedFolderId(resolvedFolder.id);
      initializedRef.current = true;
    } else if (value.scopeType === 'list' && resolvedList) {
      setSelectedSpaceId(resolvedList.space_id);
      setSelectedFolderId(resolvedList.folder_id || undefined);
      initializedRef.current = true;
    }
  }, [value.scopeType, value.scopeId, resolvedList, resolvedFolder]);

  // Reset dependent selections when scope type changes to workspace
  useEffect(() => {
    if (value.scopeType === 'workspace') {
      setSelectedSpaceId(undefined);
      setSelectedFolderId(undefined);
    }
  }, [value.scopeType]);

  const handleScopeTypeChange = (scopeType: AutomationScope) => {
    if (scopeType === 'workspace') {
      onChange({ scopeType, scopeId: workspaceId });
      setSelectedSpaceId(undefined);
      setSelectedFolderId(undefined);
    } else {
      onChange({ scopeType, scopeId: undefined });
    }
  };

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedFolderId(undefined);
    if (value.scopeType === 'space') {
      onChange({ scopeType: 'space', scopeId: spaceId });
    }
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (value.scopeType === 'folder') {
      onChange({ scopeType: 'folder', scopeId: folderId });
    }
  };

  const handleListChange = (listId: string) => {
    onChange({ scopeType: 'list', scopeId: listId });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Aplicar em</Label>
        <Select value={value.scopeType} onValueChange={handleScopeTypeChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecione o escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Todo o Workspace</span>
              </div>
            </SelectItem>
            <SelectItem value="space">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span>Space específico</span>
              </div>
            </SelectItem>
            <SelectItem value="folder">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <span>Pasta específica</span>
              </div>
            </SelectItem>
            <SelectItem value="list">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>Lista específica</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Space selector - shown for space, folder, or list */}
      {(value.scopeType === 'space' || value.scopeType === 'folder' || value.scopeType === 'list') && (
        <div>
          <Label className="text-sm font-medium">Space</Label>
          <Select value={selectedSpaceId} onValueChange={handleSpaceChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione o Space" />
            </SelectTrigger>
            <SelectContent>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Folder selector - shown for folder or list (optional for list) */}
      {(value.scopeType === 'folder' || value.scopeType === 'list') && selectedSpaceId && (
        <div>
          <Label className="text-sm font-medium">
            Pasta {value.scopeType === 'list' && '(opcional)'}
          </Label>
          <Select value={selectedFolderId} onValueChange={handleFolderChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione a Pasta" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List selector - shown only for list */}
      {value.scopeType === 'list' && selectedSpaceId && (
        <div>
          <Label className="text-sm font-medium">Lista</Label>
          <Select value={value.scopeId} onValueChange={handleListChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione a Lista" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
