import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, UserPlus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { AddExistingUserToWorkspaceDialog } from "./AddExistingUserToWorkspaceDialog";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

const roleLabels: Record<WorkspaceRole, string> = {
  admin: "Administrador",
  member: "Membro",
  limited_member: "Membro Limitado",
  guest: "Convidado",
};

const roleBadgeVariants: Record<WorkspaceRole, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "secondary",
  member: "outline",
  limited_member: "outline",
  guest: "outline",
};

export function WorkspaceSettings() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { user } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);

  // Selecionar o primeiro workspace quando carregar
  useEffect(() => {
    if (workspaces?.length && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Buscar membros do workspace selecionado com e-mails
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['workspace-members', selectedWorkspaceId],
    queryFn: async () => {
      if (!selectedWorkspaceId) return [];
      
      const { data, error } = await supabase
        .rpc('get_workspace_members_with_emails', {
          workspace_uuid: selectedWorkspaceId
        });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedWorkspaceId,
  });

  // Buscar role do usuário atual no workspace
  const currentUserMember = members?.find(m => m.user_id === user?.id);
  const canManageMembers = currentUserMember?.role === 'admin';

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', selectedWorkspaceId] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro');
      console.error(error);
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', selectedWorkspaceId] });
      toast.success('Role atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar role');
      console.error(error);
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!currentWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Nenhum workspace encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Membros do Workspace</CardTitle>
            <CardDescription>
              Visualize e gerencie os membros com acesso a este workspace
            </CardDescription>
          </div>
          {canManageMembers && (
            <Button
              onClick={() => setIsAddUserDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="workspace-select">Selecionar Workspace</Label>
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger id="workspace-select">
              <SelectValue placeholder="Selecione um workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentWorkspace && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold">{currentWorkspace.name}</h3>
              {currentWorkspace.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentWorkspace.description}</p>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Membros ({members?.length || 0})</h4>
              
              {loadingMembers ? (
                <div className="text-sm text-muted-foreground">Carregando membros...</div>
              ) : members && members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Adicionado em</TableHead>
                      {canManageMembers && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.email || 'E-mail não disponível'}</TableCell>
                        <TableCell>
                          {canManageMembers ? (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => 
                                updateMemberRole.mutate({ memberId: member.id, newRole: newRole as WorkspaceRole })
                              }
                              disabled={updateMemberRole.isPending}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="member">Membro</SelectItem>
                                <SelectItem value="limited_member">Membro Limitado</SelectItem>
                                <SelectItem value="guest">Convidado</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={roleBadgeVariants[member.role]}>
                              {roleLabels[member.role]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        {canManageMembers && (
                          <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember.mutate(member.id)}
                                disabled={removeMember.isPending}
                              >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum membro encontrado.</div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <AddExistingUserToWorkspaceDialog
        open={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        currentWorkspaceId={selectedWorkspaceId}
      />
    </Card>
  );
}
