import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Move, Maximize2, Loader2, UserCheck, FileText } from 'lucide-react';
import { AccountProductivityReport, AccountEntry } from '@/hooks/useAccountProductivity';
import { AccountReportDialog } from './AccountReportDialog';
import { cn } from '@/lib/utils';

interface AccountProductivityCardProps {
  title: string;
  data: AccountProductivityReport | null;
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
  isLoading?: boolean;
  isExpanded?: boolean;
  startDate?: Date;
  endDate?: Date;
}

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-green-600 dark:text-green-400';
  if (score >= 100) return 'text-blue-600 dark:text-blue-400';
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getMedalIcon = (position: number): string | null => {
  switch (position) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return null;
  }
};

const AccountProductivityCardComponent = ({
  title,
  data,
  onDelete,
  onEdit,
  onExpand,
  isLoading = false,
  isExpanded = false,
  startDate,
  endDate,
}: AccountProductivityCardProps) => {
  const [selectedAccount, setSelectedAccount] = useState<AccountEntry | null>(null);

  const accounts = data?.accounts || [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit()}>
              <Move className="mr-2 h-4 w-4" />
              Redimensionar
            </DropdownMenuItem>
            {onExpand && (
              <DropdownMenuItem onClick={() => onExpand()}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expandir
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete()} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <UserCheck className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum Account definido</p>
            <p className="text-xs text-muted-foreground mt-1">
              Defina um Account nos Spaces para ver o relatório
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {accounts.map((account, index) => {
                const medal = getMedalIcon(index + 1);
                return (
                  <div
                    key={account.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedAccount(account)}
                  >
                    <div className="w-6 text-center">
                      {medal ? (
                        <span className="text-lg">{medal}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">{index + 1}º</span>
                      )}
                    </div>

                    <Avatar className="h-7 w-7">
                      <AvatarImage src={account.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {account.userName?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{account.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.spaceCount} space{account.spaceCount !== 1 ? 's' : ''} · {account.totalTasks} tarefa{account.totalTasks !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={cn('text-sm font-bold', getScoreColor(account.productivityScore))}>
                        {account.productivityScore}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {selectedAccount && data && (
        <AccountReportDialog
          open={!!selectedAccount}
          onOpenChange={(open) => !open && setSelectedAccount(null)}
          account={selectedAccount}
          spaces={data.spaces.filter(s => s.accountUserId === selectedAccount.userId)}
          tasks={data.tasks.filter(t => {
            const space = data.spaces.find(s => s.spaceId === t.spaceId);
            return space?.accountUserId === selectedAccount.userId;
          })}
        />
      )}
    </Card>
  );
};

export const AccountProductivityCard = memo(AccountProductivityCardComponent);
