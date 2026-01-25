import { useStatusesForScope } from '@/hooks/useStatuses';
import { StatusMultiSelect } from './StatusMultiSelect';

interface TriggerConfigFormProps {
  triggerId: string;
  workspaceId: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  scopeType?: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
}

export const TriggerConfigForm = ({
  triggerId,
  workspaceId,
  config,
  onConfigChange,
  scopeType = 'workspace',
  scopeId,
}: TriggerConfigFormProps) => {
  // Fetch statuses for the specific scope (list > folder > space > workspace)
  const { data: statuses = [] } = useStatusesForScope(
    scopeType === 'workspace' ? 'workspace' : scopeType as 'list' | 'folder' | 'space',
    scopeId,
    workspaceId
  );

  // Only show config for status change trigger
  if (triggerId !== 'on_status_changed') {
    return null;
  }

  const triggerConfig = config.trigger_config || {};
  const fromStatusIds: string[] = triggerConfig.from_status_ids || [];
  const toStatusIds: string[] = triggerConfig.to_status_ids || [];

  const handleFromChange = (ids: string[]) => {
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        from_status_ids: ids.length > 0 ? ids : null,
      },
    });
  };

  const handleToChange = (ids: string[]) => {
    onConfigChange({
      ...config,
      trigger_config: {
        ...triggerConfig,
        to_status_ids: ids.length > 0 ? ids : null,
      },
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <h4 className="font-medium text-sm">Configurar gatilho de status</h4>
      
      <StatusMultiSelect
        label="De (Status de origem)"
        placeholder="Qualquer status"
        statuses={statuses}
        selectedIds={fromStatusIds}
        onSelectionChange={handleFromChange}
      />
      
      <StatusMultiSelect
        label="Para (Status de destino)"
        placeholder="Qualquer status"
        statuses={statuses}
        selectedIds={toStatusIds}
        onSelectionChange={handleToChange}
      />
    </div>
  );
};
