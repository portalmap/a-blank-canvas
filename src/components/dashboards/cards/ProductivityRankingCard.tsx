import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Trophy, MoreVertical, Trash2, Edit, Loader2, Users } from 'lucide-react';
import { ProductivityRankingResult, UserProductivityStats } from '@/hooks/useProductivityRanking';
import { cn } from '@/lib/utils';

interface ProductivityRankingCardProps {
  title: string;
  data: ProductivityRankingResult | null;
  onDelete: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

const getMedalIcon = (position: number): string | null => {
  switch (position) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return null;
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-green-500';
  if (score >= 100) return 'text-blue-500';
  if (score >= 75) return 'text-yellow-500';
  return 'text-red-500';
};

const getProgressColor = (score: number): string => {
  if (score >= 150) return 'bg-green-500';
  if (score >= 100) return 'bg-blue-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const RankingItem = ({ user, position }: { user: UserProductivityStats; position: number }) => {
  const medal = getMedalIcon(position);
  const progressValue = Math.min(user.productivityScore, 200) / 2; // Max 200% = 100% da barra

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-colors",
      position <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
    )}>
      {/* Posição */}
      <div className="w-8 text-center font-bold text-muted-foreground">
        {medal || position}
      </div>

      {/* Avatar */}
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatarUrl} alt={user.userName} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(user.userName)}
        </AvatarFallback>
      </Avatar>

      {/* Nome e breakdown */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{user.userName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {user.early > 0 && (
            <span className="text-green-600">+{user.early} antecip.</span>
          )}
          {user.onTime > 0 && (
            <span className="text-blue-600">{user.onTime} no prazo</span>
          )}
          {user.late > 0 && (
            <span className="text-red-600">{user.late} atras.</span>
          )}
          {user.totalCompleted === 0 && (
            <span>Sem tarefas</span>
          )}
        </div>
      </div>

      {/* Score e barra de progresso */}
      <div className="flex flex-col items-end gap-1 w-24">
        <span className={cn("text-xs font-bold", getScoreColor(user.productivityScore))}>
          {user.productivityScore}%
        </span>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all", getProgressColor(user.productivityScore))}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const ProductivityRankingCardComponent = ({
  title,
  data,
  onDelete,
  onEdit,
  isLoading = false,
}: ProductivityRankingCardProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col pt-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.ranking.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhum dado disponível</p>
            <p className="text-xs">Aguardando tarefas concluídas</p>
          </div>
        ) : (
          <>
            {/* Lista de ranking com scroll */}
            <ScrollArea className="flex-1 -mx-2">
              <div className="space-y-1 px-2">
                {data.ranking.map((user, index) => (
                  <RankingItem 
                    key={user.userId} 
                    user={user} 
                    position={index + 1} 
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Footer com média da equipe */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Média da Equipe
                </Badge>
                <span className={cn("font-bold", getScoreColor(data.teamAverage))}>
                  {data.teamAverage}%
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {data.totalTasks} tarefas concluídas
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const ProductivityRankingCard = memo(ProductivityRankingCardComponent);
