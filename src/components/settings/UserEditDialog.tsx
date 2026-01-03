import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { AlertTriangle, KeyRound, Eye, EyeOff, Shuffle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

const VALID_WORKSPACE_ROLES: WorkspaceRole[] = ['admin', 'member', 'limited_member', 'guest'];

const isValidWorkspaceRole = (role: any): role is WorkspaceRole => {
  return VALID_WORKSPACE_ROLES.includes(role);
};

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
    bio?: string;
    role: WorkspaceRole;
    workspaceMemberId: string;
    isGlobalOwner?: boolean;
    isOwner?: boolean;
  };
  currentUserRole: WorkspaceRole;
  workspaceId: string;
  onSuccess: () => void;
}

export function UserEditDialog({
  open,
  onOpenChange,
  user,
  currentUserRole,
  workspaceId,
  onSuccess,
}: UserEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone || "");
  const [bio, setBio] = useState(user.bio || "");
  const [role, setRole] = useState<WorkspaceRole>(
    isValidWorkspaceRole(user.role) ? user.role : 'member'
  );

  // Password reset state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserGlobalOwner, setIsCurrentUserGlobalOwner] = useState(false);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  
  useEffect(() => {
    const checkPermissions = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id || null);
      
      if (userData.user?.id) {
        // Verificar se o usuário atual é system admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .in("role", ["global_owner", "owner"]);
        
        setIsCurrentUserGlobalOwner(roles?.some(r => r.role === "global_owner") || false);
        setIsCurrentUserOwner(roles?.some(r => r.role === "owner") || false);
      }
    };
    
    checkPermissions();
  }, []);

  const isEditingSelf = user.id === currentUserId;
  const isCurrentUserSystemAdmin = isCurrentUserGlobalOwner || isCurrentUserOwner;
  
  // System admins (global_owner e owner) não podem ser editados por outros
  const canEditThisUser = () => {
    // Se estiver editando a si mesmo, pode editar perfil (mas não role de system admin)
    if (isEditingSelf) return true;
    
    // Proprietário Global pode editar qualquer um
    if (isCurrentUserGlobalOwner) return true;
    
    // Owner (técnico) pode editar qualquer um exceto Global Owner
    if (isCurrentUserOwner && !user.isGlobalOwner) return true;
    
    // Workspace owners/admins podem editar membros normais (não system admins)
    if (user.isGlobalOwner || user.isOwner) return false;
    
    return currentUserRole === "admin";
  };
  
  const canEditRole = currentUserRole === "admin" && !user.isGlobalOwner && !user.isOwner;
  const canResetPassword = isCurrentUserGlobalOwner || isCurrentUserOwner || currentUserRole === "admin";

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: user.id,
          newPassword,
          mustChangePassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Senha resetada com sucesso!");
      setNewPassword("");
      setShowPasswordReset(false);
      setMustChangePassword(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao resetar senha");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSave = async () => {
    if (!canEditThisUser()) {
      toast.error("Você não tem permissão para editar este usuário");
      return;
    }
    
    setLoading(true);
    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          bio,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Atualizar role se necessário e permitido
      if (canEditRole && role !== user.role && !user.isGlobalOwner && !user.isOwner) {
        // Validar se o role é permitido
        if (!isValidWorkspaceRole(role)) {
          toast.error("Role inválido selecionado");
          return;
        }
        
        const { error: roleError } = await supabase
          .from("workspace_members")
          .update({ role })
          .eq("id", user.workspaceMemberId);

        if (roleError) throw roleError;
      }

      toast.success("Usuário atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(user.isGlobalOwner || user.isOwner) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {user.isGlobalOwner 
                  ? "👑 Este usuário é Proprietário Global e possui controle total do sistema."
                  : "🔧 Este usuário é Proprietário (Técnico) com acesso completo ao sistema."}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-center">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl} alt={fullName} />
              <AvatarFallback>{fullName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte um pouco sobre você..."
              rows={3}
            />
          </div>

          {canEditRole && (
            <div className="space-y-2">
              <Label htmlFor="role">Role no Workspace</Label>
              <Select value={role} onValueChange={(value) => setRole(value as WorkspaceRole)}>
                <SelectTrigger id="role">
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
          )}

          {/* Password Reset Section */}
          {canResetPassword && (
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Segurança</Label>
                {!showPasswordReset && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordReset(true)}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Resetar Senha
                  </Button>
                )}
              </div>

              {showPasswordReset && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha Temporária</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setNewPassword(generateRandomPassword())}
                        title="Gerar senha aleatória"
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mustChangePasswordEdit"
                      checked={mustChangePassword}
                      onCheckedChange={(checked) => setMustChangePassword(checked as boolean)}
                    />
                    <Label htmlFor="mustChangePasswordEdit" className="text-sm font-normal cursor-pointer">
                      Exigir troca de senha no próximo login
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPasswordReset(false);
                        setNewPassword("");
                      }}
                      disabled={resettingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResetPassword}
                      disabled={resettingPassword || !newPassword}
                    >
                      {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Confirmar Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
