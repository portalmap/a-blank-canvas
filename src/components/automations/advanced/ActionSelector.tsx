import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTION_OPTIONS, ActionOption } from './actionCategories';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActionSelectorProps {
  selectedAction: string | null;
  onSelectAction: (actionId: string) => void;
}

export const ActionSelector = ({ selectedAction, onSelectAction }: ActionSelectorProps) => {
  const handleSelectAction = (action: ActionOption) => {
    onSelectAction(action.id);
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-1">
        {ACTION_OPTIONS.map((action) => {
          const ActionIcon = action.icon;
          const isSelected = selectedAction === action.id;

          return (
            <button
              key={action.id}
              onClick={() => handleSelectAction(action)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors",
                "hover:bg-accent",
                isSelected && "bg-primary/10 border border-primary/30"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                isSelected ? "bg-primary/20" : "bg-muted"
              )}>
                <ActionIcon className={cn(
                  "h-4 w-4",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm",
                  isSelected && "font-medium text-primary"
                )}>
                  {action.label}
                </p>
                {action.description && (
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                )}
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
