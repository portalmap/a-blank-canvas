import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountEntry, AccountSpaceEntry, AccountTaskEntry } from '@/hooks/useAccountProductivity';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountEntry;
  spaces: AccountSpaceEntry[];
  tasks: AccountTaskEntry[];
}

const classificationLabels: Record<string, { label: string; color: string }> = {
  early: { label: 'Antecipada', color: 'bg-green-500' },
  on_time: { label: 'No Prazo', color: 'bg-blue-500' },
  late: { label: 'Atrasada', color: 'bg-red-500' },
  no_due_date: { label: 'Sem Prazo', color: 'bg-gray-400' },
};

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-green-600 dark:text-green-400';
  if (score >= 100) return 'text-blue-600 dark:text-blue-400';
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const AccountReportDialog = ({
  open,
  onOpenChange,
  account,
  spaces,
  tasks,
}: AccountReportDialogProps) => {
  const [activeTab, setActiveTab] = useState('spaces');

  const earlyTasks = tasks.filter(t => t.classification === 'early');
  const onTimeTasks = tasks.filter(t => t.classification === 'on_time');
  const lateTasks = tasks.filter(t => t.classification === 'late');
  const noDueDateTasks = tasks.filter(t => t.classification === 'no_due_date');

  const renderTaskList = (taskList: AccountTaskEntry[]) => {
    if (taskList.length === 0) {
      return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa</p>;
    }

    return (
      <div className="space-y-2">
        {taskList.map((task) => (
          <div key={task.id} className="flex items-center justify-between p-2 rounded-lg border">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{task.spaceName}</span>
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    Prazo: {format(new Date(task.dueDate), 'dd/MM/yyyy')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right ml-2">
              <span className={cn('text-sm font-bold', getScoreColor(task.productivityScore))}>
                {task.productivityScore}%
              </span>
              <p className="text-xs text-muted-foreground">
                {task.completedAt && format(new Date(task.completedAt), 'dd/MM', { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={account.avatarUrl || undefined} />
              <AvatarFallback>{account.userName?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <span>Relatório Account — {account.userName}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {account.spaceCount} space{account.spaceCount !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {account.totalTasks} tarefa{account.totalTasks !== 1 ? 's' : ''}
                </Badge>
                <span className={cn('text-sm font-bold', getScoreColor(account.productivityScore))}>
                  {account.productivityScore}%
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="spaces">Spaces</TabsTrigger>
            <TabsTrigger value="early" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {earlyTasks.length}
            </TabsTrigger>
            <TabsTrigger value="on_time" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              {onTimeTasks.length}
            </TabsTrigger>
            <TabsTrigger value="late" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              {lateTasks.length}
            </TabsTrigger>
            <TabsTrigger value="no_due" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              {noDueDateTasks.length}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="spaces" className="mt-0">
              <div className="space-y-3">
                {spaces.map((space) => (
                  <div key={space.spaceId} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: space.spaceColor || '#94a3b8' }}
                        />
                        <span className="font-medium text-sm">{space.spaceName}</span>
                      </div>
                      <span className={cn('text-sm font-bold', getScoreColor(space.avgScore))}>
                        {space.avgScore}%
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>{space.early} antecipadas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>{space.onTime} no prazo</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span>{space.late} atrasadas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                        <span>{space.noDueDate} sem prazo</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {space.total} tarefas
                    </p>
                  </div>
                ))}
                {spaces.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum space</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="early" className="mt-0">
              {renderTaskList(earlyTasks)}
            </TabsContent>

            <TabsContent value="on_time" className="mt-0">
              {renderTaskList(onTimeTasks)}
            </TabsContent>

            <TabsContent value="late" className="mt-0">
              {renderTaskList(lateTasks)}
            </TabsContent>

            <TabsContent value="no_due" className="mt-0">
              {renderTaskList(noDueDateTasks)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
