import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SpaceTemplateFolder {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  order_index: number;
}

export interface SpaceTemplateList {
  id: string;
  template_id: string;
  folder_ref_id: string | null;
  name: string;
  description: string | null;
  default_view: string;
  order_index: number;
  status_template_id: string | null;
}

export interface SpaceTemplateTask {
  id: string;
  template_id: string;
  list_ref_id: string;
  title: string;
  description: string | null;
  priority: string;
  order_index: number;
}

export interface SpaceTemplate {
  id: string;
  workspace_id: string | null;
  created_by_user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  folders?: SpaceTemplateFolder[];
  lists?: SpaceTemplateList[];
  tasks?: SpaceTemplateTask[];
}

// Buscar TODOS os templates (globais)
export const useSpaceTemplates = () => {
  return useQuery({
    queryKey: ['space-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('space_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SpaceTemplate[];
    },
  });
};

export const useSpaceTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ['space-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const [templateResult, foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_templates').select('*').eq('id', templateId).single(),
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      if (templateResult.error) throw templateResult.error;

      return {
        ...templateResult.data,
        folders: foldersResult.data || [],
        lists: listsResult.data || [],
        tasks: tasksResult.data || [],
      } as SpaceTemplate;
    },
    enabled: !!templateId,
  });
};

// Buscar TODOS os templates com contagens (globais)
export const useSpaceTemplatesWithStructure = () => {
  return useQuery({
    queryKey: ['space-templates-structure'],
    queryFn: async () => {
      const { data: templates, error } = await supabase
        .from('space_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const templatesWithCounts = await Promise.all(
        (templates || []).map(async (template) => {
          const [foldersResult, listsResult, tasksResult] = await Promise.all([
            supabase.from('space_template_folders').select('id').eq('template_id', template.id),
            supabase.from('space_template_lists').select('id').eq('template_id', template.id),
            supabase.from('space_template_tasks').select('id').eq('template_id', template.id),
          ]);

          return {
            ...template,
            folderCount: foldersResult.data?.length || 0,
            listCount: listsResult.data?.length || 0,
            taskCount: tasksResult.data?.length || 0,
          };
        })
      );

      return templatesWithCounts;
    },
  });
};

interface CreateSpaceTemplateInput {
  name: string;
  description?: string;
  color?: string;
  folders?: { name: string; description: string | null; order_index: number }[];
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number; status_template_id?: string | null }[];
  tasks?: { listRefIndex: number; title: string; description: string | null; priority: string; order_index: number }[];
}

export const useCreateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      color,
      folders = [],
      lists = [],
      tasks = [],
    }: CreateSpaceTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create template (global - sem workspace_id)
      const { data: template, error: templateError } = await supabase
        .from('space_templates')
        .insert({
          created_by_user_id: user.id,
          name,
          description,
          color,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create folders
      const folderIdMap: Record<number, string> = {};
      if (folders.length > 0) {
        const { data: createdFolders, error: foldersError } = await supabase
          .from('space_template_folders')
          .insert(folders.map((f) => ({ ...f, template_id: template.id })))
          .select();

        if (foldersError) throw foldersError;
        createdFolders?.forEach((f, i) => {
          folderIdMap[i] = f.id;
        });
      }

      // Create lists
      const listIdMap: Record<number, string> = {};
      if (lists.length > 0) {
        const { data: createdLists, error: listsError } = await supabase
          .from('space_template_lists')
          .insert(
            lists.map((l) => ({
              template_id: template.id,
              folder_ref_id: l.folderRefIndex !== undefined ? folderIdMap[l.folderRefIndex] : null,
              name: l.name,
              description: l.description,
              default_view: l.default_view,
              order_index: l.order_index,
              status_template_id: l.status_template_id || null,
            }))
          )
          .select();

        if (listsError) throw listsError;
        createdLists?.forEach((l, i) => {
          listIdMap[i] = l.id;
        });
      }

      // Create tasks
      if (tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('space_template_tasks')
          .insert(
            tasks.map((t) => ({
              template_id: template.id,
              list_ref_id: listIdMap[t.listRefIndex],
              title: t.title,
              description: t.description,
              priority: t.priority,
              order_index: t.order_index,
            }))
          );

        if (tasksError) throw tasksError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar template');
      console.error(error);
    },
  });
};

interface UpdateSpaceTemplateInput {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  folders?: { name: string; description: string | null; order_index: number }[];
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number; status_template_id?: string | null }[];
  tasks?: { listRefIndex: number; title: string; description: string | null; priority: string; order_index: number }[];
}

