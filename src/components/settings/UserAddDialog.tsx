import { useState } from 'react';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type RoleType = 'global_owner' | 'owner_technical' | 'workspace_owner' | 'admin' | 'member' | 'limited_member' | 'guest';

const roleLabels: Record<RoleType, string> = {
  global_owner: 'Proprietário Global',
  owner_technical: 'Proprietário (Técnico)',
  workspace_owner: 'Proprietário Workspace',
  admin: 'Administrador',
  member: 'Membro',
  limited_member: 'Membro Limitado',
  guest: 'Convidado',
};

const isAppRole = (role: RoleType): role is 'global_owner' | 'owner_technical' => {
  return role === 'global_owner' || role === 'owner_technical';
};

const getWorkspaceRole = (role: RoleType): 'owner' | 'admin' | 'member' | 'limited_member' | 'guest' => {
  if (role === 'workspace_owner') return 'owner';
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
  const queryClient = useQueryClient();

  const addUser = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('Email é obrigatório');
      }

      // For workspace roles, workspace is required
      if (!isAppRole(role) && !workspaceId) {
        throw new Error('Workspace é obrigatório para roles de workspace');
      }

      // Get user ID by email
      const { data: userId, error: getUserError } = await supabase.rpc(
        'get_user_id_by_email',
        { email }
      );

      if (getUserError) {
        throw new Error('Erro ao buscar usuário: ' + getUserError.message);
      }

      if (!userId) {
        throw new Error('Usuário não encontrado com este email');
      }

      // If it's an app role (global_owner or owner), insert into user_roles
      if (isAppRole(role)) {
        const appRole = role === 'global_owner' ? 'global_owner' : 'owner';
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: appRole,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Usuário já possui este role global');
          }
          throw insertError;
        }
      } else {
        // Otherwise, insert into workspace_members
        const workspaceRole = getWorkspaceRole(role);
        const { error: insertError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: workspaceRole,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Usuário já é membro deste workspace');
          }
          throw insertError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Usuário adicionado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      setEmail('');
      setRole('member');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar usuário');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Usuário ao Workspace</DialogTitle>
          <DialogDescription>
            Adicione um usuário existente diretamente ao workspace sem enviar convite por email.
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
