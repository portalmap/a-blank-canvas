import { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRIGGER_CATEGORIES, TriggerOption } from './triggerCategories';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TriggerInlineConfig } from './TriggerInlineConfig';

interface TemplateListInfo {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null;
}

interface TriggerSelectorProps {
  selectedTrigger: string | null;
  onSelectTrigger: (triggerId: string) => void;
  workspaceId: string;
  scopeType: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  isTemplateContext?: boolean;
  templateLists?: TemplateListInfo[];
}

// List of triggers that have inline configuration
const TRIGGERS_WITH_CONFIG = ['on_status_changed', 'on_tag_added', 'on_tag_removed'];

export const TriggerSelector = ({ 
  selectedTrigger, 
  onSelectTrigger,
  workspaceId,
  scopeType,
  scopeId,
  config,
  onConfigChange,
  isTemplateContext,
  templateLists,
}: TriggerSelectorProps) => {
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

  const hasInlineConfig = (triggerId: string) => TRIGGERS_WITH_CONFIG.includes(triggerId);

  return (
    <ScrollArea className="h-[280px] pr-3">
      <div className="space-y-0.5">
        {TRIGGER_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.includes(category.name);
          const CategoryIcon = category.icon;
          const hasSelectedTrigger = category.triggers.some(t => t.id === selectedTrigger);

          return (
            <div key={category.name} className="rounded-md overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors",
                  "hover:bg-accent/50 rounded-md",
                  hasSelectedTrigger && "bg-accent/30"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <CategoryIcon className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-xs">{category.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {category.triggers.length}
                </span>
              </button>

              {/* Category Triggers */}
              {isExpanded && (
                <div className="ml-5 space-y-0.5 pb-1.5">
                  {category.triggers.map((trigger) => {
                    const TriggerIcon = trigger.icon;
                    const isSelected = selectedTrigger === trigger.id;
                    const showConfig = isSelected && hasInlineConfig(trigger.id);

                    return (
                      <div key={trigger.id}>
                        <button
                          onClick={() => handleSelectTrigger(trigger)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md transition-colors",
                            "hover:bg-accent",
                            isSelected && "bg-primary/10 border border-primary/30"
                          )}
                        >
                          <TriggerIcon className={cn(
                            "h-3.5 w-3.5",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs truncate",
                              isSelected && "font-medium text-primary"
                            )}>
                              {trigger.label}
                            </p>
                            {trigger.description && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {trigger.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>

                        {/* Inline Configuration */}
                        {showConfig && (
                          <div className="ml-5 mt-1.5 mb-1.5 p-2 bg-accent/30 rounded-md border border-border/50">
                            <TriggerInlineConfig
                              triggerId={trigger.id}
                              workspaceId={workspaceId}
                              scopeType={scopeType}
                              scopeId={scopeId}
                              config={config}
                              onConfigChange={onConfigChange}
                              isTemplateContext={isTemplateContext}
                              templateLists={templateLists}
                            />
                          </div>
                        )}
                      </div>
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
