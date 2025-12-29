import { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIGGER_CATEGORIES, TriggerOption } from './triggerCategories';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TriggerSelectorProps {
  selectedTrigger: string | null;
  onSelectTrigger: (triggerId: string) => void;
}

export const TriggerSelector = ({ selectedTrigger, onSelectTrigger }: TriggerSelectorProps) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Popular']);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleSelectTrigger = (trigger: TriggerOption) => {
    onSelectTrigger(trigger.id);
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-1">
        {TRIGGER_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.includes(category.name);
          const CategoryIcon = category.icon;
          const hasSelectedTrigger = category.triggers.some(t => t.id === selectedTrigger);

          return (
            <div key={category.name} className="rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                  "hover:bg-accent/50 rounded-lg",
                  hasSelectedTrigger && "bg-accent/30"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CategoryIcon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{category.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.triggers.length}
                </span>
              </button>

              {/* Category Triggers */}
              {isExpanded && (
                <div className="ml-6 space-y-0.5 pb-2">
                  {category.triggers.map((trigger) => {
                    const TriggerIcon = trigger.icon;
                    const isSelected = selectedTrigger === trigger.id;

                    return (
                      <button
                        key={trigger.id}
                        onClick={() => handleSelectTrigger(trigger)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
                          "hover:bg-accent",
                          isSelected && "bg-primary/10 border border-primary/30"
                        )}
                      >
                        <TriggerIcon className={cn(
                          "h-4 w-4",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm truncate",
                            isSelected && "font-medium text-primary"
                          )}>
                            {trigger.label}
                          </p>
                          {trigger.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {trigger.description}
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
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
