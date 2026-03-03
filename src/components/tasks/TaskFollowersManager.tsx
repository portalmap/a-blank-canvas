import { EntityFollowersManager } from '@/components/followers/EntityFollowersManager';

interface TaskFollowersManagerProps {
  taskId: string;
  workspaceId: string;
}

export const TaskFollowersManager = ({ taskId, workspaceId }: TaskFollowersManagerProps) => {
  return (
    <EntityFollowersManager
      entityType="task"
      entityId={taskId}
      workspaceId={workspaceId}
    />
  );
};
