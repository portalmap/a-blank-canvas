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
    <ScrollArea className="h-[280px] pr-3">
      <div className="space-y-0.5">
        {ACTION_OPTIONS.map((action) => {
          const ActionIcon = action.icon;
          const isSelected = selectedAction === action.id;

          return (
            <button
              key={action.id}
              onClick={() => handleSelectAction(action)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 text-left rounded-md transition-colors",
                "hover:bg-accent",
                isSelected && "bg-primary/10 border border-primary/30"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-md",
                isSelected ? "bg-primary/20" : "bg-muted"
              )}>
                <ActionIcon className={cn(
                  "h-3.5 w-3.5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs",
                  isSelected && "font-medium text-primary"
                )}>
                  {action.label}
                </p>
                {action.description && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {action.description}
                  </p>
                )}
              </div>
              {isSelected && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};