export const useUpdateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description, color, folders, lists, tasks }: UpdateSpaceTemplateInput) => {
      // Update template
      const { data: template, error: templateError } = await supabase
        .from('space_templates')
        .update({ name, description, color })
        .eq('id', id)
        .select()
        .single();

      if (templateError) throw templateError;

      if (folders !== undefined) {
        // ========== STEP 1: Capture existing automations and structure BEFORE deletion ==========
        const [automationsResult, existingFoldersResult, existingListsResult] = await Promise.all([
          supabase.from('space_template_automations').select('*').eq('template_id', id),
          supabase.from('space_template_folders').select('id, name').eq('template_id', id),
          supabase.from('space_template_lists').select('id, name, folder_ref_id').eq('template_id', id),
        ]);

        const existingAutomations = automationsResult.data || [];
        const existingFolders = existingFoldersResult.data || [];
        const existingLists = existingListsResult.data || [];

        // Create maps: old ID → name
        const folderIdToName: Record<string, string> = {};
        existingFolders.forEach(f => { folderIdToName[f.id] = f.name; });

        const listIdToName: Record<string, string> = {};
        existingLists.forEach(l => { listIdToName[l.id] = l.name; });

        // ========== STEP 2: Delete existing structure (cascade deletes automations) ==========
        await supabase.from('space_template_folders').delete().eq('template_id', id);
        await supabase.from('space_template_lists').delete().eq('template_id', id).is('folder_ref_id', null);
        await supabase.from('space_template_tasks').delete().eq('template_id', id);

        // ========== STEP 3: Create new folders ==========
        const folderIdMap: Record<number, string> = {};
        const folderNameToNewId: Record<string, string> = {};
        if (folders.length > 0) {
          const { data: createdFolders, error: foldersError } = await supabase
            .from('space_template_folders')
            .insert(folders.map((f) => ({
              template_id: id,
              name: f.name,
              description: f.description,
              order_index: f.order_index,
            })))
            .select();

          if (foldersError) throw foldersError;
          createdFolders?.forEach((f, i) => {
            folderIdMap[i] = f.id;
            folderNameToNewId[f.name] = f.id;
          });
        }

        // ========== STEP 4: Create new lists ==========
        const listIdMap: Record<number, string> = {};
        const listNameToNewId: Record<string, string> = {};
        if (lists && lists.length > 0) {
          const { data: createdLists, error: listsError } = await supabase
            .from('space_template_lists')
            .insert(
              lists.map((l) => ({
                template_id: id,
                folder_ref_id: 'folderRefIndex' in l && l.folderRefIndex !== undefined 
                  ? folderIdMap[l.folderRefIndex] 
                  : null,
                name: l.name,
                description: l.description,
                default_view: l.default_view,
                order_index: l.order_index,
                status_template_id: l.status_template_id || null,
              }))
            )
            .select();

          if (listsError) throw listsError;
          createdLists?.forEach((l, i) => {
            listIdMap[i] = l.id;
            listNameToNewId[l.name] = l.id;
          });
        }

        // ========== STEP 5: Create new tasks ==========
        if (tasks && tasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('space_template_tasks')
            .insert(
              tasks.map((t) => ({
                template_id: id,
                list_ref_id: listIdMap[t.listRefIndex],
                title: t.title,
                description: t.description,
                priority: t.priority,
                order_index: t.order_index,
              }))
            );

          if (tasksError) throw tasksError;
        }

        // ========== STEP 6: Remap and restore automations ==========
        if (existingAutomations.length > 0) {
          const remappedAutomations = existingAutomations.map(automation => {
            // Remap folder_ref_id
            let newFolderRefId: string | null = null;
            if (automation.folder_ref_id && folderIdToName[automation.folder_ref_id]) {
              const folderName = folderIdToName[automation.folder_ref_id];
              newFolderRefId = folderNameToNewId[folderName] || null;
            }

            // Remap list_ref_id
            let newListRefId: string | null = null;
            if (automation.list_ref_id && listIdToName[automation.list_ref_id]) {
              const listName = listIdToName[automation.list_ref_id];
              newListRefId = listNameToNewId[listName] || null;
            }

            // Deep clone action_config and remap target_list_id inside actions
            const remappedActionConfig = JSON.parse(JSON.stringify(automation.action_config || {}));
            if (remappedActionConfig.actions && Array.isArray(remappedActionConfig.actions)) {
              remappedActionConfig.actions = remappedActionConfig.actions.map((action: { type: string; config?: { target_list_id?: string } }) => {
                if (action.type === 'move_task' && action.config?.target_list_id) {
                  const oldListId = action.config.target_list_id;
                  if (listIdToName[oldListId]) {
                    const listName = listIdToName[oldListId];
                    action.config.target_list_id = listNameToNewId[listName] || oldListId;
                  }
                }
                return action;
              });
            }

            return {
              template_id: id,
              description: automation.description,
              trigger: automation.trigger,
              action_type: automation.action_type,
              action_config: remappedActionConfig,
              scope_type: automation.scope_type,
              folder_ref_id: newFolderRefId,
              list_ref_id: newListRefId,
              enabled: automation.enabled,
            };
          }).filter(a => {
            // Filter out automations that lost their reference (folder/list was removed)
            if (a.scope_type === 'list' && !a.list_ref_id) return false;
            if (a.scope_type === 'folder' && !a.folder_ref_id) return false;
            return true;
          });

          if (remappedAutomations.length > 0) {
            const { error: automationsError } = await supabase
              .from('space_template_automations')
              .insert(remappedAutomations);

            if (automationsError) {
              console.error('Error restoring automations:', automationsError);
              // Don't throw - automations are secondary, main update succeeded
            }
          }
        }
      }

      return template;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      queryClient.invalidateQueries({ queryKey: ['space-template', data.id] });
      toast.success('Template atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar template');
      console.error(error);
    },
  });
};

