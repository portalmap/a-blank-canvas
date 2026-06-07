import { useState } from "react";
import { Columns, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AVAILABLE_COLUMNS,
  ColumnId,
  useSaveColumnPreferences,
} from "@/hooks/useColumnPreferences";

interface ColumnSelectorProps {
  listId: string | null;
  scope: "list" | "everything";
  visibleColumns: ColumnId[];
  columnOrder: ColumnId[];
  onColumnsChange: (columns: ColumnId[]) => void;
  onOrderChange: (order: ColumnId[]) => void;
}

export function ColumnSelector({
  listId,
  scope,
  visibleColumns,
  columnOrder,
  onColumnsChange,
  onOrderChange,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const savePreferences = useSaveColumnPreferences();

  const handleColumnToggle = (columnId: ColumnId, checked: boolean) => {
    const newColumns = checked
      ? [...visibleColumns, columnId]
      : visibleColumns.filter((c) => c !== columnId);

    onColumnsChange(newColumns);

    savePreferences.mutate({
      listId,
      scope,
      visibleColumns: newColumns,
      columnOrder,
    });
  };

  const sortedColumns = [...AVAILABLE_COLUMNS].sort((a, b) => {
    const indexA = columnOrder.indexOf(a.id);
    const indexB = columnOrder.indexOf(b.id);
    return indexA - indexB;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Columns className="h-4 w-4" />
          Colunas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Colunas visíveis</div>
          <div className="space-y-2">
            {sortedColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 py-1"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-50" />
                <Checkbox
                  id={`column-${column.id}`}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={(checked) =>
                    handleColumnToggle(column.id, checked as boolean)
                  }
                  disabled={!column.canHide}
                />
                <Label
                  htmlFor={`column-${column.id}`}
                  className={`text-sm cursor-pointer ${
                    !column.canHide ? "text-muted-foreground" : ""
                  }`}
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
