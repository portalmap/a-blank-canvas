import { AutomationCard } from './AutomationCard';
import { useAutomations } from '@/hooks/useAutomations';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AutomationsListProps {
  workspaceId: string;
}

export function AutomationsList({ workspaceId }: AutomationsListProps) {
  const { data: automations, isLoading } = useAutomations(workspaceId);

  // Fetch all profiles for displaying user names
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      if (error) throw error;
      return data;
    },
  });

  const getUserInfo = (userId?: string) => {
    if (!userId) return { name: undefined, avatar: undefined };
    const profile = profiles.find(p => p.id === userId);
    return { 
      name: profile?.full_name || undefined, 
      avatar: profile?.avatar_url || undefined 
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!automations || automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Zap className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Nenhuma automação configurada</h3>
        <p className="text-muted-foreground mt-1 max-w-sm">
          Crie sua primeira automação para atribuir automaticamente responsáveis e seguidores às tarefas.
        </p>
      </div>
    );
  }

  // Group automations by type
  const assignAutomations = automations.filter(a => a.action_type === 'auto_assign_user');
  const followerAutomations = automations.filter(a => a.action_type === 'auto_add_follower');

  return (
    <div className="space-y-8">
      {/* Assign Automations */}
      {assignAutomations.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Atribuição de Responsável ({assignAutomations.length})
          </h3>
          <div className="space-y-2">
            {assignAutomations.map((automation) => {
              const actionConfig = automation.action_config as Record<string, any> | null;
              const userInfo = getUserInfo(actionConfig?.user_id);
              return (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  userName={userInfo.name}
                  userAvatar={userInfo.avatar}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Follower Automations */}
      {followerAutomations.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Adicionar Seguidor ({followerAutomations.length})
          </h3>
          <div className="space-y-2">
            {followerAutomations.map((automation) => {
              const actionConfig = automation.action_config as Record<string, any> | null;
              const userInfo = getUserInfo(actionConfig?.user_id);
              return (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  userName={userInfo.name}
                  userAvatar={userInfo.avatar}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
