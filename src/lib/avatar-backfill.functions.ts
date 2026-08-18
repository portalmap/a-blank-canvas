import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Migra as fotos vindas do Hub para o storage local. Apenas administradores. */
export const backfillAvatarsFromHub = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: isSystemAdmin } = await supabase.rpc('is_system_admin', { _user_id: userId });
    let allowed = Boolean(isSystemAdmin);
    if (!allowed) {
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      allowed = Boolean(isAdmin);
    }
    if (!allowed) {
      const { data: wsAdmin } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .limit(1);
      allowed = (wsAdmin?.length ?? 0) > 0;
    }
    if (!allowed) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { backfillHubAvatars } = await import('./avatar-sync.server');
    return backfillHubAvatars(supabaseAdmin as any);
  });
