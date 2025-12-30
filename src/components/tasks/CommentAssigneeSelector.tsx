import { useState } from 'react';
import { Check, Search, UserPlus, X, Users } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceMembers, WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentAssigneeSelectorProps {
  workspaceId?: string;
  selectedAssignee: WorkspaceMember | null;
  onSelect: (member: WorkspaceMember | null) => void;
}

export const CommentAssigneeSelector = ({
  workspaceId,
  selectedAssignee,
  onSelect,
}: CommentAssigneeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);

  // Filtra por nome ou email (alguns full_name contêm emails)
  const filteredMembers = members.filter((member) => {
    if (!search.trim()) return true;
    const name = member.profile?.full_name?.toLowerCase() || '';
    const searchLower = search.toLowerCase().trim();
    return name.includes(searchLower);
  });

  const handleSelect = (member: WorkspaceMember) => {
    onSelect(member);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  const getDisplayName = (member: WorkspaceMember) => {
    const fullName = member.profile?.full_name;
    if (!fullName) return 'Usuário';
    // Se for email, pegar só a parte antes do @
    if (fullName.includes('@')) {
      return fullName.split('@')[0];
    }
    return fullName;
  };

  const getInitial = (member: WorkspaceMember) => {
    const name = getDisplayName(member);
    return name.charAt(0).toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2",
            selectedAssignee && "text-primary"
          )}
        >
          <UserPlus className="h-4 w-4" />
          {selectedAssignee ? (
            <>
              <span className="max-w-[100px] truncate">
                {getDisplayName(selectedAssignee)}
              </span>
              <X 
                className="h-3 w-3 opacity-70 hover:opacity-100" 
                onClick={handleClear}
              />
            </>
          ) : (
            <span>Atribuir</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar membros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
        </div>
        
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5 border-b border-border">
          <Users className="h-3 w-3" />
          Membros do Workspace ({members.length})
        </div>

        <ScrollArea className="h-[200px]">
          {isLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum membro no workspace
              </p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado para "{search}"
            </div>
          ) : (
            <div className="p-1">
              {filteredMembers.map((member) => {
                const isSelected = selectedAssignee?.user_id === member.user_id;
                const displayName = getDisplayName(member);
                const initial = getInitial(member);

                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
