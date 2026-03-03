import { useState } from 'react';
import { Eye, Plus, X, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskFollowers, useAddTaskFollower, useRemoveTaskFollower } from '@/hooks/useTaskFollowers';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';

interface TaskFollowersManagerProps {
  taskId: string;
  workspaceId: string;
}

export const TaskFollowersManager = ({ taskId, workspaceId }: TaskFollowersManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: followers, isLoading: loadingFollowers } = useTaskFollowers(taskId);
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers(workspaceId);
  const addFollower = useAddTaskFollower();
  const removeFollower = useRemoveTaskFollower();
  const createActivity = useCreateTaskActivity();

  const followerIds = followers?.map((f) => f.user_id) || [];

  const availableMembers = members?.filter(
    (member) =>
      !followerIds.includes(member.user_id) &&
      (member.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || !search)
  );

  const handleAddFollower = async (member: { user_id: string; profile: { full_name: string | null } | null }) => {
    try {
      await addFollower.mutateAsync({ taskId, userId: member.user_id });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'follower.added',
        fieldName: 'follower',
        newValue: member.profile?.full_name || 'Usuário',
      });
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erro ao adicionar seguidor:', error);
    }
  };

  const handleRemoveFollower = async (follower: { user_id: string; user?: { full_name: string } }) => {
    try {
      await removeFollower.mutateAsync({ taskId, userId: follower.user_id });
      await createActivity.mutateAsync({
        taskId,
        activityType: 'follower.removed',
        fieldName: 'follower',
        oldValue: follower.user?.full_name || 'Usuário',
      });
    } catch (error) {
      console.error('Erro ao remover seguidor:', error);
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
        <Eye className="h-4 w-4" /> Seguidores
      </label>

      <div className="space-y-2">
        {loadingFollowers ? (
          <div className="flex items-center gap-2 p-2 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-sm">Carregando...</span>
          </div>
        ) : followers && followers.length > 0 ? (
          <div className="space-y-2">
            {followers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-2 border rounded-md group"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={follower.user?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(follower.user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{follower.user?.full_name || 'Sem nome'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFollower(follower)}
                  disabled={removeFollower.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 border rounded-md text-muted-foreground text-sm">
            <Eye className="h-4 w-4" />
            Nenhum seguidor
          </div>
        )}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar seguidor
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
                      onClick={() => handleAddFollower(member)}
                      disabled={addFollower.isPending}
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
                      {addFollower.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <Check className="h-5 w-5 mb-1" />
                  <p className="text-sm">
                    {search ? 'Nenhum membro encontrado' : 'Todos os membros já são seguidores'}
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
