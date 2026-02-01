import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface UserItem {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserMultiSelectProps {
  label: string;
  placeholder?: string;
  users: UserItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  required?: boolean;
}

export const UserMultiSelect = ({
  label,
  placeholder = 'Selecione usuários...',
  users,
  selectedIds,
  onSelectionChange,
  required = false,
}: UserMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  const toggleUser = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(users.map(u => u.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedUsers.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : selectedUsers.length <= 3 ? (
                selectedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="gap-1 text-xs">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {user.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {user.full_name || 'Usuário'}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUser(user.id);
                      }}
                    />
                  </Badge>
                ))
              ) : (
                <>
                  {selectedUsers.slice(0, 2).map(user => (
                    <Badge key={user.id} variant="secondary" className="gap-1 text-xs">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {user.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {user.full_name || 'Usuário'}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-xs">
                    +{selectedUsers.length - 2}
                  </Badge>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar usuário..." />
            <div className="flex gap-1 p-2 border-b">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={selectAll}
              >
                Marcar todos
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={clearAll}
              >
                Limpar
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.full_name || user.id}
                      onSelect={() => toggleUser(user.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox 
                          checked={isSelected}
                          className="pointer-events-none"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1">{user.full_name || 'Usuário'}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
