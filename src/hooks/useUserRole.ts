import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type WorkspaceRole = 'admin' | 'member' | 'limited_member' | 'guest';

export const useUserRole = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['user-role', user?.id, activeWorkspace?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, isGlobalOwner: false, isOwner: false, isGuest: false, role: null, workspaceRole: 'member' as WorkspaceRole };

      // 1. Verificar roles globais (user_roles)
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isGlobalOwner = globalRoles?.some(r => r.role === 'global_owner') ?? false;
      const isOwner = globalRoles?.some(r => r.role === 'owner') ?? false;
      const isGlobalAdmin = globalRoles?.some(r => r.role === 'admin') ?? false;

      // Se tem role global de admin+, já é admin
      if (isGlobalOwner || isOwner || isGlobalAdmin) {
        return { isAdmin: true, isGlobalOwner, isOwner, isGuest: false, role: 'admin' as const, workspaceRole: 'admin' as WorkspaceRole };
      }

      // 2. Verificar role no workspace ativo
      if (activeWorkspace) {
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('workspace_id', activeWorkspace.id)
          .single();

        const wsRole = (membership?.role as WorkspaceRole) || 'member';

        if (wsRole === 'admin') {
          return { isAdmin: true, isGlobalOwner: false, isOwner: false, isGuest: false, role: 'admin' as const, workspaceRole: wsRole };
        }

        return { isAdmin: false, isGlobalOwner: false, isOwner: false, isGuest: wsRole === 'guest', role: wsRole as any, workspaceRole: wsRole };
      }

      return { isAdmin: false, isGlobalOwner: false, isOwner: false, isGuest: false, role: 'member' as const, workspaceRole: 'member' as WorkspaceRole };
    },
    enabled: !!user,
  });
};
