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
      className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => onSort(columnId)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-foreground/70" />
          ) : (
            <ArrowDown className="h-3 w-3 text-foreground/70" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </div>
    </TableHead>
  );
}
