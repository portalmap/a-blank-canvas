import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCard } from "./UserCard";
import { UserFilters } from "./UserFilters";
import { UserEditDialog } from "./UserEditDialog";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserPermissionsDialog } from "./UserPermissionsDialog";
import { UserAddDialog } from "./UserAddDialog";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Loader2, UserPlus, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

const VALID_WORKSPACE_ROLES: WorkspaceRole[] = ['admin', 'member', 'limited_member', 'guest'];

const isValidWorkspaceRole = (role: any): role is WorkspaceRole => {
  return VALID_WORKSPACE_ROLES.includes(role);
};

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  workspace_id: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "all" | "global_owner" | "owner">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "role">("name");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<any | null>(null);

  // Verificar se é administrador do sistema (global_owner ou owner)
  const { data: userRoles } = useQuery({
    queryKey: ["user-system-roles", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser?.id)
        .in("role", ["global_owner", "owner"]);

      if (error) throw error;
      
      return {
        isGlobalOwner: data?.some(r => r.role === "global_owner") || false,
        isOwner: data?.some(r => r.role === "owner") || false,
        isSystemAdmin: (data?.length || 0) > 0,
      };
    },
    enabled: !!currentUser?.id,
  });

  const isSystemAdmin = userRoles?.isSystemAdmin || false;
  const isGlobalOwner = userRoles?.isGlobalOwner || false;

  // Buscar workspace atual do usuário (ou primeiro workspace para system admins)
  const { data: currentWorkspace } = useQuery({
    queryKey: ["current-workspace", currentUser?.id, isSystemAdmin],
    queryFn: async () => {
      if (isSystemAdmin) {
        // Para system admins, buscar o primeiro workspace disponível
        const { data, error } = await supabase
          .from("workspaces")
          .select("id")
          .limit(1)
          .single();
        
        if (error) throw error;
        return { workspace_id: data.id, role: 'admin' as const };
      } else {
        // Para usuários normais, buscar seu workspace
        const { data, error } = await supabase
          .from("workspace_members")
          .select("workspace_id, role")
          .eq("user_id", currentUser?.id)
          .single();

        if (error) throw error;
        return data;
      }
    },
    enabled: !!currentUser?.id,
  });

  // Buscar membros (todos se for system admin, ou do workspace específico)
  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members-detailed", currentWorkspace?.workspace_id, isSystemAdmin],
    queryFn: async () => {
      // Se for administrador do sistema, buscar TODOS os usuários
      if (isSystemAdmin) {
        // Buscar todos os usuários usando a nova função
        const { data: allUsers, error: usersError } = await supabase.rpc(
          "get_all_users_for_system_admin"
        );

        if (usersError) throw usersError;
        if (!allUsers) return [];

        const userIds = allUsers.map((u: any) => u.user_id);

        // Buscar perfis
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Buscar roles de workspace (se existirem)
        const { data: workspaceMembersData } = await supabase
          .from("workspace_members")
          .select("*")
          .in("user_id", userIds);

        // Buscar papéis globais (global_owner e owner)
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("*")
          .in("user_id", userIds);
        
        // Combinar dados
        return allUsers.map((user: any) => {
          const profile = profilesData?.find(p => p.id === user.user_id);
          const workspaceMember = workspaceMembersData?.find(m => m.user_id === user.user_id);
          const globalRole = rolesData?.find(r => r.user_id === user.user_id && r.role === "global_owner");
          const ownerRole = rolesData?.find(r => r.user_id === user.user_id && r.role === "owner");
          
          return {
            id: workspaceMember?.id || user.user_id,
            user_id: user.user_id,
            role: workspaceMember?.role || "guest" as WorkspaceRole,
            created_at: user.created_at,
            workspace_id: workspaceMember?.workspace_id || null,
            profile: profile || { full_name: null, avatar_url: null, phone: null, bio: null },
            email: user.email || profile?.full_name || "Sem email",
            isGlobalOwner: !!globalRole,
            isOwner: !!ownerRole,
            hasWorkspaceMembership: !!workspaceMember,
          };
        });
      }

      // Se não for global owner, buscar apenas do workspace atual
      if (!currentWorkspace?.workspace_id) return [];

      // Buscar membros
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", currentWorkspace.workspace_id)
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      // Buscar perfis de todos os membros
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Buscar emails via edge function
      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        "get-user-emails",
        {
          body: { userIds }
        }
      );

      if (emailError) {
        console.error("Error fetching emails:", emailError);
      }
      
      // Combinar dados
      return membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        const emailInfo = emailData?.users?.find((u: any) => u.id === member.user_id);
        
        return {
          ...member,
          profile: profile || { full_name: null, avatar_url: null, phone: null, bio: null },
          email: emailInfo?.email || profile?.full_name || "Sem email",
          isGlobalOwner: false,
          isOwner: false,
          hasWorkspaceMembership: true,
        };
      });
    },
    enabled: !!currentUser?.id && (isSystemAdmin || !!currentWorkspace?.workspace_id),
  });

  // Mutation para remover membro do workspace
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Não foi possível remover o membro. Verifique suas permissões.");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-detailed"] });
      setDeleteConfirmMember(null);
      toast.success("Membro removido do workspace!");
    },
    onError: (error: any) => {
      setDeleteConfirmMember(null);
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  // Mutation para deletar usuário completamente do sistema
  const deleteUserCompletelyMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('delete_user_completely', {
        target_user_id: userId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-detailed"] });
      setDeleteConfirmMember(null);
      toast.success("Usuário excluído completamente do sistema!");
    },
    onError: (error: any) => {
      setDeleteConfirmMember(null);
      toast.error(error.message || "Erro ao excluir usuário");
    },
  });

  // Filtrar e ordenar membros
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    let filtered = members.filter((member) => {
      const matchesSearch =
        member.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Lógica de filtro por role
      let matchesRole = true;
      if (roleFilter === "global_owner") {
        matchesRole = member.isGlobalOwner;
      } else if (roleFilter === "owner") {
        // Filtrar por proprietário técnico
        matchesRole = member.isOwner && !member.isGlobalOwner;
      } else if (roleFilter !== "all") {
        // Para outros roles, verificar o workspace role
        matchesRole = member.role === roleFilter;
      }
      
      return matchesSearch && matchesRole;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.profile.full_name || a.email).localeCompare(b.profile.full_name || b.email);
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "role":
          const roleOrder = ["admin", "member", "limited_member", "guest"];
          return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, roleFilter, sortBy]);

  const canEdit = isSystemAdmin || currentWorkspace?.role === "admin";
  
  const canDelete = (member: any) => {
    // Não pode deletar se não tem workspace membership
    if (!member.hasWorkspaceMembership) return false;
    
    // Global owner pode deletar qualquer um (exceto outros global owners)
    if (isGlobalOwner) {
      return !member.isGlobalOwner;
    }
    
    // Admin do workspace pode deletar membros regulares
    if (currentWorkspace?.role === "admin") {
      // Não pode deletar global owner nem owner
      if (member.isGlobalOwner || member.isOwner) return false;
      // Não pode deletar a si mesmo
      if (member.user_id === currentUser?.id) return false;
      return true;
    }
    
    return false;
  };

  const canDeleteFromSystem = (member: any) => {
    // Apenas global owners podem deletar usuários do sistema
    if (!isGlobalOwner) return false;
    
    // Não pode deletar outro global owner
    if (member.isGlobalOwner) return false;
    
    // Não pode deletar a si mesmo
    if (member.user_id === currentUser?.id) return false;
    
    return true;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                {isSystemAdmin ? "Visualizando todos os usuários do sistema" : `${filteredMembers.length} usuário(s) encontrado(s)`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Usuário
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowAddDialog(true)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Adicionar Manualmente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />

          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado
              </p>
            ) : (
              filteredMembers.map((member) => (
                <UserCard
                  key={member.id}
                  userId={member.user_id}
                  fullName={member.profile.full_name || member.email}
                  email={member.email}
                  avatarUrl={member.profile.avatar_url || undefined}
                  role={member.role}
                  createdAt={member.created_at}
                  isGlobalOwner={member.isGlobalOwner}
                  isOwner={member.isOwner}
                  onEdit={() =>
                    setEditUser({
                      id: member.user_id,
                      fullName: member.profile.full_name || member.email,
                      email: member.email,
                      avatarUrl: member.profile.avatar_url,
                      phone: member.profile.phone,
                      bio: member.profile.bio,
                      role: isValidWorkspaceRole(member.role) ? member.role : 'member',
                      workspaceMemberId: member.id,
                      isGlobalOwner: member.isGlobalOwner,
                      isOwner: member.isOwner,
                    })
                  }
                  onDelete={() => setDeleteConfirmMember(member)}
                  onDeleteFromSystem={() => setDeleteConfirmMember({ ...member, deleteFromSystem: true })}
                  onViewDetails={() =>
                    setDetailsUser({
                      id: member.user_id,
                      fullName: member.profile.full_name || member.email,
                      email: member.email,
                      avatarUrl: member.profile.avatar_url,
                      phone: member.profile.phone,
                      bio: member.profile.bio,
                      role: member.role,
                      createdAt: member.created_at,
                    })
                  }
                  onManagePermissions={() =>
                    setPermissionsUser({
                      id: member.user_id,
                      fullName: member.profile.full_name || member.email,
                      workspaceId: member.workspace_id,
                    })
                  }
                  canEdit={canEdit}
                  canDelete={canDelete(member)}
                  canDeleteFromSystem={canDeleteFromSystem(member)}
                  canManagePermissions={canEdit && !member.isGlobalOwner}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {editUser && (
        <UserEditDialog
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          user={editUser}
          currentUserRole={((currentWorkspace?.role as any) === 'owner' ? 'admin' : currentWorkspace?.role) || "guest"}
          workspaceId={currentWorkspace?.workspace_id || ""}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["workspace-members-detailed"] });
            setEditUser(null);
          }}
        />
      )}

      {detailsUser && (
        <UserDetailsDrawer
          open={!!detailsUser}
          onOpenChange={(open) => !open && setDetailsUser(null)}
          user={detailsUser}
        />
      )}

      {permissionsUser && (
        <UserPermissionsDialog
          open={!!permissionsUser}
          onOpenChange={(open) => !open && setPermissionsUser(null)}
          userId={permissionsUser.id}
          userName={permissionsUser.fullName}
          workspaceId={permissionsUser.workspaceId || ""}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["workspace-members-detailed"] });
            setPermissionsUser(null);
          }}
        />
      )}

      <UserAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        workspaceId={currentWorkspace?.workspace_id || ''}
      />

      <AlertDialog 
        open={!!deleteConfirmMember} 
        onOpenChange={(open) => !open && setDeleteConfirmMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmMember?.deleteFromSystem ? "Excluir do Sistema" : "Remover do Workspace"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMember?.deleteFromSystem ? (
                <>
                  Tem certeza que deseja <strong className="text-destructive">excluir permanentemente</strong> o usuário{" "}
                  <strong>{deleteConfirmMember?.profile?.full_name || deleteConfirmMember?.email}</strong> do sistema?
                  <br /><br />
                  Esta ação é <strong>IRREVERSÍVEL</strong> e removerá o usuário completamente, incluindo:
                  <ul className="list-disc ml-6 mt-2">
                    <li>Conta de autenticação</li>
                    <li>Perfil e dados pessoais</li>
                    <li>Membros de todos os workspaces</li>
                  </ul>
                  <br />
                  O histórico e registros criados pelo usuário serão preservados.
                </>
              ) : (
                <>
                  Tem certeza que deseja remover <strong>{deleteConfirmMember?.profile?.full_name || deleteConfirmMember?.email}</strong> do workspace?
                  <br /><br />
                  Esta ação removerá o acesso do usuário a este workspace, mas a conta dele permanecerá no sistema.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmMember?.deleteFromSystem) {
                  deleteUserCompletelyMutation.mutate(deleteConfirmMember.user_id);
                } else if (deleteConfirmMember?.hasWorkspaceMembership) {
                  removeMemberMutation.mutate(deleteConfirmMember.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirmMember?.deleteFromSystem ? "Excluir Permanentemente" : "Remover do Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
