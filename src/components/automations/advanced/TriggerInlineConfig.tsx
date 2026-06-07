import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { useTaskTags } from '@/hooks/useTaskTags';
import { StatusMultiSelect } from './StatusMultiSelect';
import { TagMultiSelect } from './TagMultiSelect';

interface TemplateListInfo {
  id: string;
  name: string;
  folder_ref_id?: string | null;
  status_template_id?: string | null;
}

interface TriggerInlineConfigProps {
  triggerId: string;
  workspaceId: string;
  scopeType: 'workspace' | 'space' | 'folder' | 'list';
  scopeId?: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  isTemplateContext?: boolean;
  templateLists?: TemplateListInfo[];
}

export const TriggerInlineConfig = ({
  triggerId,
  workspaceId,
  scopeType,
  scopeId,
  config,
  onConfigChange,
  isTemplateContext,
  templateLists = [],
}: TriggerInlineConfigProps) => {
  // Find template list if in template context
  const selectedTemplateList = isTemplateContext && scopeType === 'list' && scopeId
    ? templateLists.find(l => l.id === scopeId)
    : null;

  // Fetch status template items for template context
  const { data: templateStatuses = [] } = useQuery({
    queryKey: ['template-status-items', selectedTemplateList?.status_template_id],
    queryFn: async () => {
      if (!selectedTemplateList?.status_template_id) return [];
      
      const { data, error } = await supabase
        .from('status_template_items')
        .select('*')
        .eq('template_id', selectedTemplateList.status_template_id)
        .order('order_index');

      if (error) throw error;
      return data.map(s => ({ 
        id: s.id, 
        name: s.name, 
        color: s.color, 
        category: s.category 
      }));
    },
    enabled: !!selectedTemplateList?.status_template_id,
  });

  // Fetch statuses for the specific scope (non-template)
  const { data: scopeStatuses = [] } = useStatusesForScope(
    scopeType === 'workspace' ? 'workspace' : scopeType,
    scopeId,
    workspaceId
  );

  // Use template statuses if available, otherwise use scope statuses
  const statuses = isTemplateContext && templateStatuses.length > 0 
    ? templateStatuses 
    : scopeStatuses;

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
