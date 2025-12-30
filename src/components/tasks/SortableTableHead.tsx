import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnId, SortConfig } from '@/hooks/useColumnPreferences';

interface SortableTableHeadProps {
  columnId: ColumnId;
  label: string;
  sortConfig: SortConfig | null;
  onSort: (column: ColumnId) => void;
  className?: string;
}

export function SortableTableHead({ 
  columnId, 
  label, 
  sortConfig, 
  onSort, 
  className 
}: SortableTableHeadProps) {
  const isActive = sortConfig?.column === columnId;
  const direction = isActive ? sortConfig.direction : null;

  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(columnId)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}
