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

// ---------- Helpers de aplicação de modelo ----------

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

interface ExistingStatus {
  id: string;
  name: string;
  category: string | null;
}

interface NewStatusRow {
  id: string;
  name: string;
  category: string | null;
}

/**
 * Substitui as etapas de um escopo pelas etapas do modelo, remapeando as
 * tarefas das etapas antigas para as novas (por nome, depois por categoria).
 * Etapas antigas sem destino equivalente e que ainda possuem tarefas são
 * preservadas no fim da ordem, para nenhuma tarefa desaparecer do Kanban.
 */
async function replaceScopeStatuses(params: {
  scopeType: 'space' | 'folder' | 'list';
  scopeId: string;
  workspaceId: string;
  templateId: string;
  items: StatusTemplateItem[];
  synchronized: boolean;
}) {
  const { scopeType, scopeId, workspaceId, templateId, items, synchronized } = params;
  if (items.length === 0) return;

  const sortedItems = [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // 1. Etapas atuais do escopo
  const { data: existingRaw } = await supabase
    .from('statuses')
    .select('id, name, category')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId);

  const existing: ExistingStatus[] = existingRaw ?? [];

  // 2. Inserir as etapas do modelo
  const { data: insertedRaw, error: insertError } = await supabase
    .from('statuses')
    .insert(
      sortedItems.map((item, index) => ({
        workspace_id: workspaceId,
        scope_type: scopeType,
        scope_id: scopeId,
        name: item.name,
        color: item.color,
        order_index: index,
        is_default: item.is_default,
        category: item.category,
        template_id: synchronized ? templateId : null,
        template_item_id: synchronized ? item.id : null,
      }))
    )
    .select('id, name, category');

  if (insertError) throw insertError;
  const inserted: NewStatusRow[] = insertedRaw ?? [];

  // 3. Remapear tarefas das etapas antigas
  const byName = new Map(inserted.map(s => [normalizeName(s.name), s.id]));
  const byCategory = new Map<string, string>();
  for (const s of inserted) {
    if (s.category && !byCategory.has(s.category)) byCategory.set(s.category, s.id);
  }

  const preserved: string[] = [];

  for (const old of existing) {
    const target =
      byName.get(normalizeName(old.name)) ??
      (old.category ? byCategory.get(old.category) : undefined);

    if (target) {
      await supabase.from('tasks').update({ status_id: target }).eq('status_id', old.id);
      continue;
    }

    // Sem destino equivalente: só remove se não houver tarefas
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', old.id);

    if ((count ?? 0) > 0) {
      preserved.push(old.id);
    }
  }

  // 4. Remover as etapas antigas que não precisam ser preservadas
  const toDelete = existing.map(s => s.id).filter(id => !preserved.includes(id));
  if (toDelete.length > 0) {
    await supabase.from('statuses').delete().in('id', toDelete);
  }

  // 5. Reordenar as etapas preservadas para o fim
  for (let i = 0; i < preserved.length; i++) {
    await supabase
      .from('statuses')
      .update({ order_index: sortedItems.length + i, is_default: false })
      .eq('id', preserved[i]);
  }
}

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
      const { data: template, error: templateError } = await supabase
        .from('status_templates')
        .select('*, status_template_items(*)')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const items: StatusTemplateItem[] = (template.status_template_items ?? []) as StatusTemplateItem[];
      const link = synchronized
        ? { status_template_id: templateId, status_source: 'template' }
        : { status_template_id: null, status_source: 'custom' };

      let appliedCount = 0;

      // ---- Spaces ----
      for (const spaceId of spaceIds) {
        await supabase.from('spaces').update(link).eq('id', spaceId);
        await replaceScopeStatuses({
          scopeType: 'space',
          scopeId: spaceId,
          workspaceId: template.workspace_id,
          templateId,
          items,
          synchronized,
        });
        appliedCount++;
      }

      // ---- Folders ----
      for (const folderId of folderIds) {
        const { data: folder } = await supabase
          .from('folders')
          .select('space_id, spaces(workspace_id)')
          .eq('id', folderId)
          .single();

        await supabase.from('folders').update(link).eq('id', folderId);

        const folderWorkspaceId = (folder?.spaces as any)?.workspace_id ?? template.workspace_id;
        await replaceScopeStatuses({
          scopeType: 'folder',
          scopeId: folderId,
          workspaceId: folderWorkspaceId,
          templateId,
          items,
          synchronized,
        });
        appliedCount++;
      }

      // ---- Lists ----
      for (const listId of listIds) {
        const { data: list } = await supabase
          .from('lists')
          .select('workspace_id')
          .eq('id', listId)
          .single();

        await supabase.from('lists').update(link).eq('id', listId);

        await replaceScopeStatuses({
          scopeType: 'list',
          scopeId: listId,
          workspaceId: list?.workspace_id ?? template.workspace_id,
          templateId,
          items,
          synchronized,
        });
        appliedCount++;
      }

      // ---- Workspace ----
      if (workspaceId) {
        const { data: existingWs } = await supabase
          .from('statuses')
          .select('id, name, category')
          .eq('workspace_id', workspaceId)
          .eq('scope_type', 'workspace');

        const sortedItems = [...items].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

        const { data: insertedWs, error: wsInsertError } = await supabase
          .from('statuses')
          .insert(
            sortedItems.map((item, index) => ({
              workspace_id: workspaceId,
              scope_type: 'workspace' as const,
              scope_id: null,
              name: item.name,
              color: item.color,
              order_index: index,
              is_default: item.is_default,
              category: item.category,
              template_id: synchronized ? templateId : null,
              template_item_id: synchronized ? item.id : null,
            }))
          )
          .select('id, name, category');

        if (wsInsertError) throw wsInsertError;

        const wsByName = new Map((insertedWs ?? []).map(s => [normalizeName(s.name), s.id]));
        const wsByCategory = new Map<string, string>();
        for (const s of insertedWs ?? []) {
          if (s.category && !wsByCategory.has(s.category)) wsByCategory.set(s.category, s.id);
        }

        const preservedWs: string[] = [];
        for (const old of existingWs ?? []) {
          const target =
            wsByName.get(normalizeName(old.name)) ??
            (old.category ? wsByCategory.get(old.category) : undefined);

          if (target) {
            await supabase.from('tasks').update({ status_id: target }).eq('status_id', old.id);
            continue;
          }

          const { count } = await supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('status_id', old.id);

          if ((count ?? 0) > 0) preservedWs.push(old.id);
        }

        const wsToDelete = (existingWs ?? []).map(s => s.id).filter(id => !preservedWs.includes(id));
        if (wsToDelete.length > 0) {
          await supabase.from('statuses').delete().in('id', wsToDelete);
        }

        for (let i = 0; i < preservedWs.length; i++) {
          await supabase
            .from('statuses')
            .update({ order_index: sortedItems.length + i, is_default: false })
            .eq('id', preservedWs[i]);
        }

        appliedCount++;
      }

      return { templateId, appliedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: ['statuses-for-scope'] });
      queryClient.invalidateQueries({ queryKey: ['default-status-for-scope'] });
      queryClient.invalidateQueries({ queryKey: ['default-status'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
      const n = result?.appliedCount ?? 0;
      toast.success(`Modelo aplicado em ${n} ${n === 1 ? 'local' : 'locais'}!`);
    },
    onError: (error) => {
      toast.error('Erro ao aplicar modelo');
      console.error(error);
    },
  });
};
