import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ParsedTask } from './useCSVImport';
import { cn } from '@/lib/utils';

interface CSVPreviewStepProps {
  tasks: ParsedTask[];
  isImporting: boolean;
  onBack: () => void;
  onImport: () => void;
}

export const CSVPreviewStep = ({
  tasks,
  isImporting,
  onBack,
  onImport,
}: CSVPreviewStepProps) => {
  const tasksWithWarnings = tasks.filter(t => t.warnings.length > 0);
  const previewTasks = tasks.slice(0, 10);
  
  const getPriorityLabel = (priority?: string) => {
    if (!priority) return null;
    const lower = priority.toLowerCase();
    if (lower.includes('baixa') || lower.includes('low')) return 'Baixa';
    if (lower.includes('alta') || lower.includes('high')) return 'Alta';
    if (lower.includes('urgente') || lower.includes('urgent')) return 'Urgente';
    return 'Média';
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Prévia da importação</h3>
        <p className="text-sm text-muted-foreground">
          Revise as tarefas antes de importar. Mostrando {previewTasks.length} de {tasks.length} tarefas.
        </p>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>{tasks.length} tarefas para importar</span>
        </div>
        {tasksWithWarnings.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>{tasksWithWarnings.length} com avisos</span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Data Entrega</TableHead>
                <TableHead>Responsáveis</TableHead>
                <TableHead>Avisos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewTasks.map((task, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell>
                    {task.status ? (
                      <Badge variant="outline">{task.status}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Padrão</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getPriorityLabel(task.priority) || (
                      <span className="text-muted-foreground text-sm">Média</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date || (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.assignees?.length ? (
                      <span className="text-sm">{task.assignees.join(', ')}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.warnings.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {task.warnings.map((w, i) => (
                          <span key={i} className="text-xs text-yellow-600 dark:text-yellow-500">
                            {w}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {tasks.length > 10 && (
        <p className="text-center text-sm text-muted-foreground">
          E mais {tasks.length - 10} tarefas...
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isImporting}>
          Voltar
        </Button>
        <Button onClick={onImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            `Importar ${tasks.length} tarefas`
          )}
        </Button>
      </div>
    </div>
  );
};
