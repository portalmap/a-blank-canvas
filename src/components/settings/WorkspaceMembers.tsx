import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type WorkspaceRole = "owner" | "admin" | "member" | "limited_member" | "guest";

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  limited_member: "Membro Limitado",
  guest: "Convidado",
};

const roleBadgeVariants: Record<WorkspaceRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  member: "secondary",
  limited_member: "secondary",
  guest: "outline",
};

export function WorkspaceMembers() {
  const { data: workspaces } = useWorkspaces();
  const { user: currentUser } = useAuth();
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<WorkspaceRole>("member");
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.[0];

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("Nenhum workspace encontrado");
      if (!newMemberUserId.trim()) throw new Error("ID do usuário é obrigatório");

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(newMemberUserId.trim())) {
        throw new Error("ID do usuário inválido");
      }

      // Add member to workspace
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: newMemberUserId.trim(),
          role: newMemberRole,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Este usuário já é membro do workspace");
        }
        if (error.code === '23503') {
          throw new Error("Usuário não encontrado");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      setNewMemberUserId("");
      setNewMemberRole("member");
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar membro');
      console.error(error);
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro');
      console.error(error);
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast.success('Role atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar role');
      console.error(error);
    },
  });

  if (!currentWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Membros do Workspace</CardTitle>
          <CardDescription>Nenhum workspace encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentUserMember = members?.find(m => m.user_id === currentUser?.id);
  const isAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  return (
    <div className="space-y-6">
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Membro</CardTitle>
            <CardDescription>
              Convide novos membros para o workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="member-user-id">ID do Usuário</Label>
                <Input 
                  id="member-user-id"
                  type="text"
                  placeholder="UUID do usuário (ex: 123e4567-e89b-12d3-a456-426614174000)"
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Cole o ID do usuário que deseja adicionar ao workspace
                </p>
              </div>
              <div className="w-48 space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as WorkspaceRole)}>
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                    <SelectItem value="limited_member">Membro Limitado</SelectItem>
                    <SelectItem value="guest">Convidado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => addMember.mutate()}
                  disabled={addMember.isPending || !newMemberUserId.trim()}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Membros do Workspace</CardTitle>
          <CardDescription>
            Gerencie os membros e suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Carregando membros...</div>
          ) : !members || members.length === 0 ? (
            <div className="text-muted-foreground">Nenhum membro encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Data de Entrada</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.user_id === currentUser?.id;
                  const isOwner = member.role === 'owner';
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono text-xs">
                        {member.user_id}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2">Você</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isOwner && !isCurrentUser ? (
                          <Select 
                            value={member.role} 
                            onValueChange={(value) => 
                              updateMemberRole.mutate({ 
                                memberId: member.id, 
                                role: value as WorkspaceRole 
                              })
                            }
                          >
                            <SelectTrigger className="w-40">
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
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {!isOwner && !isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember.mutate(member.id)}
                              disabled={removeMember.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
