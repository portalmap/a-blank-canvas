import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TriggerConfigFormProps {
  triggerId: string;
  workspaceId: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

export const TriggerConfigForm = ({
  triggerId,
  workspaceId,
  config,
  onConfigChange,
}: TriggerConfigFormProps) => {
  const [fromOpen, setFromOpen] = useState(true);
  const [toOpen, setToOpen] = useState(true);

  // Fetch statuses for the workspace
  const { data: statuses = [] } = useQuery({
    queryKey: ['workspace-statuses', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Only show config for status change trigger
  if (triggerId !== 'on_status_changed') {
    return null;
  }

  const triggerConfig = config.trigger_config || {};
  const fromStatusIds: string[] = triggerConfig.from_status_ids || [];
  const toStatusIds: string[] = triggerConfig.to_status_ids || [];

  const handleFromStatusToggle = (statusId: string, checked: boolean) => {
    let newFromIds: string[];
    if (checked) {
      newFromIds = [...fromStatusIds, statusId];
    } else {
      newFromIds = fromStatusIds.filter(id => id !== statusId);
    }
    
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        from_status_ids: newFromIds.length > 0 ? newFromIds : null,
      },
    });
  };

  const handleToStatusToggle = (statusId: string, checked: boolean) => {
    let newToIds: string[];
    if (checked) {
      newToIds = [...toStatusIds, statusId];
    } else {
      newToIds = toStatusIds.filter(id => id !== statusId);
    }
    
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        to_status_ids: newToIds.length > 0 ? newToIds : null,
      },
    });
  };

  const clearFromStatuses = () => {
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        from_status_ids: null,
      },
    });
  };

  const clearToStatuses = () => {
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        to_status_ids: null,
      },
    });
  };

  const getStatusById = (id: string) => statuses.find(s => s.id === id);

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <h4 className="font-medium text-sm">Configurar gatilho de status</h4>
      
      {/* FROM Status Selection */}
      <Collapsible open={fromOpen} onOpenChange={setFromOpen}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">De (Status de origem)</Label>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {fromOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          {/* Selected badges */}
          {fromStatusIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {fromStatusIds.map(id => {
                const status = getStatusById(id);
                return status ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                    style={{ borderLeftColor: status.color || '#94a3b8', borderLeftWidth: 3 }}
                  >
                    {status.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFromStatusToggle(id, false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ) : null;
              })}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFromStatuses}>
                Limpar
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Qualquer status (nenhum filtro)</p>
          )}
          
          <CollapsibleContent>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {statuses.map(status => (
                  <label
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-1 rounded"
                  >
                    <Checkbox
                      checked={fromStatusIds.includes(status.id)}
                      onCheckedChange={(checked) => handleFromStatusToggle(status.id, !!checked)}
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color || '#94a3b8' }}
                    />
                    <span className="text-sm">{status.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* TO Status Selection */}
      <Collapsible open={toOpen} onOpenChange={setToOpen}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Para (Status de destino)</Label>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {toOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          {/* Selected badges */}
          {toStatusIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {toStatusIds.map(id => {
                const status = getStatusById(id);
                return status ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                    style={{ borderLeftColor: status.color || '#94a3b8', borderLeftWidth: 3 }}
                  >
                    {status.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleToStatusToggle(id, false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ) : null;
              })}
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearToStatuses}>
                Limpar
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Qualquer status (nenhum filtro)</p>
          )}
          
          <CollapsibleContent>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-2">
                {statuses.map(status => (
                  <label
                    key={status.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-1 rounded"
                  >
                    <Checkbox
                      checked={toStatusIds.includes(status.id)}
                      onCheckedChange={(checked) => handleToStatusToggle(status.id, !!checked)}
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color || '#94a3b8' }}
                    />
                    <span className="text-sm">{status.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
