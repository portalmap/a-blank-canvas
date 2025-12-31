import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStatusesForScope } from "@/hooks/useStatuses";
import { useBulkUpdateStatus } from "@/hooks/useBulkTaskActions";
import { cn } from "@/lib/utils";

interface StatusBulkPopoverProps {
  children: ReactNode;
  taskIds: string[];
  workspaceId: string;
  listId?: string;
  onSuccess: () => void;
}

export function StatusBulkPopover({
  children,
  taskIds,
  workspaceId,
  listId,
  onSuccess,
}: StatusBulkPopoverProps) {
  const [open, setOpen] = useState(false);
  const { data: statuses } = useStatusesForScope('list', listId, workspaceId);
  const updateStatus = useBulkUpdateStatus();

  const handleSelectStatus = (statusId: string) => {
    updateStatus.mutate(
      { taskIds, statusId },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess();
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground px-2 pb-1">
            Selecionar status
          </div>
          {statuses?.map((status) => (
            <button
              key={status.id}
              onClick={() => handleSelectStatus(status.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
              )}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: status.color || "#94a3b8" }}
              />
              <span className="truncate">{status.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
