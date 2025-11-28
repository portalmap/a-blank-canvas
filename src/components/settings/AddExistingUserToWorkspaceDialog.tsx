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
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";

type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

interface AddExistingUserToWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWorkspaceId?: string;
}

interface UserOption {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface WorkspaceOption {
  id: string;
  name: string;
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
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>(
    currentWorkspaceId ? [currentWorkspaceId] : []
  );
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

  // Fetch all workspaces
  const { data: workspaces = [], isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as WorkspaceOption[];
    },
  });

  // Fetch existing memberships for selected user
  const { data: existingMemberships = [] } = useQuery({
    queryKey: ["user-memberships", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", selectedUserId);
      if (error) throw error;
      return data.map((m) => m.workspace_id);
    },
    enabled: !!selectedUserId,
  });

  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || selectedWorkspaces.length === 0) {
        throw new Error("Selecione um usuário e pelo menos um workspace");
      }

      const insertData = selectedWorkspaces.map((workspaceId) => ({
        workspace_id: workspaceId,
        user_id: selectedUserId,
        role: selectedRole,
      }));

      const { error } = await supabase
        .from("workspace_members")
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
      toast.success("Usuário adicionado com sucesso aos workspaces!");
      handleClose();
    },
    onError: (error: Error) => {
      console.error("Erro ao adicionar usuário:", error);
      toast.error(`Erro ao adicionar usuário: ${error.message}`);
    },
  });

  const handleClose = () => {
    setSelectedUserId("");
    setSelectedWorkspaces(currentWorkspaceId ? [currentWorkspaceId] : []);
    setSelectedRole("member");
    onOpenChange(false);
  };

  const handleWorkspaceToggle = (workspaceId: string) => {
    setSelectedWorkspaces((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  const isLoading = isLoadingUsers || isLoadingWorkspaces;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Usuário ao Workspace</DialogTitle>
          <DialogDescription>
            Vincule um usuário existente a um ou mais workspaces
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workspace Selection */}
          <div className="space-y-2">
            <Label>Selecionar Workspaces</Label>
            <ScrollArea className="h-[150px] rounded-md border p-4">
              {isLoadingWorkspaces ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : workspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum workspace disponível
                </p>
              ) : (
                <div className="space-y-2">
                  {workspaces.map((workspace) => {
                    const isAlreadyMember = existingMemberships.includes(
                      workspace.id
                    );
                    const isSelected = selectedWorkspaces.includes(workspace.id);

                    return (
                      <div
                        key={workspace.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={workspace.id}
                          checked={isSelected}
                          onCheckedChange={() =>
                            !isAlreadyMember && handleWorkspaceToggle(workspace.id)
                          }
                          disabled={isAlreadyMember}
                        />
                        <label
                          htmlFor={workspace.id}
                          className={cn(
                            "flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                            isAlreadyMember && "text-muted-foreground"
                          )}
                        >
                          {workspace.name}
                          {workspace.id === currentWorkspaceId && " (atual)"}
                          {isAlreadyMember && " - Já é membro"}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label>Selecionar Usuário</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
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
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar usuário..." />
                  <CommandList>
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
              selectedWorkspaces.length === 0 ||
              addUserMutation.isPending ||
              isLoading
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
