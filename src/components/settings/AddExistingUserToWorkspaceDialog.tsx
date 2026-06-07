import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface AddExistingUserToWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWorkspaceId: string;
}

interface UserOption {
  user_id: string;
  email: string;
  full_name: string | null;
}

const roleLabels: Record<WorkspaceRole, string> = {
  admin: "Administrador",
  member: "Membro",
  limited_member: "Membro Limitado",
  guest: "Convidado",
};

export function AddExistingUserToWorkspaceDialog({
  open,
  onOpenChange,
  currentWorkspaceId,
}: AddExistingUserToWorkspaceDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("member");
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  // Fetch all users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_users_with_emails");
      if (error) throw error;
      return data as UserOption[];
    },
  });

  // Check if selected user is already a member of current workspace
  const { data: isAlreadyMember = false } = useQuery({
    queryKey: ["is-workspace-member", currentWorkspaceId, selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return false;
      const { data, error } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", currentWorkspaceId)
        .eq("user_id", selectedUserId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!selectedUserId,
  });

  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        throw new Error("Selecione um usuário");
      }

      if (isAlreadyMember) {
        throw new Error("Este usuário já é membro do workspace");
      }

      const { error } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: currentWorkspaceId,
          user_id: selectedUserId,
          role: selectedRole,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      toast.success("Usuário adicionado com sucesso ao workspace!");
      handleClose();
    },
    onError: (error: Error) => {
      console.error("Erro ao adicionar usuário:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    },
  });

  const handleClose = () => {
    setSelectedUserId("");
    setSelectedRole("member");
    onOpenChange(false);
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Usuário ao Workspace</DialogTitle>
          <DialogDescription>
            Vincule um usuário existente ao workspace atual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>Selecionar Usuário</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userSearchOpen}
                  className="w-full justify-between"
                  disabled={isLoadingUsers}
                >
                  {isLoadingUsers ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </span>
                  ) : selectedUser ? (
                    <span className="truncate">
                      {selectedUser.full_name || selectedUser.email}
                    </span>
                  ) : (
                    "Buscar usuário..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Command>
                  <CommandInput placeholder="Buscar usuário..." />
                  <CommandList 
                    className="max-h-[200px] overflow-y-auto"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.user_id}
                          value={`${user.email} ${user.full_name || ""}`}
                          onSelect={() => {
                            setSelectedUserId(user.user_id);
                            setUserSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUserId === user.user_id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {user.full_name || user.email}
                            </span>
                            {user.full_name && (
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Função</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as WorkspaceRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => addUserMutation.mutate()}
            disabled={
              !selectedUserId ||
              isAlreadyMember ||
              addUserMutation.isPending ||
              isLoadingUsers
            }
          >
            {addUserMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              "Adicionar Usuário"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
