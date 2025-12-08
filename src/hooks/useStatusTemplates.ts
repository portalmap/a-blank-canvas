import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StatusTemplateItem {
  id: string;
  template_id: string;
  name: string;
  color: string | null;
  is_default: boolean;
  order_index: number;
  category: string;
}

export interface StatusTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  items?: StatusTemplateItem[];
}

export const useStatusTemplates = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['status-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('status_templates')
        .select('*, status_template_items(*)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (StatusTemplate & { status_template_items: StatusTemplateItem[] })[];
    },
    enabled: !!workspaceId,
  });
};

export const useStatusTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['status-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from('status_templates')
        .select('*, status_template_items(*)')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as StatusTemplate & { status_template_items: StatusTemplateItem[] };
    },
    enabled: !!templateId,
  });
};

export const useCreateStatusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      name, 
      description,
      items 
    }: { 
      workspaceId: string; 
      name: string; 
      description?: string;
      items: Omit<StatusTemplateItem, 'id' | 'template_id'>[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: template, error: templateError } = await supabase
        .from('status_templates')
        .insert({
          workspace_id: workspaceId,
          name,
          description,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('status_template_items')
          .insert(items.map((item, index) => ({
            ...item,
            template_id: template.id,
            order_index: index,
          })));

        if (itemsError) throw itemsError;
      }

      return template;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['status-templates', variables.workspaceId] });
      toast.success('Modelo de status criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar modelo de status');
      console.error(error);
    },
  });
};

export const useUpdateStatusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name, 
      description,
      items 
    }: { 
      id: string; 
      name: string; 
      description?: string;
      items: { name: string; color: string; is_default: boolean; order_index: number; category: string }[];
    }) => {
      const { error: templateError } = await supabase
        .from('status_templates')
        .update({ name, description })
        .eq('id', id);

      if (templateError) throw templateError;

      // Delete existing items
      await supabase
        .from('status_template_items')
        .delete()
        .eq('template_id', id);

      // Insert new items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('status_template_items')
          .insert(items.map((item, index) => ({
            template_id: id,
            name: item.name,
            color: item.color,
            is_default: item.is_default,
            order_index: index,
            category: item.category,
          })));

        if (itemsError) throw itemsError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-templates'] });
      queryClient.invalidateQueries({ queryKey: ['status-template'] });
      toast.success('Modelo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar modelo');
      console.error(error);
    },
  });
};

export const useDeleteStatusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('status_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-templates'] });
      toast.success('Modelo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir modelo');
      console.error(error);
    },
  });
};

export const useDuplicateStatusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch original template
      const { data: original, error: fetchError } = await supabase
        .from('status_templates')
        .select('*, status_template_items(*)')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('status_templates')
        .insert({
          workspace_id: original.workspace_id,
          name: `${original.name} (cópia)`,
          description: original.description,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy items
      if (original.status_template_items?.length > 0) {
        const { error: itemsError } = await supabase
          .from('status_template_items')
          .insert(original.status_template_items.map((item: StatusTemplateItem) => ({
            template_id: newTemplate.id,
            name: item.name,
            color: item.color,
            is_default: item.is_default,
            order_index: item.order_index,
            category: item.category,
          })));

        if (itemsError) throw itemsError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-templates'] });
      toast.success('Modelo duplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar modelo');
      console.error(error);
    },
  });
};

export const useApplyStatusTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      workspaceId,
      spaceIds,
      folderIds,
      listIds,
      synchronized = true,
    }: {
      templateId: string;
      workspaceId?: string;
      spaceIds: string[];
      folderIds: string[];
      listIds: string[];
      synchronized?: boolean;
    }) => {
      // Get the template with its items
      const { data: template, error: templateError } = await supabase
        .from('status_templates')
        .select('*, status_template_items(*)')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Apply to spaces
      for (const spaceId of spaceIds) {
        if (synchronized) {
          // Link to template (synchronized mode)
          await supabase
            .from('spaces')
            .update({ 
              status_template_id: templateId,
              status_source: 'template'
            })
            .eq('id', spaceId);
        } else {
          // Create independent copy
          await supabase
            .from('spaces')
            .update({ 
              status_template_id: null,
              status_source: 'custom'
            })
            .eq('id', spaceId);

          // Copy status items as statuses
          if (template.status_template_items) {
            const statusesToInsert = template.status_template_items.map((item: StatusTemplateItem, index: number) => ({
              workspace_id: template.workspace_id,
              scope_type: 'space' as const,
              scope_id: spaceId,
              name: item.name,
              color: item.color,
              order_index: index,
              is_default: item.is_default,
            }));

            await supabase.from('statuses').insert(statusesToInsert);
          }
        }
      }

      // Apply to folders
      for (const folderId of folderIds) {
        if (synchronized) {
          await supabase
            .from('folders')
            .update({ 
              status_template_id: templateId,
              status_source: 'template'
            })
            .eq('id', folderId);
        } else {
          // Get the folder's space to find workspace_id
          const { data: folder } = await supabase
            .from('folders')
            .select('space_id, spaces(workspace_id)')
            .eq('id', folderId)
            .single();

          await supabase
            .from('folders')
            .update({ 
              status_template_id: null,
              status_source: 'custom'
            })
            .eq('id', folderId);

          if (template.status_template_items && folder) {
            const workspaceIdFromFolder = (folder.spaces as any)?.workspace_id;
            if (workspaceIdFromFolder) {
              const statusesToInsert = template.status_template_items.map((item: StatusTemplateItem, index: number) => ({
                workspace_id: workspaceIdFromFolder,
                scope_type: 'folder' as const,
                scope_id: folderId,
                name: item.name,
                color: item.color,
                order_index: index,
                is_default: item.is_default,
              }));

              await supabase.from('statuses').insert(statusesToInsert);
            }
          }
        }
      }

      // Apply to lists
      for (const listId of listIds) {
        const { data: list } = await supabase
          .from('lists')
          .select('workspace_id')
          .eq('id', listId)
          .single();

        if (synchronized) {
          await supabase
            .from('lists')
            .update({ 
              status_template_id: templateId,
              status_source: 'template'
            })
            .eq('id', listId);
        } else {
          await supabase
            .from('lists')
            .update({ 
              status_template_id: null,
              status_source: 'custom'
            })
            .eq('id', listId);

          if (template.status_template_items && list) {
            const statusesToInsert = template.status_template_items.map((item: StatusTemplateItem, index: number) => ({
              workspace_id: list.workspace_id,
              scope_type: 'list' as const,
              scope_id: listId,
              name: item.name,
              color: item.color,
              order_index: index,
              is_default: item.is_default,
            }));

            await supabase.from('statuses').insert(statusesToInsert);
          }
        }
      }

      // Apply to workspace if specified
      if (workspaceId) {
        // First delete existing workspace statuses
        await supabase
          .from('statuses')
          .delete()
          .eq('workspace_id', workspaceId)
          .eq('scope_type', 'workspace');

        if (template.status_template_items) {
          const statusesToInsert = template.status_template_items.map((item: StatusTemplateItem, index: number) => ({
            workspace_id: workspaceId,
            scope_type: 'workspace' as const,
            scope_id: null,
            name: item.name,
            color: item.color,
            order_index: index,
            is_default: item.is_default,
            template_id: synchronized ? templateId : null,
          }));

          await supabase.from('statuses').insert(statusesToInsert);
        }
      }

      return { templateId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      toast.success('Modelo aplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao aplicar modelo');
      console.error(error);
    },
  });
};
