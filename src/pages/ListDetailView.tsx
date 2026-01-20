import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolders } from '@/hooks/useFolders';
import { useList } from '@/hooks/useLists';
import { useTasksWithAssignees, TaskWithAssignees } from '@/hooks/useTasksWithAssignees';
import { useCreateTask } from '@/hooks/useTasks';
import { useStatusesForScope, useDefaultStatusForScope } from '@/hooks/useStatuses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plus, AlertCircle, Search, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskListView } from '@/components/views/TaskListView';
import { TaskKanbanView } from '@/components/views/TaskKanbanView';
import { TaskSprintView } from '@/components/views/TaskSprintView';
import QuickAutomationButtons from '@/components/automations/QuickAutomationButtons';
import { GroupBySelector, GroupByOption } from '@/components/everything/GroupBySelector';
import { EverythingFilters, FilterState } from '@/components/everything/EverythingFilters';
import { AssigneeFilterPanel } from '@/components/everything/AssigneeFilterPanel';
import { Badge } from '@/components/ui/badge';
import { ColumnSelector } from '@/components/tasks/ColumnSelector';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { useColumnPreferences, DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_ORDER, ColumnId, SortConfig } from '@/hooks/useColumnPreferences';
import { useTaskSorting } from '@/hooks/useTaskSorting';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';

