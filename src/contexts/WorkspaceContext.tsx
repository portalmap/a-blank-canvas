import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  clearActiveWorkspace: () => void;
  isWorkspaceSelected: boolean;
  isValidatingWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'active-workspace';

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isValidatingWorkspace, setIsValidatingWorkspace] = useState(true);
  const [hasCheckedDefault, setHasCheckedDefault] = useState(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setActiveWorkspace = (workspace: Workspace | null) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearActiveWorkspace = () => {
    setActiveWorkspaceState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Clear workspace when user logs out
  useEffect(() => {
    if (!user) {
      clearActiveWorkspace();
    }
  }, [user]);

  // Auto-load default workspace if no workspace is active
  useEffect(() => {
    const loadDefaultWorkspace = async () => {
      // Wait for auth to finish loading
      if (authLoading || !user || activeWorkspace || hasCheckedDefault) {
        return;
      }

      setHasCheckedDefault(true);

      // Fetch default workspace from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

      if (profile?.default_workspace_id) {
        // Fetch full workspace data
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', profile.default_workspace_id)
          .single();

        if (workspace) {
          // Verify membership before auto-selecting
          const { data: membership } = await supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspace.id)
            .eq('user_id', user.id)
            .single();

          if (membership && ['admin', 'member'].includes(membership.role)) {
            setActiveWorkspace(workspace);
          }
        }
      }
    };

    loadDefaultWorkspace();
  }, [authLoading, user?.id, activeWorkspace, hasCheckedDefault]);

  // Validate workspace membership when loading from localStorage
  useEffect(() => {
    const validateWorkspaceMembership = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        setIsValidatingWorkspace(true);
        return;
      }

      if (!user) {
        setIsValidatingWorkspace(false);
        return;
      }

      if (!activeWorkspace) {
        setIsValidatingWorkspace(false);
        return;
      }

      setIsValidatingWorkspace(true);

      // Check global roles first (global_owner, owner, admin have access everywhere)
      const { data: globalRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasGlobalPermission = globalRoles?.some(r => 
        ['global_owner', 'owner', 'admin'].includes(r.role)
      );

      // If has global permission, skip workspace membership check
      if (hasGlobalPermission) {
        setIsValidatingWorkspace(false);
        return;
      }

      // Check workspace membership
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', activeWorkspace.id)
        .eq('user_id', user.id)
        .single();
      
      // If user is not a member with valid role, clear the stored workspace
      if (!membership || !['admin', 'member'].includes(membership.role)) {
        clearActiveWorkspace();
      }

      setIsValidatingWorkspace(false);
    };
    
    validateWorkspaceMembership();
  }, [authLoading, user?.id, activeWorkspace?.id]);

  const isWorkspaceSelected = activeWorkspace !== null;

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        clearActiveWorkspace,
        isWorkspaceSelected,
        isValidatingWorkspace: authLoading || isValidatingWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
