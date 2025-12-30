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
  workspace_id: string;
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

export const useSpaceTemplates = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['space-templates', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('space_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SpaceTemplate[];
    },
    enabled: !!workspaceId,
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

export const useSpaceTemplatesWithStructure = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['space-templates-structure', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: templates, error } = await supabase
        .from('space_templates')
        .select('*')
        .eq('workspace_id', workspaceId)
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
    enabled: !!workspaceId,
  });
};

interface CreateSpaceTemplateInput {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  folders?: Omit<SpaceTemplateFolder, 'id' | 'template_id'>[];
  lists?: (Omit<SpaceTemplateList, 'id' | 'template_id'> & { folderRefIndex?: number })[];
  tasks?: (Omit<SpaceTemplateTask, 'id' | 'template_id' | 'list_ref_id'> & { listRefIndex: number })[];
}

export const useCreateSpaceTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      description,
      color,
      folders = [],
      lists = [],
      tasks = [],
    }: CreateSpaceTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('space_templates')
        .insert({
          workspace_id: workspaceId,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['space-templates', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure', variables.workspaceId] });
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
                list_ref_id: 'listRefIndex' in t ? listIdMap[t.listRefIndex] : t.list_ref_id,
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
      queryClient.invalidateQueries({ queryKey: ['space-templates', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure', data.workspace_id] });
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
      const { data: template, error: fetchError } = await supabase
        .from('space_templates')
        .select('workspace_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase.from('space_templates').delete().eq('id', id);
      if (error) throw error;

      return template.workspace_id;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['space-templates', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure', workspaceId] });
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

      // Create new template
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from('space_templates')
        .insert({
          workspace_id: original.workspace_id,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['space-templates', data.workspace_id] });
      queryClient.invalidateQueries({ queryKey: ['space-templates-structure', data.workspace_id] });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Fetch template structure
      const [foldersResult, listsResult, tasksResult] = await Promise.all([
        supabase.from('space_template_folders').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_lists').select('*').eq('template_id', templateId).order('order_index'),
        supabase.from('space_template_tasks').select('*').eq('template_id', templateId).order('order_index'),
      ]);

      // Get default status for workspace
      const { data: defaultStatus } = await supabase
        .from('statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('is_default', true)
        .single();

      if (!defaultStatus) throw new Error('Status padrão não encontrado');

      // Create space
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .insert({
          workspace_id: workspaceId,
          name: spaceName,
          description: spaceDescription,
          color: spaceColor,
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Map template folder IDs to real folder IDs
      const folderIdMap: Record<string, string> = {};
      if (foldersResult.data && foldersResult.data.length > 0) {
        for (const folder of foldersResult.data) {
          const { data: newFolder, error: folderError } = await supabase
            .from('folders')
            .insert({
              space_id: space.id,
              name: folder.name,
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
              name: list.name,
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
    onError: (error) => {
      toast.error('Erro ao aplicar template');
      console.error(error);
    },
  });
};
