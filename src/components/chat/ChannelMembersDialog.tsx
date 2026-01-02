import { useState } from 'react';
import { Users, UserPlus, X, Loader2, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChannelMembers, useAddChannelMember, useRemoveChannelMember } from '@/hooks/useChat';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

interface ChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
}

export const ChannelMembersDialog = ({ 
  open, 
  onOpenChange, 
  channelId,
  channelName 
}: ChannelMembersDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: channelMembers, isLoading } = useChannelMembers(channelId);
  const { data: workspaceMembers } = useWorkspaceMembers(activeWorkspace?.id);
  const addMember = useAddChannelMember();
  const removeMember = useRemoveChannelMember();

  const memberIds = channelMembers?.map(m => m.user_id) || [];
  const isOwner = channelMembers?.some(m => m.user_id === user?.id && m.role === 'owner');

  const availableMembers = workspaceMembers?.filter(
    m => !memberIds.includes(m.user_id)
  ) || [];

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    
    await addMember.mutateAsync({ channelId, userId: selectedUserId });
    setSelectedUserId('');
  };

  const handleRemoveMember = async (userId: string) => {
    await removeMember.mutateAsync({ channelId, userId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros do canal
          </DialogTitle>
          <DialogDescription>
            Gerencie os membros de #{channelName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add member */}
            {isOwner && availableMembers.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => {
                      const profile = (member as any).profiles;
                      const name = profile?.full_name || 'Usuário';

                      return (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addMember.isPending}
                  size="icon"
                >
                  {addMember.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}

            {/* Members list */}
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {channelMembers?.map((member) => {
                  const profile = (member as any).user;
                  const name = profile?.full_name || 'Usuário';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                  const isMemberOwner = member.role === 'owner';

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-sm font-medium flex items-center gap-1">
                            {name}
                            {isMemberOwner && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isMemberOwner ? 'Proprietário' : 'Membro'}
                          </span>
                        </div>
                      </div>

                      {isOwner && !isMemberOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removeMember.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
