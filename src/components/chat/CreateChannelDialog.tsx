import { useState, useEffect } from 'react';
import { Hash, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCustomChannel } from '@/hooks/useChat';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useAuth } from '@/contexts/AuthContext';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelDialog = ({ open, onOpenChange }: CreateChannelDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  const { user } = useAuth();
  const { data: workspaces } = useWorkspaces();
  const { data: allProfiles } = useAllProfiles();
  const createChannel = useCreateCustomChannel();

  // Auto-select first workspace when dialog opens
  useEffect(() => {
    if (open && workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [open, workspaces, selectedWorkspaceId]);

  const otherUsers = allProfiles?.filter(p => p.id !== user?.id) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedWorkspaceId) return;

    await createChannel.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      memberIds: selectedMembers,
      workspaceId: selectedWorkspaceId,
    });

    setName('');
    setDescription('');
    setSelectedMembers([]);
    onOpenChange(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Criar canal
            </DialogTitle>
            <DialogDescription>
              Crie um canal personalizado para conversas em grupo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Workspace Selector */}
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace</Label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do canal</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: marketing, vendas, projetos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sobre o que é este canal?"
                rows={2}
              />
            </div>

            {otherUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Adicionar membros</Label>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                  <div className="space-y-1">
                    {otherUsers.map((profile) => {
                      const userName = profile.full_name || 'Usuário';
                      const initials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                      return (
                        <label
                          key={profile.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(profile.id)}
                            onCheckedChange={() => toggleMember(profile.id)}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{userName}</span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || !selectedWorkspaceId || createChannel.isPending}
            >
              {createChannel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar canal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
