import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Eye } from 'lucide-react';
import { ScopeSelector } from './ScopeSelector';
import { useCreateAutomation, type AutomationAction, type AutomationScope } from '@/hooks/useAutomations';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CreateAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface WorkspaceMember {
  user_id: string;
  role: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function CreateAutomationDialog({ open, onOpenChange, workspaceId }: CreateAutomationDialogProps) {
  const createAutomation = useCreateAutomation();

  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<AutomationAction>('auto_assign_user');
  const [scope, setScope] = useState<{ scopeType: AutomationScope; scopeId?: string }>({
    scopeType: 'workspace',
    scopeId: workspaceId,
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch workspace members with profiles
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!workspaceId) return [];
      
      // First get workspace members
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId);

      if (memberError) throw memberError;
      if (!memberData || memberData.length === 0) return [];

      // Then get profiles for those members
      const userIds = memberData.map(m => m.user_id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Combine data
      return memberData.map(member => ({
        user_id: member.user_id,
        role: member.role,
        profile: profileData?.find(p => p.id === member.user_id),
      }));
    },
    enabled: !!workspaceId,
  });

  const handleSubmit = () => {
    if (!workspaceId || !selectedUserId) return;

    createAutomation.mutate({
      workspaceId,
      description: description.trim() || undefined,
      trigger: 'on_task_created',
      actionType,
      actionConfig: { user_id: selectedUserId },
      scopeType: scope.scopeType,
      scopeId: scope.scopeType === 'workspace' ? undefined : scope.scopeId,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setDescription('');
    setActionType('auto_assign_user');
    setScope({ scopeType: 'workspace', scopeId: workspaceId });
    setSelectedUserId('');
  };

  const selectedMember = members.find(m => m.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Automação</DialogTitle>
          <DialogDescription>
            Configure uma automação para atribuir automaticamente responsáveis ou seguidores às tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ex: Atribuir João como responsável no Space Marketing"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5"
              rows={2}
            />
          </div>

          {/* Action Type */}
          <div>
            <Label className="text-sm font-medium">Tipo de Automação</Label>
            <RadioGroup
              value={actionType}
              onValueChange={(v) => setActionType(v as AutomationAction)}
              className="mt-2 grid grid-cols-2 gap-3"
            >
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  actionType === 'auto_assign_user'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <RadioGroupItem value="auto_assign_user" className="sr-only" />
                <div className="p-2 rounded-md bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Responsável</p>
                  <p className="text-xs text-muted-foreground">Executa a tarefa</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  actionType === 'auto_add_follower'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <RadioGroupItem value="auto_add_follower" className="sr-only" />
                <div className="p-2 rounded-md bg-blue-500/10">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Seguidor</p>
                  <p className="text-xs text-muted-foreground">Acompanha a tarefa</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Scope Selector */}
          <ScopeSelector
            workspaceId={workspaceId}
            value={scope}
            onChange={setScope}
          />

          {/* User Selector */}
          <div>
            <Label className="text-sm font-medium">
              {actionType === 'auto_assign_user' ? 'Quem será responsável' : 'Quem será seguidor'}
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione um usuário">
                  {selectedMember && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={selectedMember.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {selectedMember.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedMember.profile?.full_name || 'Usuário'}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {member.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.profile?.full_name || 'Usuário'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedUserId || createAutomation.isPending}
          >
            {createAutomation.isPending ? 'Criando...' : 'Criar Automação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
