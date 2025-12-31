import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoveListParams {
  listId: string;
  workspaceId: string;
  spaceId: string;
  folderId?: string | null;
}

export const useMoveList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, workspaceId, spaceId, folderId }: MoveListParams) => {
      // Update the list's location
      const { error: listError } = await supabase
        .from('lists')
        .update({
          workspace_id: workspaceId,
          space_id: spaceId,
          folder_id: folderId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', listId);

      if (listError) throw listError;

      // Update workspace_id of all tasks in this list
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({
          workspace_id: workspaceId,
          updated_at: new Date().toISOString()
        })
        .eq('list_id', listId);

      if (tasksError) throw tasksError;

      return { listId, workspaceId, spaceId, folderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Lista movida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao mover lista:', error);
      toast.error('Erro ao mover lista');
    },
  });
};
