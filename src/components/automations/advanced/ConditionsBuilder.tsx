import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConditionRow, type AutomationCondition } from './ConditionRow';

interface ConditionsBuilderProps {
  workspaceId: string;
  conditions: AutomationCondition[];
  onConditionsChange: (conditions: AutomationCondition[]) => void;
}

// Generate a simple unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export const ConditionsBuilder = ({
  workspaceId,
  conditions,
  onConditionsChange,
}: ConditionsBuilderProps) => {
  const handleAddCondition = () => {
    const newCondition: AutomationCondition = {
      id: generateId(),
      field: 'tag',
      operator: 'contains',
      value: [],
      logic: 'AND',
    };
    onConditionsChange([...conditions, newCondition]);
  };

  const handleUpdateCondition = (id: string, updates: Partial<AutomationCondition>) => {
    onConditionsChange(
      conditions.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCondition = (id: string) => {
    onConditionsChange(conditions.filter(c => c.id !== id));
  };

  const handleToggleLogic = (id: string) => {
    onConditionsChange(
      conditions.map(c => 
        c.id === id ? { ...c, logic: c.logic === 'AND' ? 'OR' : 'AND' } : c
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">E se essa condição for verdadeira:</Label>
      </div>

      {conditions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 px-3 bg-muted/50 rounded-md">
          Sem condições. A automação será executada sempre que o gatilho disparar.
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((condition, index) => (
            <div key={condition.id}>
              <ConditionRow
                condition={condition}
                workspaceId={workspaceId}
                onUpdate={(updates) => handleUpdateCondition(condition.id, updates)}
                onDelete={() => handleDeleteCondition(condition.id)}
              />
              
              {/* Logic connector between conditions */}
              {index < conditions.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-3 font-medium"
                    onClick={() => handleToggleLogic(condition.id)}
                  >
                    {condition.logic === 'AND' ? 'E' : 'OU'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleAddCondition}
      >
        <Plus className="h-4 w-4 mr-1" />
        Adicionar condição
      </Button>
    </div>
  );
};
