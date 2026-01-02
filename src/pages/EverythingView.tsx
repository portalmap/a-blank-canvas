import { useState, useMemo, useEffect } from 'react';
import { Search, User, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useFilteredAllTasks } from '@/hooks/useFilteredAllTasks';
import { useUserRole } from '@/hooks/useUserRole';
import { useStatuses, useDefaultStatus } from '@/hooks/useStatuses';
import { EverythingTableView } from '@/components/everything/EverythingTableView';
import { EverythingFilters, FilterState } from '@/components/everything/EverythingFilters';
import { GroupBySelector, GroupByOption } from '@/components/everything/GroupBySelector';
import { AssigneeFilterPanel } from '@/components/everything/AssigneeFilterPanel';
import { ColumnSelector } from '@/components/tasks/ColumnSelector';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { useColumnPreferences, DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_ORDER, ColumnId, SortConfig } from '@/hooks/useColumnPreferences';
import { useTaskSorting } from '@/hooks/useTaskSorting';

export default function EverythingView() {
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  
  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  const { data: tasks = [], isLoading } = useFilteredAllTasks(selectedWorkspaceId ?? undefined);
  const { data: roleInfo } = useUserRole();
  const { data: statuses = [] } = useStatuses(selectedWorkspaceId ?? undefined);
  const { data: defaultStatus } = useDefaultStatus(selectedWorkspaceId ?? undefined);

  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('due_date');
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    priorities: [],
    showCompleted: false,
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [showAssigneePanel, setShowAssigneePanel] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Column preferences
  const { data: columnPrefs } = useColumnPreferences(null, 'everything');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    if (columnPrefs) {
      setVisibleColumns(columnPrefs.visible_columns);
      setColumnOrder(columnPrefs.column_order);
    }
  }, [columnPrefs]);

  // Calculate assignee statistics
  const assigneeStats = useMemo(() => {
    const stats: Record<string, { id: string; full_name: string | null; avatar_url: string | null; taskCount: number }> = {};
    let unassignedCount = 0;

    tasks.forEach((task) => {
      if (task.assignees.length === 0) {
        unassignedCount++;
      } else {
        task.assignees.forEach((assignee) => {
          if (!stats[assignee.id]) {
            stats[assignee.id] = { ...assignee, taskCount: 0 };
          }
          stats[assignee.id].taskCount++;
        });
      }
    });

    return {
      assignees: Object.values(stats).sort((a, b) => b.taskCount - a.taskCount),
      unassignedCount,
    };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && task.status) {
        if (!filters.statuses.includes(task.status.id)) return false;
      }

      // Priority filter
      if (filters.priorities.length > 0) {
        if (!filters.priorities.includes(task.priority)) return false;
      }

      // Completed filter
      if (!filters.showCompleted && task.completed_at) {
        return false;
      }

      // Assignee filter
      if (selectedAssignees.length > 0 || includeUnassigned) {
        const hasSelectedAssignee = task.assignees.some((a) => selectedAssignees.includes(a.id));
        const isUnassigned = task.assignees.length === 0;
        
        if (!hasSelectedAssignee && !(includeUnassigned && isUnassigned)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, filters, selectedAssignees, includeUnassigned]);

  // Apply sorting
  const sortedTasks = useTaskSorting(filteredTasks, sortConfig);

  const handleSortChange = (column: ColumnId) => {
    setSortConfig((prev) => {
      if (prev?.column === column) {
        return prev.direction === 'asc'
          ? { column, direction: 'desc' }
          : null;
      }
      return { column, direction: 'asc' };
    });
  };

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(assigneeId)
        ? prev.filter((id) => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const availableStatuses = useMemo(() => {
    return statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  }, [statuses]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Tudo</h1>
              </div>
              <div className="flex items-center gap-3 ml-8">
                <Select 
                  value={selectedWorkspaceId ?? ''} 
                  onValueChange={setSelectedWorkspaceId}
                  disabled={workspacesLoading}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecione um workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {roleInfo?.isAdmin 
                    ? 'Todas as tarefas do workspace' 
                    : 'Suas tarefas atribuídas'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar tarefas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>

          {/* Tabs & Filters */}
          <div className="flex items-center justify-between">
            <Tabs defaultValue="list" className="w-auto">
              <TabsList>
                <TabsTrigger value="list">Lista</TabsTrigger>
                <TabsTrigger value="kanban" disabled>Quadro</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <GroupBySelector value={groupBy} onChange={setGroupBy} />
              <EverythingFilters
                filters={filters}
                onChange={setFilters}
                availableStatuses={availableStatuses}
              />
              <ColumnSelector
                listId={null}
                scope="everything"
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onColumnsChange={setVisibleColumns}
                onOrderChange={setColumnOrder}
              />
              <Button
                variant={showAssigneePanel ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-2"
                onClick={() => setShowAssigneePanel(!showAssigneePanel)}
              >
                <User className="h-4 w-4" />
                Responsável
                {(selectedAssignees.length > 0 || includeUnassigned) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                    {selectedAssignees.length + (includeUnassigned ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando tarefas...</p>
            </div>
          ) : (
            <EverythingTableView 
              tasks={sortedTasks} 
              groupBy={groupBy}
              selectedTaskIds={selectedTaskIds}
              onSelectionChange={setSelectedTaskIds}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
            />
          )}
        </div>
      </div>

      {/* Assignee Filter Panel */}
      {showAssigneePanel && (
        <AssigneeFilterPanel
          assignees={assigneeStats.assignees}
          selectedAssignees={selectedAssignees}
          unassignedCount={assigneeStats.unassignedCount}
          includeUnassigned={includeUnassigned}
          onToggleAssignee={toggleAssignee}
          onToggleUnassigned={() => setIncludeUnassigned(!includeUnassigned)}
          onClose={() => setShowAssigneePanel(false)}
        />
      )}

      <BulkActionsBar
        selectedTaskIds={selectedTaskIds}
        workspaceId={selectedWorkspaceId || ''}
        defaultStatusId={defaultStatus?.id}
        onClearSelection={() => setSelectedTaskIds([])}
      />
    </div>
  );
}
