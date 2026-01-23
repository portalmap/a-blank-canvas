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
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number }[];
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
  lists?: { folderRefIndex?: number; name: string; description: string | null; default_view: string; order_index: number }[];
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
        // Delete existing folders (cascades to lists and tasks)
        await supabase.from('space_template_folders').delete().eq('template_id', id);
        await supabase.from('space_template_lists').delete().eq('template_id', id).is('folder_ref_id', null);
        await supabase.from('space_template_tasks').delete().eq('template_id', id);

        // Create new folders
        const folderIdMap: Record<number, string> = {};
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
          });
        }

        // Create new lists
        const listIdMap: Record<number, string> = {};
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
              }))
            )
            .select();

          if (listsError) throw listsError;
          createdLists?.forEach((l, i) => {
            listIdMap[i] = l.id;
          });
        }

        // Create new tasks
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

      // Create space with retry on RLS errors (handles token refresh race condition)
      let space: { id: string; name: string } | null = null;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= 2; attempt++) {
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .insert({
            workspace_id: workspaceId,
            name: spaceName,
            description: spaceDescription,
            color: spaceColor,
          })
          .select()
          .single();

        if (!spaceError && spaceData) {
          space = spaceData;
          break;
        }

        // If RLS error and not last attempt, try refresh token
        if (spaceError?.code === '42501' && attempt < 2) {
          console.warn(`RLS error on spaces, refreshing session (attempt ${attempt + 1})`);
          await supabase.auth.refreshSession();
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          lastError = spaceError;
          continue;
        }

        throw spaceError;
      }

      if (!space) {
        throw lastError || new Error('Falha ao criar space após tentativas');
      }

      // Map template folder IDs to real folder IDs
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        for (const folder of foldersResult.data) {
          const { data: newFolder, error: folderError } = await supabase
            .from('folders')
            .insert({
              space_id: space.id,
              name: `${folder.name.trim()} | ${companyName}`,
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
              name: `${list.name.trim()} | ${companyName}`,
              description: list.description,
              default_view: list.default_view as 'list' | 'kanban' | 'sprint',
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
