import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useFolders } from '@/hooks/useFolders';
import { useList } from '@/hooks/useLists';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ArrowLeft, PanelRightClose, PanelRight } from 'lucide-react';
import { TaskMainContent } from '@/components/tasks/TaskMainContent';
import { TaskActivityPanel } from '@/components/tasks/TaskActivityPanel';
import { useState, useEffect } from 'react';
import { useCreateTaskActivity } from '@/hooks/useTaskActivities';
import { cn } from '@/lib/utils';

const useTask = (taskId?: string) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status_id,
          priority,
          assignee_id,
          start_date,
          due_date,
          list_id,
          workspace_id,
          parent_id,
          completed_at,
          created_at,
          assignee:profiles(full_name, avatar_url),
          status:statuses(name, color)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!taskId,
  });
};

const TaskView = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [hasLoggedCreation, setHasLoggedCreation] = useState(false);

  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const { data: currentList } = useList(task?.list_id);
  const { data: spaces } = useSpaces(activeWorkspace?.id);
  const { data: folders } = useFolders(currentList?.space_id);
  const createActivity = useCreateTaskActivity();

  const currentSpace = spaces?.find(s => s.id === currentList?.space_id);
  const currentFolder = folders?.find(f => f.id === currentList?.folder_id);

  // Registrar atividade de criação se for a primeira visita
  useEffect(() => {
    const checkAndLogCreation = async () => {
      if (!task || hasLoggedCreation) return;

      // Verificar se já existe atividade de criação
      const { data: existingActivity } = await supabase
        .from('task_activities')
        .select('id')
        .eq('task_id', task.id)
        .eq('activity_type', 'task.created')
        .limit(1);

      if (!existingActivity || existingActivity.length === 0) {
        // Registrar criação
        await createActivity.mutateAsync({
          taskId: task.id,
          activityType: 'task.created',
        });
      }
      setHasLoggedCreation(true);
    };

    checkAndLogCreation();
  }, [task?.id, hasLoggedCreation]);

  if (taskLoading || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {activeWorkspace && currentSpace && currentList && (
            <Breadcrumb>
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
                  <BreadcrumbLink onClick={() => navigate(`/list/${currentList.id}`)}>
                    {currentList.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[200px] truncate">
                    {task.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowActivityPanel(!showActivityPanel)}
              title={showActivityPanel ? 'Ocultar atividades' : 'Mostrar atividades'}
            >
              {showActivityPanel ? (
                <PanelRightClose className="h-5 w-5" />
              ) : (
                <PanelRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task Content */}
        <ScrollArea className={cn(
          "flex-1 transition-all duration-200",
          showActivityPanel ? "lg:w-[65%]" : "w-full"
        )}>
          <div className="p-6 max-w-3xl mx-auto">
            <TaskMainContent task={task} />
          </div>
        </ScrollArea>

        {/* Activity Panel */}
        {showActivityPanel && (
          <div className="hidden lg:flex w-[35%] border-l bg-muted/30">
            <TaskActivityPanel 
              taskId={task.id} 
              workspaceId={task.workspace_id}
              taskTitle={task.title}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskView;
