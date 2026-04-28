import { X, Archive, Trash2, Copy, FolderInput, Tag, Calendar, Users, CircleDot, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBulkPopover } from "./bulk-actions/StatusBulkPopover";
import { AssigneeBulkPopover } from "./bulk-actions/AssigneeBulkPopover";
import { DatesBulkPopover } from "./bulk-actions/DatesBulkPopover";
import { TagsBulkPopover } from "./bulk-actions/TagsBulkPopover";
import { ConfirmBulkDeleteDialog } from "./bulk-actions/ConfirmBulkDeleteDialog";
import { useState, useEffect, useRef, useCallback } from "react";
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

const STORAGE_KEY = "bulk-actions-bar-position";

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

  const barRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const clampPosition = useCallback((x: number, y: number) => {
    const el = barRef.current;
    const w = el?.offsetWidth ?? 600;
    const h = el?.offsetHeight ?? 50;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return;
      const next = clampPosition(
        e.clientX - dragState.current.offsetX,
        e.clientY - dragState.current.offsetY
      );
      setPosition(next);
    };
    const onUp = () => {
      setIsDragging(false);
      dragState.current = null;
      try {
        if (position) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      } catch {}
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDragging, clampPosition, position]);

  // Keep persisted position whenever it changes after a drag
  useEffect(() => {
    if (!isDragging && position) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      } catch {}
    }
  }, [position, isDragging]);

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPosition]);

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

  const positionedStyle: React.CSSProperties = position
    ? { top: position.y, left: position.x, bottom: "auto", transform: "none" }
    : { bottom: "1rem", left: "50%", transform: "translateX(-50%)" };

  return (
    <>
      <div
        ref={barRef}
        className="fixed z-50"
        style={positionedStyle}
      >
        <div
          className={`flex items-center gap-2 bg-background/95 backdrop-blur border rounded-lg shadow-xl px-2 py-2 ${
            isDragging ? "select-none" : ""
          }`}
        >
          <div
            onPointerDown={handlePointerDown}
            className={`flex items-center justify-center h-8 w-6 rounded hover:bg-muted ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Arraste para mover"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <span className="text-sm font-medium whitespace-nowrap pl-1">
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
