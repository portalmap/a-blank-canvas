import { X, Archive, Trash2, Copy, FolderInput, Tag, Calendar, Users, CircleDot, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBulkPopover } from "./bulk-actions/StatusBulkPopover";
import { AssigneeBulkPopover } from "./bulk-actions/AssigneeBulkPopover";
import { DatesBulkPopover } from "./bulk-actions/DatesBulkPopover";
import { TagsBulkPopover } from "./bulk-actions/TagsBulkPopover";
import { ConfirmBulkDeleteDialog } from "./bulk-actions/ConfirmBulkDeleteDialog";
import { useState, useRef, useEffect, useCallback } from "react";
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
const MARGIN = 8;

interface Position {
  x: number;
  y: number;
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

  const barRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const clampToViewport = useCallback((pos: Position): Position => {
    const el = barRef.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN);
    return {
      x: Math.min(Math.max(MARGIN, pos.x), maxX),
      y: Math.min(Math.max(MARGIN, pos.y), maxY),
    };
  }, []);

  // Load saved position once the bar is mounted (and selection becomes active)
  useEffect(() => {
    if (selectedTaskIds.length === 0) return;
    if (position !== null) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Position;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Validate within viewport; otherwise fall back to default
          requestAnimationFrame(() => {
            const clamped = clampToViewport(parsed);
            const inBounds =
              parsed.x >= MARGIN &&
              parsed.y >= MARGIN &&
              parsed.x <= window.innerWidth - MARGIN &&
              parsed.y <= window.innerHeight - MARGIN;
            setPosition(inBounds ? clamped : null);
          });
          return;
        }
      }
    } catch {}
    // Default: bottom-center
    requestAnimationFrame(() => {
      const el = barRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setPosition({
        x: Math.max(MARGIN, Math.round((window.innerWidth - w) / 2)),
        y: Math.max(MARGIN, window.innerHeight - h - 16),
      });
    });
  }, [selectedTaskIds.length, position, clampToViewport]);

  // Re-clamp on viewport resize
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => (prev ? clampToViewport(prev) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  const handlePointerDown = useCallback(
    (clientX: number, clientY: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragState.current = {
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top,
      };
    },
    []
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState.current) return;
      const next = clampToViewport({
        x: clientX - dragState.current.offsetX,
        y: clientY - dragState.current.offsetY,
      });
      setPosition(next);
    },
    [clampToViewport]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragState.current) return;
    dragState.current = null;
    setPosition((prev) => {
      if (prev) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        } catch {}
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => handlePointerUp();
    const onTouchMove = (e: TouchEvent) => {
      if (!dragState.current) return;
      const t = e.touches[0];
      if (!t) return;
      handlePointerMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => handlePointerUp();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [handlePointerMove, handlePointerUp]);

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

  const positionStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, visibility: "visible" }
    : { left: "50%", bottom: 16, transform: "translateX(-50%)", visibility: "hidden" };

  return (
    <>
      <div ref={barRef} className="fixed z-50" style={positionStyle}>
        <div className="flex items-center gap-2 bg-background border rounded-lg shadow-lg px-2 py-2">
          <button
            type="button"
            aria-label="Mover barra"
            className="flex items-center justify-center h-8 w-6 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground select-none touch-none"
            onMouseDown={(e) => {
              e.preventDefault();
              handlePointerDown(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) handlePointerDown(t.clientX, t.clientY);
            }}
          >
            <GripVertical className="h-4 w-4" />
          </button>

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
