import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Shuffle, Eye, EyeOff } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

type RoleType = 'global_owner' | 'owner_technical' | 'admin' | 'member' | 'limited_member' | 'guest';

const roleLabels: Record<RoleType, string> = {
  global_owner: 'Proprietário Global',
  owner_technical: 'Proprietário (Técnico)',
  admin: 'Administrador',
  member: 'Membro',
  limited_member: 'Membro Limitado',
  guest: 'Convidado',
};

const isAppRole = (role: RoleType): role is 'global_owner' | 'owner_technical' => {
  return role === 'global_owner' || role === 'owner_technical';
};

const getWorkspaceRole = (role: RoleType): 'admin' | 'member' | 'limited_member' | 'guest' => {
  return role as 'admin' | 'member' | 'limited_member' | 'guest';
};

interface UserAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function UserAddDialog({ open, onOpenChange, workspaceId }: UserAddDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('member');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(workspaceId || '');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  // Reset selected workspace when dialog opens or workspaceId prop changes
  useEffect(() => {
    if (open && workspaceId) {
      setSelectedWorkspaceId(workspaceId);
    }
  }, [open, workspaceId]);

  // Clear workspace when switching to owner role
  useEffect(() => {
    if (isAppRole(role)) {
      setSelectedWorkspaceId('');
    } else if (!selectedWorkspaceId && workspaceId) {
      setSelectedWorkspaceId(workspaceId);
    }
  }, [role, workspaceId]);

  const requiresWorkspace = !isAppRole(role);

  const addUser = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('Email é obrigatório');
      }

      // For workspace roles, workspace is required
      if (requiresWorkspace && !selectedWorkspaceId) {
        throw new Error('Workspace é obrigatório para esta função');
      }

      // Validate password if provided
      if (temporaryPassword && temporaryPassword.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }

      // Call edge function to add/create user
      const { data, error } = await supabase.functions.invoke('add-user-with-invite', {
        body: {
          email,
          role,
          workspaceId: requiresWorkspace ? selectedWorkspaceId : undefined,
          temporaryPassword: temporaryPassword || undefined,
          mustChangePassword: temporaryPassword ? mustChangePassword : false,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao adicionar usuário');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Usuário adicionado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      setEmail('');
      setRole('member');
      setTemporaryPassword('');
      setMustChangePassword(true);
      setSelectedWorkspaceId(workspaceId || '');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar usuário');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresWorkspace && !selectedWorkspaceId) {
      toast.error('Selecione um workspace');
      return;
    }
    addUser.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Usuário</DialogTitle>
          <DialogDescription>
            Adicione um usuário ao sistema. Defina uma senha temporária ou deixe em branco para enviar email de recuperação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email do Usuário</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha Temporária</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Deixe vazio para enviar email"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
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
                  onClick={() => setTemporaryPassword(generateRandomPassword())}
                  title="Gerar senha aleatória"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres. Se vazio, o usuário receberá um email para definir a senha.
              </p>
            </div>

            {temporaryPassword && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustChangePassword"
                  checked={mustChangePassword}
                  onCheckedChange={(checked) => setMustChangePassword(checked as boolean)}
                />
                <Label htmlFor="mustChangePassword" className="text-sm font-normal cursor-pointer">
                  Exigir troca de senha no primeiro login
                </Label>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="role">Função</Label>
              <Select value={role} onValueChange={(value) => setRole(value as RoleType)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiresWorkspace && (
              <div className="grid gap-2">
                <Label htmlFor="workspace">Workspace *</Label>
                <Select 
                  value={selectedWorkspaceId} 
                  onValueChange={setSelectedWorkspaceId}
                  disabled={isLoadingWorkspaces}
                >
                  <SelectTrigger id="workspace">
                    <SelectValue placeholder="Selecione o workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces?.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addUser.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={addUser.isPending}>
              {addUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
