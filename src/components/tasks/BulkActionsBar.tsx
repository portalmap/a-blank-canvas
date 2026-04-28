import { X, Archive, Trash2, Copy, FolderInput, Tag, Calendar, Users, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBulkPopover } from "./bulk-actions/StatusBulkPopover";
import { AssigneeBulkPopover } from "./bulk-actions/AssigneeBulkPopover";
import { DatesBulkPopover } from "./bulk-actions/DatesBulkPopover";
import { TagsBulkPopover } from "./bulk-actions/TagsBulkPopover";
import { ConfirmBulkDeleteDialog } from "./bulk-actions/ConfirmBulkDeleteDialog";
import { useState } from "react";
import {
  useBulkArchiveTasks,
  useBulkCopyTasks,
} from "@/hooks/useBulkTaskActions";
import { useAuth } from "@/contexts/AuthContext";
import { BulkMoveDialog } from "./bulk-actions/BulkMoveDialog";

interface BulkActionsBarProps {
  selectedTaskIds: string[];
  workspaceId: string;
  listId?: string;
  onClearSelection: () => void;
  defaultStatusId?: string;
}

export function BulkActionsBar({
  selectedTaskIds,
  workspaceId,
  listId,
  onClearSelection,
  defaultStatusId,
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const archiveTasks = useBulkArchiveTasks();
  const copyTasks = useBulkCopyTasks();
  const { user } = useAuth();

  if (selectedTaskIds.length === 0) return null;

  const handleArchive = () => {
    archiveTasks.mutate(
      { taskIds: selectedTaskIds },
      { onSuccess: onClearSelection }
    );
  };

  const handleCopy = () => {
    if (!listId || !defaultStatusId || !user?.id) return;
    copyTasks.mutate(
      {
        taskIds: selectedTaskIds,
        listId,
        workspaceId,
        statusId: defaultStatusId,
        userId: user.id,
      },
      { onSuccess: onClearSelection }
    );
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-background border rounded-lg shadow-lg px-4 py-2">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedTaskIds.length} tarefa(s) selecionada(s)
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="h-4 w-px bg-border" />

          <StatusBulkPopover
            taskIds={selectedTaskIds}
            workspaceId={workspaceId}
            listId={listId}
            onSuccess={onClearSelection}
          >
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <CircleDot className="h-4 w-4" />
              Status
            </Button>
          </StatusBulkPopover>

          <AssigneeBulkPopover
            taskIds={selectedTaskIds}
            workspaceId={workspaceId}
            onSuccess={onClearSelection}
          >
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Users className="h-4 w-4" />
              Responsáveis
            </Button>
          </AssigneeBulkPopover>

          <DatesBulkPopover
            taskIds={selectedTaskIds}
            onSuccess={onClearSelection}
          >
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Calendar className="h-4 w-4" />
              Datas
            </Button>
          </DatesBulkPopover>

          <TagsBulkPopover
            taskIds={selectedTaskIds}
            workspaceId={workspaceId}
            onSuccess={onClearSelection}
          >
            <Button variant="ghost" size="sm" className="h-8 gap-1">
              <Tag className="h-4 w-4" />
              Etiquetas
            </Button>
          </TagsBulkPopover>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setShowMoveDialog(true)}
          >
            <FolderInput className="h-4 w-4" />
            Mover
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={handleCopy}
            disabled={!listId || !defaultStatusId || copyTasks.isPending}
          >
            <Copy className="h-4 w-4" />
            Copiar
          </Button>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={handleArchive}
            disabled={archiveTasks.isPending}
          >
            <Archive className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmBulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        taskIds={selectedTaskIds}
        onSuccess={onClearSelection}
      />

      <BulkMoveDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        taskIds={selectedTaskIds}
        workspaceId={workspaceId}
        onSuccess={onClearSelection}
      />
    </>
  );
}