export const useDeleteSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('space_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir template');
      console.error(error);
    },
  });
};

export const useDuplicateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch original template with structure
      const [templateResult, foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_templates').select('*').eq('id', templateId).single(),
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      if (templateResult.error) throw templateResult.error;

      const original = templateResult.data;

      // Create new template (global - sem workspace_id)
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from('space_templates')
        .insert({
          created_by_user_id: user.id,
          name: `${original.name} (cópia)`,
          description: original.description,
          color: original.color,
        })
        .select()
        .single();

      if (newTemplateError) throw newTemplateError;

      // Map old folder IDs to new ones
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        const { data: newFolders, error: foldersError } = await supabase
          .from('space_template_folders')
          .insert(
            foldersResult.data.map((f) => ({
              template_id: newTemplate.id,
              name: f.name,
              description: f.description,
              order_index: f.order_index,
            }))
          )
          .select();

        if (foldersError) throw foldersError;
        foldersResult.data.forEach((oldFolder, i) => {
          if (newFolders?.[i]) {
            folderIdMap[oldFolder.id] = newFolders[i].id;
          }
        });
      }

      // Map old list IDs to new ones
      const listIdMap: Record<string, string> = {};
      if (listsResult.data && listsResult.data.length > 0) {
        const { data: newLists, error: listsError } = await supabase
          .from('space_template_lists')
          .insert(
            listsResult.data.map((l) => ({
              template_id: newTemplate.id,
              folder_ref_id: l.folder_ref_id ? folderIdMap[l.folder_ref_id] : null,
              name: l.name,
              description: l.description,
              default_view: l.default_view,
              order_index: l.order_index,
              status_template_id: l.status_template_id || null,
            }))
          )
          .select();

        if (listsError) throw listsError;
        listsResult.data.forEach((oldList, i) => {
          if (newLists?.[i]) {
            listIdMap[oldList.id] = newLists[i].id;
          }
        });
      }

      // Copy tasks
      if (tasksResult.data && tasksResult.data.length > 0) {
        const { error: tasksError } = await supabase
          .from('space_template_tasks')
          .insert(
            tasksResult.data.map((t) => ({
              template_id: newTemplate.id,
              list_ref_id: listIdMap[t.list_ref_id],
              title: t.title,
              description: t.description,
              priority: t.priority,
              order_index: t.order_index,
            }))
          );

        if (tasksError) throw tasksError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['space-templates'] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure'] });
      toast.success('Template duplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar template');
      console.error(error);
    },
  });
};

interface ApplySpaceTemplateInput {
  templateId: string;
  workspaceId: string;
  spaceName: string;
  spaceDescription?: string;
  spaceColor?: string;
}

