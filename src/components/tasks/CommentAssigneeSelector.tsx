import { useState } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
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

  const filteredMembers = members.filter((member) => {
    const name = member.profile?.full_name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
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
                {selectedAssignee.profile?.full_name || 'Usuário'}
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
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[200px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado
            </div>
          ) : (
            <div className="p-1">
              {filteredMembers.map((member) => {
                const isSelected = selectedAssignee?.user_id === member.user_id;
                const name = member.profile?.full_name || 'Usuário';
                const initial = name.charAt(0).toUpperCase();

                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">{name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
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
