import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCanCreateWorkspace = () => {
  return useQuery({
    queryKey: ['can-create-workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['global_owner', 'owner', 'admin'])
        .maybeSingle();

      if (error) {
        console.error('Error checking workspace creation permission:', error);
        return false;
      }

      return !!data;
    },
  });
};
