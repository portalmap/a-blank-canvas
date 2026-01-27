import { useStatusesForScope } from '@/hooks/useStatuses';
import { useTaskTags } from '@/hooks/useTaskTags';
import { StatusMultiSelect } from './StatusMultiSelect';
import { TagMultiSelect } from './TagMultiSelect';

interface TriggerInlineConfigProps {
  triggerId: string;
  workspaceId: string;
  scopeType: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

export const TriggerInlineConfig = ({
  triggerId,
  workspaceId,
  scopeType,
  scopeId,
  config,
  onConfigChange,
}: TriggerInlineConfigProps) => {
  // Fetch statuses for the specific scope
  const { data: statuses = [] } = useStatusesForScope(
    scopeType === 'workspace' ? 'workspace' : scopeType,
    scopeId,
    workspaceId
  );

  // Fetch tags for the workspace
  const { data: tags = [] } = useTaskTags(workspaceId);

  const triggerConfig = config.trigger_config || {};

  // Render configuration based on trigger type
  switch (triggerId) {
    case 'on_status_changed': {
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
        <div className="space-y-3">
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
    }

    case 'on_tag_added':
    case 'on_tag_removed': {
      const tagIds: string[] = triggerConfig.tag_ids || [];

      const handleTagChange = (ids: string[]) => {
        onConfigChange({
          ...config,
          trigger_config: {
            ...triggerConfig,
            tag_ids: ids.length > 0 ? ids : null,
          },
        });
      };

      return (
        <TagMultiSelect
          label={triggerId === 'on_tag_added' ? 'Etiquetas' : 'Etiquetas removidas'}
          placeholder="Qualquer etiqueta"
          tags={tags}
          selectedIds={tagIds}
          onSelectionChange={handleTagChange}
        />
      );
    }

    default:
      return null;
  }
};
