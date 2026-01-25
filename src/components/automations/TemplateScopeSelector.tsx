import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSpaceTemplates, useSpaceTemplate } from '@/hooks/useSpaceTemplates';
import { LayoutTemplate, LayoutGrid, Folder, List } from 'lucide-react';

export interface TemplateScopeValue {
  templateId: string;
  scopeType: 'space' | 'folder' | 'list';
  folderRefId?: string;
  listRefId?: string;
}

interface TemplateScopeSelectorProps {
  value: TemplateScopeValue | null;
  onChange: (value: TemplateScopeValue | null) => void;
}

export function TemplateScopeSelector({ value, onChange }: TemplateScopeSelectorProps) {
  const { data: templates = [] } = useSpaceTemplates();
  const { data: selectedTemplate } = useSpaceTemplate(value?.templateId);
  
  const [localScope, setLocalScope] = useState<'space' | 'folder' | 'list'>('space');

  useEffect(() => {
    if (value?.scopeType) {
      setLocalScope(value.scopeType);
    }
  }, [value?.scopeType]);

  const handleTemplateChange = (templateId: string) => {
    onChange({
      templateId,
      scopeType: 'space',
      folderRefId: undefined,
      listRefId: undefined,
    });
    setLocalScope('space');
  };

  const handleScopeTypeChange = (scopeType: 'space' | 'folder' | 'list') => {
    if (!value?.templateId) return;
    
    setLocalScope(scopeType);
    onChange({
      templateId: value.templateId,
      scopeType,
      folderRefId: undefined,
      listRefId: undefined,
    });
  };

  const handleFolderChange = (folderId: string) => {
    if (!value?.templateId) return;
    
    onChange({
      templateId: value.templateId,
      scopeType: 'folder',
      folderRefId: folderId,
      listRefId: undefined,
    });
  };

  const handleListChange = (listId: string) => {
    if (!value?.templateId) return;
    
    onChange({
      templateId: value.templateId,
      scopeType: 'list',
      folderRefId: value.folderRefId,
      listRefId: listId,
    });
  };

  const folders = selectedTemplate?.folders || [];
  const lists = selectedTemplate?.lists || [];

  // Get lists for the current context (all lists or lists in a folder)
  const getAvailableLists = () => {
    if (value?.folderRefId) {
      return lists.filter(l => l.folder_ref_id === value.folderRefId);
    }
    return lists;
  };

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div>
        <Label className="text-sm font-medium">Template de Space</Label>
        <Select value={value?.templateId || ''} onValueChange={handleTemplateChange}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecione o template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" style={{ color: template.color || undefined }} />
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scope type within template */}
      {value?.templateId && (
        <div>
          <Label className="text-sm font-medium">Aplicar em</Label>
          <Select value={localScope} onValueChange={handleScopeTypeChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione o escopo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="space">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span>Todo o Space (do template)</span>
                </div>
              </SelectItem>
              {folders.length > 0 && (
                <SelectItem value="folder">
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>Pasta específica</span>
                  </div>
                </SelectItem>
              )}
              {lists.length > 0 && (
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Lista específica</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Folder selector */}
      {value?.templateId && localScope === 'folder' && folders.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Pasta do Template</Label>
          <Select value={value.folderRefId || ''} onValueChange={handleFolderChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione a pasta" />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List selector */}
      {value?.templateId && localScope === 'list' && (
        <div>
          <Label className="text-sm font-medium">Lista do Template</Label>
          <Select value={value.listRefId || ''} onValueChange={handleListChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Selecione a lista" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableLists().map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>{list.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
