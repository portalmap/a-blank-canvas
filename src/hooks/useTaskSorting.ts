import { useMemo } from 'react';
import type { SortConfig } from './useColumnPreferences';

interface TaskLike {
  id: string;
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  start_date?: string | null;
  completed_at?: string | null;
  status?: {
    name?: string;
    color?: string | null;
  } | null;
  assignee?: {
    full_name?: string | null;
  } | null;
  assignees?: Array<{ full_name?: string | null }>;
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function compareStrings(a: string | null | undefined, b: string | null | undefined, direction: 'asc' | 'desc'): number {
  const aVal = a || '';
  const bVal = b || '';
  const result = aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

function compareDates(a: string | null | undefined, b: string | null | undefined, direction: 'asc' | 'desc'): number {
  if (!a && !b) return 0;
  if (!a) return direction === 'asc' ? 1 : -1;
  if (!b) return direction === 'asc' ? -1 : 1;
  
  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();
  const result = dateA - dateB;
  return direction === 'asc' ? result : -result;
}

function comparePriority(a: string | undefined, b: string | undefined, direction: 'asc' | 'desc'): number {
  const aVal = PRIORITY_ORDER[a || 'medium'] || 2;
  const bVal = PRIORITY_ORDER[b || 'medium'] || 2;
  const result = aVal - bVal;
  return direction === 'asc' ? result : -result;
}

export function useTaskSorting<T extends TaskLike>(
  tasks: T[],
  sortConfig: SortConfig | null
): T[] {
  return useMemo(() => {
    if (!sortConfig || !tasks.length) return tasks;

    const { column, direction } = sortConfig;

    return [...tasks].sort((a, b) => {
      switch (column) {
        case 'title':
          return compareStrings(a.title, b.title, direction);
        
        case 'status':
          return compareStrings(a.status?.name, b.status?.name, direction);
        
        case 'priority':
          return comparePriority(a.priority, b.priority, direction);
        
        case 'due_date':
          return compareDates(a.due_date, b.due_date, direction);
        
        case 'start_date':
          return compareDates(a.start_date, b.start_date, direction);
        
        case 'assignee':
          const aName = a.assignees?.[0]?.full_name || a.assignee?.full_name;
          const bName = b.assignees?.[0]?.full_name || b.assignee?.full_name;
          return compareStrings(aName, bName, direction);
        
        default:
          return 0;
      }
    });
  }, [tasks, sortConfig]);
}
