import { useState } from 'react';
import { User, Plus, X, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskAssignees, useAddTaskAssignee, useRemoveTaskAssignee } from '@/hooks/useTaskAssignees';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';

interface TaskAssigneesManagerProps {
  taskId: string;
  workspaceId: string;
}

export const TaskAssigneesManager = ({ taskId, workspaceId }: TaskAssigneesManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: assignees, isLoading: loadingAssignees } = useTaskAssignees(taskId);
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers(workspaceId);
  const addAssignee = useAddTaskAssignee();
  const removeAssignee = useRemoveTaskAssignee();
  const createActivity = useCreateTaskActivity();

  const assigneeIds = assignees?.map((a) => a.user_id) || [];

  const availableMembers = members?.filter(
    (member) =>
      !assigneeIds.includes(member.user_id) &&
      (member.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const handleAddAssignee = async (member: { user_id: string; profile: { full_name: string | null } | null }) => {
    try {
      await addAssignee.mutateAsync({ taskId, userId: member.user_id });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'assignee.added',
        fieldName: 'assignee',
        newValue: member.profile?.full_name || 'Usuário',
      });
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erro ao adicionar responsável:', error);
    }
  };

  const handleRemoveAssignee = async (assignee: { user_id: string; user?: { full_name: string } }) => {
    try {
      await removeAssignee.mutateAsync({ taskId, userId: assignee.user_id });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'assignee.removed',
        fieldName: 'assignee',
        oldValue: assignee.user?.full_name || 'Usuário',
      });
    } catch (error) {
      console.error('Erro ao remover responsável:', error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <User className="h-4 w-4" /> Responsáveis
      </label>

      <div className="space-y-2">
        {loadingAssignees ? (
          <div className="flex items-center gap-2 p-2 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : assignees && assignees.length > 0 ? (
          <div className="space-y-2">
            {assignees.map((assignee) => (
              <div
                key={assignee.id}
                className="flex items-center justify-between p-2 border rounded-md group"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={assignee.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(assignee.user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee.user?.full_name || 'Sem nome'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveAssignee(assignee)}
                  disabled={removeAssignee.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 border rounded-md text-muted-foreground text-sm">
            <User className="h-4 w-4" />
            Não atribuído
          </div>
        )}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar responsável
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar membro..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            <ScrollArea className="h-[200px] overflow-y-auto">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : availableMembers && availableMembers.length > 0 ? (
                <div className="p-1">
                  {availableMembers.map((member) => (
                    <button
                      key={member.id}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
                      onClick={() => handleAddAssignee(member)}
                      disabled={addAssignee.isPending}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {member.profile?.full_name || 'Sem nome'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                      </div>
                      {addAssignee.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <Check className="h-5 w-5 mb-1" />
                  <p className="text-sm">
                    {search ? 'Nenhum membro encontrado' : 'Todos os membros já foram atribuídos'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
