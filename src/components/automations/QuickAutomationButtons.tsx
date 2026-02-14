import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateAutomation, useAutomationsByScope, useDeleteAutomation } from '@/hooks/useAutomations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Eye, Loader2, Trash2 } from 'lucide-react';
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
  const deleteAutomation = useDeleteAutomation();
  const { data: scopeAutomations } = useAutomationsByScope(scopeType, scopeId);

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

  // Get existing automations for the current action type
  const existingAutomations = (scopeAutomations || []).filter(
    a => a.action_type === actionType && a.trigger === 'on_task_created'
  );

  const existingUserEntries: { userId: string; automationId: string; profile: { full_name: string | null; avatar_url: string | null } | null }[] = [];
  existingAutomations.forEach(automation => {
    const config = automation.action_config as Record<string, any>;
    const userIds: string[] = config.user_ids || (config.user_id ? [config.user_id] : []);
    userIds.forEach(uid => {
      const member = members?.find(m => m.user_id === uid);
      existingUserEntries.push({
        userId: uid,
        automationId: automation.id,
        profile: member?.profile || null,
      });
    });
  });

  const handleDeleteAutomation = async (automationId: string) => {
    await deleteAutomation.mutateAsync(automationId);
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
            {/* Existing assigned users */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {actionType === 'auto_assign_user' ? 'Usuários atribuídos' : 'Seguidores atuais'}
              </p>
              {existingUserEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 italic">Nenhum usuário atribuído ainda</p>
              ) : (
                <div className="space-y-2">
                  {existingUserEntries.map((entry, idx) => (
                    <div key={`${entry.automationId}-${entry.userId}-${idx}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {entry.profile?.avatar_url && <AvatarImage src={entry.profile.avatar_url} />}
                          <AvatarFallback className="text-xs">
                            {(entry.profile?.full_name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{entry.profile?.full_name || 'Usuário'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteAutomation(entry.automationId)}
                        disabled={deleteAutomation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Add new users */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Adicionar novos</p>
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
