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
import { useBulkDeleteTasks } from "@/hooks/useBulkTaskActions";

interface ConfirmBulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskIds: string[];
  onSuccess: () => void;
}

export function ConfirmBulkDeleteDialog({
  open,
  onOpenChange,
  taskIds,
  onSuccess,
}: ConfirmBulkDeleteDialogProps) {
  const deleteTasks = useBulkDeleteTasks();

  const handleDelete = () => {
    deleteTasks.mutate(
      { taskIds },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir tarefas</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir {taskIds.length} tarefa(s)? Esta ação
            não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTasks.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
