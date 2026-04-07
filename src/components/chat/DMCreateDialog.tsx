import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDM } from '@/hooks/useChat';
import { Loader2 } from 'lucide-react';

interface DMCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated?: (channelId: string) => void;
}

export const DMCreateDialog = ({ open, onOpenChange, onChannelCreated }: DMCreateDialogProps) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: members } = useWorkspaceMembers(activeWorkspace?.id);
  const createDM = useCreateDM();

  const filteredMembers = members?.filter(m => {
    if (m.user_id === user?.id) return false;
    const name = m.profile?.full_name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
  }) || [];

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getName = (member: any) => {
    const n = member.profile?.full_name;
    if (!n) return 'Usuário';
    if (n.includes('@')) return n.split('@')[0];
    return n;
  };

  const getInitials = (member: any) => {
    return getName(member).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCreate = async () => {
    if (!activeWorkspace?.id || selectedUserIds.length === 0) return;

    const result = await createDM.mutateAsync({
      memberIds: selectedUserIds,
      workspaceId: activeWorkspace.id,
    });

    if (result && onChannelCreated) {
      onChannelCreated(result.id);
    }
    setSelectedUserIds([]);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova mensagem direta</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Buscar membros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {filteredMembers.map(member => (
              <button
                key={member.user_id}
                onClick={() => toggleUser(member.user_id)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <Checkbox checked={selectedUserIds.includes(member.user_id)} />
                <Avatar className="h-7 w-7">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{getName(member)}</span>
              </button>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado</p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={selectedUserIds.length === 0 || createDM.isPending}
          >
            {createDM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedUserIds.length > 1 ? 'Criar grupo' : 'Iniciar conversa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
