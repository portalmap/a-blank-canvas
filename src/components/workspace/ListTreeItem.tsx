import { useState } from "react";
import { List, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStatuses } from "@/hooks/useStatuses";
import { useCreateTask } from "@/hooks/useTasks";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ListTreeItemProps {
  list: {
    id: string;
    name: string;
    workspace_id: string;
  };
}

export function ListTreeItem({ list }: ListTreeItemProps) {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const { data: statuses } = useStatuses(list.workspace_id);
  const createTask = useCreateTask();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const handleCreateTask = async () => {
    if (!activeWorkspace || !newTaskTitle.trim() || !statuses || statuses.length === 0) return;

    const defaultStatus = statuses.find(s => s.is_default) || statuses[0];

    await createTask.mutateAsync({
      workspaceId: activeWorkspace.id,
      listId: list.id,
      statusId: defaultStatus.id,
      title: newTaskTitle,
      description: newTaskDescription,
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setIsTaskDialogOpen(false);
    navigate(`/list/${list.id}`);
  };

  return (
    <>
      <div className="flex items-center group">
        <NavLink
          to={`/list/${list.id}`}
          className="flex items-center gap-2 flex-1 px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <List className="h-4 w-4 flex-shrink-0 ml-4" />
          <span className="truncate">{list.name}</span>
        </NavLink>

        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsTaskDialogOpen(true);
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Dialog for creating task */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa em {list.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Título</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Implementar autenticação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Descrição (opcional)</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Descreva os detalhes da tarefa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={!newTaskTitle.trim() || createTask.isPending}
            >
              Criar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
