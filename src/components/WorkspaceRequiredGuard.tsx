import { ReactNode, useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaces, useSetDefaultWorkspace } from '@/hooks/useWorkspaces';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from '@/lib/router-compat';

export const WorkspaceRequiredGuard = ({ children }: { children: ReactNode }) => {
  const { activeWorkspace, setActiveWorkspace, isLoadingDefault } = useWorkspace();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const setDefaultWorkspace = useSetDefaultWorkspace();
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasGlobalPermission, setHasGlobalPermission] = useState<boolean | null>(null);

  const noWorkspaces = !isLoadingDefault && !isLoadingWorkspaces && (!workspaces || workspaces.length === 0);

  // Check global role only when there are no workspaces
  useEffect(() => {
    let cancelled = false;
    if (!noWorkspaces || !user) return;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (cancelled) return;
      const allowed = data?.some((r) => ['global_owner', 'owner', 'admin'].includes(r.role)) ?? false;
      setHasGlobalPermission(allowed);
    })();
    return () => { cancelled = true; };
  }, [noWorkspaces, user?.id]);

  // Redirect global admins to /workspaces so they can create the first one
  useEffect(() => {
    if (noWorkspaces && hasGlobalPermission && location.pathname !== '/workspaces') {
      navigate({ to: '/workspaces', replace: true });
    }
  }, [noWorkspaces, hasGlobalPermission, location.pathname]);

  // Auto-select if only 1 workspace
  useEffect(() => {
    if (!isLoadingDefault && !activeWorkspace && !isLoadingWorkspaces && workspaces && workspaces.length === 1 && !autoSelected) {
      setAutoSelected(true);
      setActiveWorkspace(workspaces[0]);
    }
  }, [isLoadingDefault, activeWorkspace, isLoadingWorkspaces, workspaces, autoSelected]);

  // Still loading
  if (isLoadingDefault || isLoadingWorkspaces) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Workspace is active, render children
  if (activeWorkspace) {
    return <>{children}</>;
  }

  // No workspaces at all
  if (!workspaces || workspaces.length === 0) {
    // Global admins: allow through (they'll be redirected to /workspaces),
    // and let /workspaces itself render so they can create one.
    if (hasGlobalPermission === null) {
      return (
        <div className="flex items-center justify-center h-screen w-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (hasGlobalPermission) {
      if (location.pathname === '/workspaces') {
        return <>{children}</>;
      }
      return (
        <div className="flex items-center justify-center h-screen w-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p className="text-muted-foreground">Nenhum workspace disponível. Contate o administrador.</p>
      </div>
    );
  }

  // Multiple workspaces - show selection dialog
  const handleSelect = (workspace: typeof workspaces[0]) => {
    setActiveWorkspace(workspace);
    if (setAsDefault) {
      setDefaultWorkspace.mutate(workspace.id);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-md [&>button[class*='absolute']]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Selecione um Workspace</DialogTitle>
          <DialogDescription>
            Escolha o workspace que deseja acessar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span className="font-medium">{ws.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="set-default"
            checked={setAsDefault}
            onCheckedChange={(checked) => setSetAsDefault(checked === true)}
          />
          <label htmlFor="set-default" className="text-sm text-muted-foreground cursor-pointer">
            Definir como padrão para próximas vezes
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};
