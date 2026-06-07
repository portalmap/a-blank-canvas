import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ActionSelector } from './ActionSelector';
import { ActionConfigForm } from './ActionConfigForm';
import { getActionById } from './actionCategories';

export interface AutomationAction {
  id: string;
  type: string;
  config: Record<string, any>;
}

interface TemplateList {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null;
}

interface TemplateFolder {
  id: string;
  name: string;
}

interface MultiActionSelectorProps {
  workspaceId: string;
  actions: AutomationAction[];
  onActionsChange: (actions: AutomationAction[]) => void;
  // Props for scope context
  scopeType?: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
  // Props for template context
  isTemplateContext?: boolean;
  templateLists?: TemplateList[];
  templateFolders?: TemplateFolder[];
}

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export const MultiActionSelector = ({
  workspaceId,
  actions,
  onActionsChange,
  scopeType,
  scopeId,
  isTemplateContext = false,
  templateLists = [],
  templateFolders = [],
}: MultiActionSelectorProps) => {
  // Função para encontrar o escopo efetivo de uma ação baseado nas ações anteriores
  const getEffectiveScopeForAction = (actionIndex: number) => {
    // Procurar ação "move_task" anterior com lista configurada
    for (let i = actionIndex - 1; i >= 0; i--) {
      const prevAction = actions[i];
      if (prevAction.type === 'move_task' && prevAction.config?.target_list_id) {
        return {
          scopeType: 'list' as const,
          scopeId: prevAction.config.target_list_id,
        };
      }
    }
    // Se não encontrar, usar o escopo original
    return { scopeType, scopeId };
  };

  const handleAddAction = () => {
    const newAction: AutomationAction = {
      id: generateId(),
      type: '',
      config: {},
    };
    onActionsChange([...actions, newAction]);
  };

  const handleUpdateAction = (id: string, updates: Partial<AutomationAction>) => {
    onActionsChange(
      actions.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleDeleteAction = (id: string) => {
    onActionsChange(actions.filter(a => a.id !== id));
  };

  const handleSelectActionType = (id: string, type: string) => {
    handleUpdateAction(id, { type, config: {} });
  };

  const handleUpdateActionConfig = (id: string, config: Record<string, any>) => {
    handleUpdateAction(id, { config });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Ações a executar</Label>

      {actions.length === 0 ? (
        <div className="text-xs text-muted-foreground py-1.5 px-2 bg-muted/50 rounded-md">
          Nenhuma ação configurada. Adicione pelo menos uma ação.
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action, index) => {
            const actionData = action.type ? getActionById(action.type) : null;
            const effectiveScope = getEffectiveScopeForAction(index);
            
            return (
              <Card key={action.id} className="p-2">
                <div className="flex items-start gap-1.5">
                  <div className="flex items-center gap-0.5 text-muted-foreground pt-0.5">
                    <GripVertical className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium w-3">{index + 1}.</span>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    {/* Selected action display or selector */}
                    {actionData ? (
                      <div className="flex items-center gap-1.5 p-1.5 bg-accent rounded-md">
                        <actionData.icon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">{actionData.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 ml-auto text-[10px] px-1.5"
                          onClick={() => handleSelectActionType(action.id, '')}
                        >
                          Alterar
                        </Button>
                      </div>
                    ) : (
                      <ActionSelector
                        selectedAction={action.type || null}
                        onSelectAction={(type) => handleSelectActionType(action.id, type)}
                      />
                    )}

                    {/* Action config form */}
                    {action.type && (
                      <ActionConfigForm
                        actionId={action.type}
                        workspaceId={workspaceId}
                        config={action.config}
                        onConfigChange={(config) => handleUpdateActionConfig(action.id, config)}
                        scopeType={effectiveScope.scopeType}
                        scopeId={effectiveScope.scopeId}
                        isTemplateContext={isTemplateContext}
                        templateLists={templateLists}
                        templateFolders={templateFolders}
                      />
                    )}
                  </div>

                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAction(action.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={handleAddAction}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar ação
      </Button>
    </div>
  );
};
