import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoveFolderParams {
  folderId: string;
  spaceId: string;
}

export const useMoveFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, spaceId }: MoveFolderParams) => {
      const { error } = await supabase
        .from('folders')
        .update({
          space_id: spaceId,
          updated_at: new Date().toISOString()
        })
        .eq('id', folderId);

      if (error) throw error;

      return { folderId, spaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('Pasta movida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao mover pasta:', error);
      toast.error('Erro ao mover pasta');
    },
  });
};
