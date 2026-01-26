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
}

interface TemplateFolder {
  id: string;
  name: string;
}

interface MultiActionSelectorProps {
  workspaceId: string;
  actions: AutomationAction[];
  onActionsChange: (actions: AutomationAction[]) => void;
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
  isTemplateContext = false,
  templateLists = [],
  templateFolders = [],
}: MultiActionSelectorProps) => {
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
    <div className="space-y-3">
      <Label className="text-sm font-medium">Ações a executar</Label>

      {actions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 px-3 bg-muted/50 rounded-md">
          Nenhuma ação configurada. Adicione pelo menos uma ação.
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => {
            const actionData = action.type ? getActionById(action.type) : null;
            
            return (
              <Card key={action.id} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex items-center gap-1 text-muted-foreground pt-1">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs font-medium w-4">{index + 1}.</span>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    {/* Selected action display or selector */}
                    {actionData ? (
                      <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                        <actionData.icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{actionData.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 ml-auto text-xs"
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
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteAction(action.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
        className="w-full"
        onClick={handleAddAction}
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar ação
      </Button>
    </div>
  );
};