const ListDetailView = () => {
  const { listId } = useParams<{ listId: string }>();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const { data: currentList, isLoading: listLoading } = useList(listId);
  const { data: tasksWithAssignees, isLoading: tasksLoading } = useTasksWithAssignees(listId);
  const { data: statuses } = useStatusesForScope('list', listId, activeWorkspace?.id);
  const { data: defaultStatus } = useDefaultStatusForScope('list', listId, activeWorkspace?.id);
  const createTask = useCreateTask();

  const [selectedTaskIdForDrawer, setSelectedTaskIdForDrawer] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    priorities: [],
    tags: [],
    showCompleted: true,
    viewMode: 'assigned',
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [showAssigneePanel, setShowAssigneePanel] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Column preferences
  const { data: columnPrefs } = useColumnPreferences(listId || null, 'list');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);

  // Update local state when preferences load
  useEffect(() => {
    if (columnPrefs) {
      setVisibleColumns(columnPrefs.visible_columns);
      setColumnOrder(columnPrefs.column_order);
    }
  }, [columnPrefs]);
  
  const { data: spaces } = useSpaces(activeWorkspace?.id);
  const { data: folders } = useFolders(currentList?.space_id);
  
  const currentSpace = spaces?.find(s => s.id === currentList?.space_id);
  const currentFolder = folders?.find(f => f.id === currentList?.folder_id);

  // Calculate assignee statistics
  const assigneeStats = useMemo(() => {
    if (!tasksWithAssignees) return { assignees: [], unassignedCount: 0 };

    const assigneeMap = new Map<string, { id: string; full_name: string | null; avatar_url: string | null; taskCount: number }>();
    let unassignedCount = 0;

    tasksWithAssignees.forEach((task) => {
      if (task.assignees.length === 0) {
        unassignedCount++;
      } else {
        task.assignees.forEach((assignee) => {
          const existing = assigneeMap.get(assignee.id);
          if (existing) {
            existing.taskCount++;
          } else {
            assigneeMap.set(assignee.id, {
              id: assignee.id,
              full_name: assignee.full_name,
              avatar_url: assignee.avatar_url,
              taskCount: 1,
            });
          }
        });
      }
    });

    return {
      assignees: Array.from(assigneeMap.values()),
      unassignedCount,
    };
  }, [tasksWithAssignees]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasksWithAssignees) return [];

    return tasksWithAssignees.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(task.status_id)) {
        return false;
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }

      // Completed filter
      if (!filters.showCompleted && task.completed_at) {
        return false;
      }

      // Assignee filter
      if (selectedAssignees.length > 0 || includeUnassigned) {
        const hasSelectedAssignee = task.assignees.some((a) => selectedAssignees.includes(a.id));
        const isUnassigned = task.assignees.length === 0;

        if (includeUnassigned && selectedAssignees.length > 0) {
          if (!hasSelectedAssignee && !isUnassigned) return false;
        } else if (includeUnassigned) {
          if (!isUnassigned) return false;
        } else if (selectedAssignees.length > 0) {
          if (!hasSelectedAssignee) return false;
        }
      }

      return true;
    });
  }, [tasksWithAssignees, searchQuery, filters, selectedAssignees, includeUnassigned]);

  // Available statuses for filter
  const availableStatuses = useMemo(() => {
    if (!statuses) return [];
    return statuses.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  }, [statuses]);

  const handleToggleAssignee = (assigneeId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(assigneeId)
        ? prev.filter((id) => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const handleToggleUnassigned = () => {
    setIncludeUnassigned((prev) => !prev);
  };

  const activeAssigneeFilterCount = selectedAssignees.length + (includeUnassigned ? 1 : 0);

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

  const handleCreateTask = async () => {
    if (!activeWorkspace || !listId || !defaultStatus) return;

    const newTask = await createTask.mutateAsync({
      workspaceId: activeWorkspace.id,
      listId,
      statusId: defaultStatus.id,
      title: 'Nova Tarefa',
      description: null,
      priority: 'medium',
    });

    if (newTask) {
      setSelectedTaskIdForDrawer(newTask.id);
      setIsDrawerOpen(true);
    }
  };

  if (!activeWorkspace || listLoading || !currentList || !currentSpace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const viewMode = (currentList.default_view || 'list') as 'list' | 'kanban' | 'sprint';

  // Convert sorted tasks to the format expected by views
  const tasksForViews = sortedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    due_date: task.due_date,
    start_date: task.start_date,
    completed_at: task.completed_at,
    created_at: task.created_at,
    updated_at: task.updated_at,
    list_id: task.list_id,
    workspace_id: task.workspace_id,
    parent_id: task.parent_id,
    status_id: task.status_id,
    status: task.status,
    assignee_id: task.assignees[0]?.id || null,
    assignee: task.assignees[0] || null,
  }));

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col gap-6 container mx-auto p-6 overflow-hidden">
        <Breadcrumb className="flex-shrink-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('/')}>
                {activeWorkspace.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate(`/space/${currentSpace.id}`)}>
                {currentSpace.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentFolder && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate(`/folder/${currentFolder.id}`)}>
                    {currentFolder.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentList.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-start gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{currentList.name}</h1>
            {currentList.description && (
              <p className="text-muted-foreground mt-1">{currentList.description}</p>
            )}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar tarefas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <QuickAutomationButtons
              workspaceId={activeWorkspace.id}
              scopeType="list"
              scopeId={listId!}
              scopeName={currentList.name}
            />
            <Button onClick={handleCreateTask} disabled={createTask.isPending || !defaultStatus}>
              {createTask.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Nova Tarefa
            </Button>
          </div>
        </div>

        {!defaultStatus && statuses !== undefined && (
          <Alert variant="destructive" className="flex-shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status não configurados</AlertTitle>
            <AlertDescription>
              Este workspace não possui status configurados. Contate um administrador para criar os status padrão.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue={viewMode} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <TabsList>
              <TabsTrigger value="list">Lista</TabsTrigger>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="sprint">Sprint</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <GroupBySelector value={groupBy} onChange={setGroupBy} />
              <EverythingFilters
                filters={filters}
                onChange={setFilters}
                availableStatuses={availableStatuses}
              />
              <ColumnSelector
                listId={listId || null}
                scope="list"
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onColumnsChange={setVisibleColumns}
                onOrderChange={setColumnOrder}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-dashed"
                onClick={() => setShowAssigneePanel(!showAssigneePanel)}
              >
                <User className="h-3.5 w-3.5" />
                <span>Responsável</span>
                {activeAssigneeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {activeAssigneeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="list" className="flex-1 overflow-auto mt-0">
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <TaskListView 
                tasks={tasksForViews} 
                workspaceId={activeWorkspace.id} 
                listId={listId!}
                groupBy={groupBy}
                tasksWithAssignees={sortedTasks}
                selectedTaskIds={selectedTaskIds}
                onSelectionChange={setSelectedTaskIds}
                sortConfig={sortConfig}
                onSortChange={handleSortChange}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
              />
            )}
          </TabsContent>

          <TabsContent value="kanban" className="flex-1 min-h-0 overflow-hidden mt-0">
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <TaskKanbanView tasks={tasksForViews} statuses={statuses || []} />
            )}
          </TabsContent>

          <TabsContent value="sprint" className="flex-1 overflow-auto mt-0">
            {tasksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <TaskSprintView tasks={tasksForViews} />
            )}
          </TabsContent>
        </Tabs>

        <TaskDetailDrawer
          taskId={selectedTaskIdForDrawer}
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
        />
      </div>

      {showAssigneePanel && (
        <AssigneeFilterPanel
          assignees={assigneeStats.assignees}
          selectedAssignees={selectedAssignees}
          unassignedCount={assigneeStats.unassignedCount}
          includeUnassigned={includeUnassigned}
          onToggleAssignee={handleToggleAssignee}
          onToggleUnassigned={handleToggleUnassigned}
          onClose={() => setShowAssigneePanel(false)}
        />
      )}

      <BulkActionsBar
        selectedTaskIds={selectedTaskIds}
        workspaceId={activeWorkspace.id}
        listId={listId}
        defaultStatusId={defaultStatus?.id}
        onClearSelection={() => setSelectedTaskIds([])}
      />
    </div>
  );
};

export default ListDetailView;
