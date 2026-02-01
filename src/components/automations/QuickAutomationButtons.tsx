import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAutomation } from '@/hooks/useAutomations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserMultiSelect } from './advanced/UserMultiSelect';

interface QuickAutomationButtonsProps {
  workspaceId: string;
  scopeType: 'workspace' | 'space' | 'folder' | 'list';
  scopeId: string;
  scopeName: string;
}

const QuickAutomationButtons = ({ workspaceId, scopeType, scopeId, scopeName }: QuickAutomationButtonsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'auto_assign_user' | 'auto_add_follower'>('auto_assign_user');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const createAutomation = useCreateAutomation();

  const { data: members } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async () => {
      // Buscar membros do workspace
      const { data: workspaceMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      // Buscar profiles dos membros
      const userIds = workspaceMembers.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combinar os dados
      return workspaceMembers.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null
      }));
    },
    enabled: !!workspaceId,
  });

  const handleOpenDialog = (type: 'auto_assign_user' | 'auto_add_follower') => {
    setActionType(type);
    setSelectedUserIds([]);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Selecione pelo menos um usuário');
      return;
    }

    const selectedNames = selectedUserIds
      .map(id => members?.find(m => m.user_id === id)?.profile?.full_name || 'Usuário')
      .slice(0, 2)
      .join(', ');
    const suffix = selectedUserIds.length > 2 ? ` +${selectedUserIds.length - 2}` : '';

    await createAutomation.mutateAsync({
      workspaceId,
      trigger: 'on_task_created',
      actionType,
      actionConfig: { user_ids: selectedUserIds },
      scopeType,
      scopeId,
      description: `${actionType === 'auto_assign_user' ? 'Atribuir' : 'Adicionar como seguidor'} ${selectedNames}${suffix} em ${scopeName}`,
    });

    setDialogOpen(false);
    setSelectedUserIds([]);
  };

  const getDialogTitle = () => {
    return actionType === 'auto_assign_user' 
      ? 'Atribuição Automática' 
      : 'Seguir Automaticamente';
  };

  const getDialogDescription = () => {
    const scopeLabel = scopeType === 'space' ? 'Space' : scopeType === 'folder' ? 'Pasta' : 'Lista';
    const action = actionType === 'auto_assign_user' 
      ? 'terão este usuário como responsável' 
      : 'terão este usuário como seguidor';
    
    return `Todas as tarefas criadas nesta ${scopeLabel} "${scopeName}" ${action}.`;
  };

  return (
    <>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleOpenDialog('auto_assign_user')}
        >
          <User className="mr-2 h-4 w-4" />
          Atribuição Automática
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleOpenDialog('auto_add_follower')}
        >
          <Eye className="mr-2 h-4 w-4" />
          Seguir Automaticamente
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <UserMultiSelect
              label="Selecione os usuários"
              users={members?.map(m => ({
                id: m.user_id,
                full_name: m.profile?.full_name || null,
                avatar_url: m.profile?.avatar_url || null
              })) || []}
              selectedIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={selectedUserIds.length === 0 || createAutomation.isPending}
            >
              {createAutomation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Automação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickAutomationButtons;
