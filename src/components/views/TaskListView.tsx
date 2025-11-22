import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge-variant';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  status_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  space_id: string | null;
  folder_id: string | null;
  list_id: string | null;
}

interface TaskListViewProps {
  tasks: Task[];
  statuses: Record<string, { name: string; color: string }>;
}

export const TaskListView = ({ tasks, statuses }: TaskListViewProps) => {
  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tarefa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Atrasada</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  <StatusBadge status={statuses[task.status_id]?.name || 'Sem status'} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  {task.start_date ? format(new Date(task.start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </TableCell>
                <TableCell>
                  {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </TableCell>
                <TableCell>
                  {isOverdue(task.due_date) ? (
                    <span className="text-destructive font-medium">Sim</span>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};