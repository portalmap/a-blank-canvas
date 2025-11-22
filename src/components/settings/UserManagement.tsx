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
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { Loader2, UserPlus } from "lucide-react";
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
  const [roleFilter, setRoleFilter] = useState<WorkspaceRole | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "role">("name");
  const [editUser, setEditUser] = useState<any | null>(null);
  const [detailsUser, setDetailsUser] = useState<any | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);

  // Verificar se é proprietário global
  const { data: isGlobalOwner } = useQuery({
    queryKey: ["is-global-owner", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser?.id)
        .eq("role", "global_owner")
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!currentUser?.id,
  });

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
    enabled: !!currentUser?.id && !isGlobalOwner,
  });

  // Buscar membros (todos se for global owner, ou do workspace específico)
  const { data: members, isLoading } = useQuery({
    queryKey: ["workspace-members-detailed", currentWorkspace?.workspace_id, isGlobalOwner],
    queryFn: async () => {
      // Se for proprietário global, buscar TODOS os usuários
      if (isGlobalOwner) {
        // Buscar todos os membros de todos os workspaces
        const { data: membersData, error: membersError } = await supabase
          .from("workspace_members")
          .select("*")
          .order("created_at", { ascending: false });

        if (membersError) throw membersError;

        // Buscar perfis de todos os membros
        const userIds = [...new Set(membersData.map(m => m.user_id))];
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

        // Buscar papéis globais
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("*")
          .in("user_id", userIds);
        
        // Combinar dados
        return membersData.map(member => {
          const profile = profilesData?.find(p => p.id === member.user_id);
          const emailInfo = emailData?.users?.find((u: any) => u.id === member.user_id);
          const globalRole = rolesData?.find(r => r.user_id === member.user_id && r.role === "global_owner");
          
          return {
            ...member,
            profile: profile || { full_name: null, avatar_url: null, phone: null, bio: null },
            email: emailInfo?.email || profile?.full_name || "Sem email",
            isGlobalOwner: !!globalRole,
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
        };
      });
    },
    enabled: !!currentUser?.id && (isGlobalOwner || !!currentWorkspace?.workspace_id),
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
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
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

  const canEdit = isGlobalOwner || currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";
  const canDelete = (memberRole: WorkspaceRole, memberIsGlobalOwner?: boolean) => {
    // Proprietário global não pode ser deletado
    if (memberIsGlobalOwner) return false;
    // Proprietário global pode deletar qualquer um (exceto outro global owner)
    if (isGlobalOwner) return !memberIsGlobalOwner;
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
                {isGlobalOwner ? "Visualizando todos os usuários do sistema" : `${filteredMembers.length} usuário(s) encontrado(s)`}
              </CardDescription>
            </div>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Usuário
            </Button>
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
                  fullName={`${member.profile.full_name || member.email}${member.isGlobalOwner ? " 👑" : ""}`}
                  email={member.email}
                  avatarUrl={member.profile.avatar_url || undefined}
                  role={member.role}
                  createdAt={member.created_at}
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
                  canDelete={canDelete(member.role, member.isGlobalOwner)}
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
    </>
  );
}
