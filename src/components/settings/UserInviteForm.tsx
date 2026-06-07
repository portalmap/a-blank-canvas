import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, X, Copy, Clock, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { UserAddDialog } from "./UserAddDialog";

type WorkspaceRole = "owner" | "admin" | "member" | "limited_member" | "guest";

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  limited_member: "Membro Limitado",
  guest: "Convidado",
};

const roleDescriptions: Record<WorkspaceRole, string> = {
  owner: "Controle total do workspace. Não pode ser removido.",
  admin: "Acesso completo, exceto remover o proprietário.",
  member: "Acesso aos espaços permitidos. Pode criar, editar e excluir.",
  limited_member: "Acesso aos espaços permitidos. Pode criar e editar, mas não excluir.",
  guest: "Acesso específico a recursos individuais apenas.",
};

const roleBadgeVariants: Record<WorkspaceRole, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "destructive",
  admin: "default",
  member: "secondary",
  limited_member: "outline",
  guest: "outline",
};

const statusLabels = {
  pending: "Pendente",
  accepted: "Aceito",
  expired: "Expirado",
  cancelled: "Cancelado",
};

const statusIcons = {
  pending: Clock,
  accepted: CheckCircle,
  expired: XCircle,
  cancelled: XCircle,
};

export function UserInviteForm() {
  const { data: workspaces } = useWorkspaces();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.[0];

  // Buscar convites pendentes
  const { data: invitations } = useQuery({
    queryKey: ["invitations", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  // Criar convite
  const createInvitation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("Nenhum workspace encontrado");
      if (!email.trim()) throw new Error("Email é obrigatório");

      const { data, error } = await supabase.functions.invoke("send-invitation-email", {
        body: {
          workspaceId: currentWorkspace.id,
          email: email.trim(),
          role,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setEmail("");
      toast.success("Convite enviado com sucesso!");
      
      // Copiar link do convite para clipboard
      if (data.invitation?.inviteUrl) {
        navigator.clipboard.writeText(data.invitation.inviteUrl);
        toast.info("Link do convite copiado para área de transferência!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao enviar convite");
    },
  });

  // Cancelar convite
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Convite cancelado");
    },
    onError: () => {
      toast.error("Erro ao cancelar convite");
    },
  });

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Convidar Novo Membro
          </CardTitle>
          <CardDescription>
            Envie um convite por email para adicionar membros ao workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Permissão</Label>
              <Select value={role} onValueChange={(value) => setRole(value as WorkspaceRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span>{roleLabels.admin}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions.admin}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex flex-col items-start">
                      <span>{roleLabels.member}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions.member}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="limited_member">
                    <div className="flex flex-col items-start">
                      <span>{roleLabels.limited_member}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions.limited_member}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="guest">
                    <div className="flex flex-col items-start">
                      <span>{roleLabels.guest}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions.guest}
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createInvitation.mutate()}
                disabled={createInvitation.isPending || !email.trim()}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Convite
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(true)}
                disabled={!currentWorkspace}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Manualmente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <CardDescription>
              Gerencie os convites enviados para o workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const StatusIcon = statusIcons[invitation.status as keyof typeof statusIcons];
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invitation.email}</p>
                        <Badge variant={roleBadgeVariants[invitation.role as WorkspaceRole]}>
                          {roleLabels[invitation.role as WorkspaceRole]}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[invitation.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enviado em {new Date(invitation.created_at).toLocaleDateString("pt-BR")}
                        {invitation.status === "pending" &&
                          ` • Expira em ${new Date(invitation.expires_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {invitation.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(invitation.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelInvitation.mutate(invitation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <UserAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        workspaceId={currentWorkspace?.id || ''}
      />
    </div>
  );
}