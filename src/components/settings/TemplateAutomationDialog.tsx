import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ArrowRight, Zap, Target, X, LayoutGrid, Folder, List } from 'lucide-react';
import { TriggerSelector } from '@/components/automations/advanced/TriggerSelector';
import { ActionSelector } from '@/components/automations/advanced/ActionSelector';
import { ActionConfigForm } from '@/components/automations/advanced/ActionConfigForm';
import { getTriggerById, getCategoryByTriggerId } from '@/components/automations/advanced/triggerCategories';
import { getActionById } from '@/components/automations/advanced/actionCategories';
import { 
  useCreateTemplateAutomation, 
  useUpdateTemplateAutomation,
  type TemplateAutomation 
} from '@/hooks/useTemplateAutomations';
import type { SpaceTemplateFolder, SpaceTemplateList } from '@/hooks/useSpaceTemplates';
import { toast } from 'sonner';

interface TemplateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  folders: SpaceTemplateFolder[];
  lists: SpaceTemplateList[];
  automation?: TemplateAutomation | null;
}

type BuilderStep = 'trigger' | 'action';

export function TemplateAutomationDialog({ 
  open, 
  onOpenChange,
  templateId,
  folders,
  lists,
  automation
}: TemplateAutomationDialogProps) {
  const createAutomation = useCreateTemplateAutomation();
  const updateAutomation = useUpdateTemplateAutomation();

  const isEditMode = !!automation;

  const [name, setName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});
  const [scopeType, setScopeType] = useState<'space' | 'folder' | 'list'>('space');
  const [folderRefId, setFolderRefId] = useState<string | undefined>();
  const [listRefId, setListRefId] = useState<string | undefined>();
  const [activeStep, setActiveStep] = useState<BuilderStep>('trigger');

  // Populate fields when editing
  useEffect(() => {
    if (automation && open) {
      setName(automation.description || '');
      setSelectedTrigger(automation.trigger);
      setSelectedAction(automation.action_type);
      setActionConfig(automation.action_config || {});
      setScopeType(automation.scope_type);
      setFolderRefId(automation.folder_ref_id || undefined);
      setListRefId(automation.list_ref_id || undefined);
      setActiveStep('trigger');
    }
  }, [automation, open]);

  const resetForm = () => {
    setName('');
    setSelectedTrigger(null);
    setSelectedAction(null);
    setActionConfig({});
    setScopeType('space');
    setFolderRefId(undefined);
    setListRefId(undefined);
    setActiveStep('trigger');
  };

  const handleClose = () => {
    if (!isEditMode) {
      resetForm();
    }
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedTrigger || !selectedAction) {
      toast.error('Selecione um gatilho e uma ação');
      return;
    }

    // Validate scope
    if (scopeType === 'folder' && !folderRefId) {
      toast.error('Selecione uma pasta');
      return;
    }
    if (scopeType === 'list' && !listRefId) {
      toast.error('Selecione uma lista');
      return;
    }

    const trigger = getTriggerById(selectedTrigger);
    const action = getActionById(selectedAction);

    // Validate required config fields
    if (action?.configFields) {
      for (const field of action.configFields) {
        if (field.required && !actionConfig[field.name]) {
          toast.error(`Preencha o campo: ${field.label}`);
          return;
        }
      }
    }

    const description = name || `Quando ${trigger?.label} → ${action?.label}`;

    try {
      if (isEditMode && automation) {
        await updateAutomation.mutateAsync({
          id: automation.id,
          templateId,
          description,
          trigger: selectedTrigger as any,
          action_type: selectedAction as any,
          action_config: actionConfig,
          scope_type: scopeType,
          folder_ref_id: scopeType === 'folder' ? folderRefId : null,
          list_ref_id: scopeType === 'list' ? listRefId : null,
        });
      } else {
        await createAutomation.mutateAsync({
          templateId,
          description,
          trigger: selectedTrigger as any,
          actionType: selectedAction as any,
          actionConfig,
          scopeType,
          folderRefId: scopeType === 'folder' ? folderRefId : undefined,
          listRefId: scopeType === 'list' ? listRefId : undefined,
        });
      }

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar automação:', error);
    }
  };

  const isPending = createAutomation.isPending || updateAutomation.isPending;

  const selectedTriggerData = selectedTrigger ? getTriggerById(selectedTrigger) : null;
  const selectedTriggerCategory = selectedTrigger ? getCategoryByTriggerId(selectedTrigger) : null;
  const selectedActionData = selectedAction ? getActionById(selectedAction) : null;

  // Get lists for current folder context
  const getAvailableLists = () => {
    if (folderRefId) {
      return lists.filter(l => l.folder_ref_id === folderRefId);
    }
    return lists;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditMode ? 'Editar Automação do Template' : 'Nova Automação para Template'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Esta automação será aplicada quando o template for usado.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label>Nome da automação (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dê um nome a essa regra de automação..."
            />
          </div>

          {/* Template Scope Selector */}
          <div className="space-y-4">
            <Label>Escopo dentro do Template</Label>
            
            <Select value={scopeType} onValueChange={(v) => {
              setScopeType(v as 'space' | 'folder' | 'list');
              setFolderRefId(undefined);
              setListRefId(undefined);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Onde aplicar" />
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

            {/* Folder selector */}
            {scopeType === 'folder' && folders.length > 0 && (
              <Select value={folderRefId || ''} onValueChange={setFolderRefId}>
                <SelectTrigger>
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
            )}

            {/* List selector */}
            {scopeType === 'list' && lists.length > 0 && (
              <Select value={listRefId || ''} onValueChange={setListRefId}>
                <SelectTrigger>
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
            )}
          </div>

          {/* Trigger → Action Flow */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* Trigger Card */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                activeStep === 'trigger' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveStep('trigger')}
            >
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Gatilho</span>
                {selectedTriggerCategory && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {selectedTriggerCategory.name}
                  </Badge>
                )}
              </div>

              {selectedTriggerData ? (
                <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                  <selectedTriggerData.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{selectedTriggerData.label}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrigger(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar um gatilho
                </p>
              )}

              {activeStep === 'trigger' && (
                <div className="mt-4 border-t pt-4">
                  <TriggerSelector
                    selectedTrigger={selectedTrigger}
                    onSelectTrigger={(id) => {
                      setSelectedTrigger(id);
                      setActiveStep('action');
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center h-full pt-12">
              <div className="p-2 rounded-full bg-muted">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Action Card */}
            <Card 
              className={`p-4 cursor-pointer transition-all ${
                activeStep === 'action' ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveStep('action')}
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Ação</span>
              </div>

              {selectedActionData ? (
                <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                  <selectedActionData.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{selectedActionData.label}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAction(null);
                      setActionConfig({});
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar uma ação
                </p>
              )}

              {activeStep === 'action' && (
                <div className="mt-4 border-t pt-4">
                  <ActionSelector
                    selectedAction={selectedAction}
                    onSelectAction={setSelectedAction}
                  />
                </div>
              )}

              {/* Action Config Form - Note: workspaceId is not available here */}
              {selectedAction && (
                <ActionConfigForm
                  actionId={selectedAction}
                  workspaceId=""
                  config={actionConfig}
                  onConfigChange={setActionConfig}
                />
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!selectedTrigger || !selectedAction || isPending}
          >
            {isPending 
              ? (isEditMode ? 'Salvando...' : 'Adicionando...') 
              : (isEditMode ? 'Salvar Alterações' : 'Adicionar Automação')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
