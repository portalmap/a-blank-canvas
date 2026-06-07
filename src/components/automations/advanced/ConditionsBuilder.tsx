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
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Label className="text-xs font-medium">E se essa condição for verdadeira:</Label>
      </div>

      {conditions.length === 0 ? (
        <div className="text-xs text-muted-foreground py-1.5 px-2 bg-muted/50 rounded-md">
          Sem condições. A automação será executada sempre que o gatilho disparar.
        </div>
      ) : (
        <div className="space-y-1.5">
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
                <div className="flex items-center justify-center py-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-2 font-medium"
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
        className="w-full h-7 text-xs"
        onClick={handleAddCondition}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar condição
      </Button>
    </div>
  );
};
