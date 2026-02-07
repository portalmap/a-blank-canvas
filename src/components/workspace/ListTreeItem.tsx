import { useState } from "react";
import { List, Plus, MoreHorizontal, Trash2, Pencil, Link, Move, Copy, Archive, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useStatuses } from "@/hooks/useStatuses";
import { useCreateTask } from "@/hooks/useTasks";
import { useDeleteList, useUpdateList } from "@/hooks/useLists";
import { useDuplicateList } from "@/hooks/useDuplicate";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MoveListDialog } from "./MoveListDialog";
import { DuplicateDialog } from "./DuplicateDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ListTreeItemProps {
  list: {
    id: string;
    name: string;
    workspace_id: string;
    space_id: string;
    folder_id?: string | null;
  };
}

export function ListTreeItem({ list }: ListTreeItemProps) {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const { data: statuses } = useStatuses(list.workspace_id);
  const createTask = useCreateTask();
  const deleteList = useDeleteList();
  const updateList = useUpdateList();
  const duplicateList = useDuplicateList();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newName, setNewName] = useState('');

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

  const handleRename = async () => {
    if (!newName.trim() || newName === list.name) return;
    
    await updateList.mutateAsync({
      id: list.id,
      name: newName,
    });
    
    setIsRenameDialogOpen(false);
  };

  return (
    <>
      <div className="flex items-center group min-w-0">
        <NavLink
          to={`/list/${list.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden px-2 py-1.5 hover:bg-sidebar-accent rounded-md text-sm"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <List className="h-4 w-4 flex-shrink-0 ml-4" />
          <span className="truncate">{list.name}</span>
        </NavLink>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsTaskDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/automations?scopeType=list&scopeId=${list.id}`)}>
              <Zap className="mr-2 h-4 w-4" />
              Ver Automações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              setNewName(list.name);
              setIsRenameDialogOpen(true);
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
              <Link className="mr-2 h-4 w-4" />
              Copiar Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsMoveDialogOpen(true)}>
              <Move className="mr-2 h-4 w-4" />
              Mover
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDuplicateDialogOpen(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info('Função em desenvolvimento')}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Dialog for renaming list */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Lista</DialogTitle>
            <DialogDescription>
              Digite o novo nome para a lista
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-list">Nome</Label>
              <Input
                id="rename-list"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da lista"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRename} 
              disabled={!newName.trim() || newName === list.name || updateList.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for deleting list */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as tarefas dentro desta lista serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteList.mutate(list.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for moving list */}
      <MoveListDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        list={list}
      />

      {/* Dialog for duplicating list */}
      <DuplicateDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
        type="list"
        itemName={list.name}
        workspaceId={list.workspace_id}
        currentSpaceId={list.space_id}
        onDuplicate={async (targetSpaceIds, targetFolderId) => {
          await duplicateList.mutateAsync({
            listId: list.id,
            targetSpaceIds,
            targetFolderId,
          });
        }}
        isPending={duplicateList.isPending}
      />
    </>
  );
}
