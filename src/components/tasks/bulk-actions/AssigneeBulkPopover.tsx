import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useBulkAssignTasks } from "@/hooks/useBulkTaskActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface AssigneeBulkPopoverProps {
  children: ReactNode;
  taskIds: string[];
  workspaceId: string;
  onSuccess: () => void;
}

export function AssigneeBulkPopover({
  children,
  taskIds,
  workspaceId,
  onSuccess,
}: AssigneeBulkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const assignTasks = useBulkAssignTasks();

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleApply = () => {
    if (selectedUsers.length === 0) return;
    assignTasks.mutate(
      { taskIds, assigneeIds: selectedUsers },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedUsers([]);
          onSuccess();
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            Adicionar responsáveis
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {members?.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                onClick={() => handleToggleUser(member.user_id)}
              >
                <Checkbox
                  checked={selectedUsers.includes(member.user_id)}
                  onCheckedChange={() => handleToggleUser(member.user_id)}
                />
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">
                  {member.profile?.full_name || "Sem nome"}
                </span>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={handleApply}
            disabled={selectedUsers.length === 0 || assignTasks.isPending}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