export const useApplySpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      workspaceId,
      spaceName,
      spaceDescription,
      spaceColor,
    }: ApplySpaceTemplateInput) => {
      // Robust session verification with token refresh if needed
      let user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.user) {
          throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }
        user = refreshData.session.user;
      }

      // Check global roles first (global_owner, owner, admin have permission everywhere)
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasGlobalPermission = globalRoles?.some(r => 
        ['global_owner', 'owner', 'admin'].includes(r.role)
      );

      // If no global permission, verify workspace membership
      if (!hasGlobalPermission) {
        const { data: membership, error: membershipError } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single();

        if (!membership || membershipError) {
          throw new Error('Você não tem permissão para criar Spaces neste workspace. Por favor, selecione outro workspace.');
        }

        if (!['admin', 'member'].includes(membership.role)) {
          throw new Error('Apenas administradores e membros podem criar Spaces.');
        }
      }

      // Fetch template structure
      const [foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      // Get default status for workspace (filter by scope_type to avoid multiple results)
      const { data: defaultStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('scope_type', 'workspace')
        .eq('is_default', true)
        .single();

      if (!defaultStatus) throw new Error('Status padrão não encontrado');

      // Extract company name from spaceName
      const extractCompanyName = (name: string): string => {
        const parts = name.split('|');
        return parts.length > 1 ? parts[parts.length - 1].trim() : name.trim();
      };
      const companyName = extractCompanyName(spaceName);

      // Create space using secure RPC function to bypass RLS issues
      const { data: spaceId, error: spaceError } = await supabase
        .rpc('create_space_secure', {
          p_workspace_id: workspaceId,
          p_name: spaceName,
          p_description: spaceDescription || null,
          p_color: spaceColor || null,
        });

      if (spaceError) {
        console.error('Erro ao criar space via RPC:', spaceError);
        throw new Error('Erro de permissão. Sua sessão pode ter expirado. Tente novamente.');
      }

      // Fetch the created space to get full data
      const { data: spaceData, error: fetchError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', spaceId)
        .single();

      if (fetchError || !spaceData) {
        throw new Error('Space criado mas não foi possível recuperar os dados');
      }

      const space = spaceData;

      // Map template folder IDs to real folder IDs
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        for (const folder of foldersResult.data) {
          const { data: newFolder, error: folderError } = await supabase
            .from('folders')
            .insert({
              space_id: space.id,
              // IMPORTANT: Do NOT trim or add " | " - template name already includes " | " at the end
              name: `${folder.name}${companyName}`,
              description: folder.description,
            })
            .select()
            .single();

          if (folderError) throw folderError;
          folderIdMap[folder.id] = newFolder.id;
        }
      }

      // Map template list IDs to real list IDs
      const listIdMap: Record<string, string> = {};
      if (listsResult.data && listsResult.data.length > 0) {
        for (const list of listsResult.data) {
          const { data: newList, error: listError } = await supabase
            .from('lists')
            .insert({
              workspace_id: workspaceId,
              space_id: space.id,
              folder_id: list.folder_ref_id ? folderIdMap[list.folder_ref_id] : null,
              // IMPORTANT: Do NOT trim or add " | " - template name already includes " | " at the end
              name: `${list.name}${companyName}`,
              description: list.description,
              default_view: list.default_view as 'list' | 'kanban' | 'sprint',
              // Apply status template if configured
              status_template_id: list.status_template_id || null,
              status_source: list.status_template_id ? 'template' : 'inherit',
            })
            .select()
            .single();

          if (listError) throw listError;
          listIdMap[list.id] = newList.id;
        }
      }

      // Create tasks
      if (tasksResult.data && tasksResult.data.length > 0) {
        for (const task of tasksResult.data) {
          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              workspace_id: workspaceId,
              list_id: listIdMap[task.list_ref_id],
              title: task.title,
              description: task.description,
              priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
              status_id: defaultStatus.id,
              created_by_user_id: user.id,
            });

          if (taskError) throw taskError;
        }
      }

      // Fetch template automations and create real automations
      const { data: templateAutomations } = await supabase
        .from('space_template_automations')
        .select('*')
        .eq('template_id', templateId)
        .eq('enabled', true);

      if (templateAutomations && templateAutomations.length > 0) {
        for (const automation of templateAutomations) {
          let scopeType: 'workspace' | 'space' | 'folder' | 'list';
          let scopeId: string;

          if (automation.scope_type === 'space') {
            scopeType = 'space';
            scopeId = space.id;
          } else if (automation.scope_type === 'folder' && automation.folder_ref_id) {
            scopeType = 'folder';
            scopeId = folderIdMap[automation.folder_ref_id];
          } else if (automation.scope_type === 'list' && automation.list_ref_id) {
            scopeType = 'list';
            scopeId = listIdMap[automation.list_ref_id];
          } else {
            // Default to space if scope not properly set
            scopeType = 'space';
            scopeId = space.id;
          }

          // Only create if we have a valid scopeId
          if (scopeId) {
            await supabase.from('automations').insert({
              workspace_id: workspaceId,
              description: automation.description,
              trigger: automation.trigger,
              action_type: automation.action_type,
              action_config: automation.action_config,
              scope_type: scopeType,
              scope_id: scopeId,
              enabled: true,
            });
          }
        }
      }

      return space;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.workspaceId] });
      toast.success('Space criado a partir do template!');
    },
    onError: (error: any) => {
      console.error('Erro ao aplicar template:', error);
      
      if (error.code === '42501') {
        toast.error('Erro de permissão. Sua sessão pode ter expirado. Tente novamente.');
      } else if (error.message?.includes('Sessão expirada')) {
        toast.error('Sua sessão expirou. Faça login novamente.');
      } else if (error.message?.includes('permissão')) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao aplicar template. Tente novamente.');
      }
    },
  });
};
