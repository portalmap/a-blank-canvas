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

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

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
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "all" | "global_owner" | "owner" | "workspace_owner">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "role">("name");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

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

  // Buscar workspace atual do usuário
  const { data: currentWorkspace } = useQuery({
    queryKey: ["current-workspace", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", currentUser?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id && !isSystemAdmin,
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
        };
      });
    },
    enabled: !!currentUser?.id && (isSystemAdmin || !!currentWorkspace?.workspace_id),
  });

  // Mutation para remover membro
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members-detailed"] });
      toast.success("Membro removido com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover membro");
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
      } else if (roleFilter === "workspace_owner") {
        // Filtrar por proprietário de workspace
        matchesRole = member.role === "owner" && !member.isGlobalOwner && !member.isOwner;
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
          const roleOrder = ["owner", "admin", "member", "limited_member", "guest"];
          return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
        default:
          return 0;
      }
    });

    return filtered;
  }, [members, searchQuery, roleFilter, sortBy]);

  const canEdit = isSystemAdmin || currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";
  const canDelete = (memberRole: WorkspaceRole, memberIsGlobalOwner?: boolean, memberIsOwner?: boolean) => {
    // Proprietário global não pode ser deletado
    if (memberIsGlobalOwner) return false;
    // Proprietário (técnico) também não pode ser deletado via workspace
    if (memberIsOwner) return false;
    // Proprietário global pode deletar qualquer um (exceto global_owner e owner)
    if (isGlobalOwner) return !memberIsGlobalOwner && !memberIsOwner;
    // Proprietário (técnico) pode deletar workspace members mas não outros system admins
    if (userRoles?.isOwner) return !memberIsGlobalOwner && !memberIsOwner;
    if (currentWorkspace?.role === "owner") return memberRole !== "owner";
    if (currentWorkspace?.role === "admin") return memberRole !== "owner" && memberRole !== "admin";
    return false;
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
                disabled={!currentWorkspace?.workspace_id}
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
                      role: member.role,
                      workspaceMemberId: member.id,
                      isGlobalOwner: member.isGlobalOwner,
                      isOwner: member.isOwner,
                    })
                  }
                  onDelete={() => removeMemberMutation.mutate(member.id)}
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
                  canEdit={canEdit}
                  canDelete={canDelete(member.role, member.isGlobalOwner, member.isOwner)}
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
          currentUserRole={currentWorkspace?.role || "guest"}
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
          workspaceId={currentWorkspace?.workspace_id || ""}
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
    </>
  );
}
