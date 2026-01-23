import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, TrendingUp, Star, Zap, Move, Maximize2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProductivityStats, ProductivityScope } from '@/hooks/useProductivityStats';
import { cn } from '@/lib/utils';

export interface ProductivityScopeInfo {
  scope: ProductivityScope;
  label: string;
  details?: string;
}

interface ProductivityCardProps {
  title: string;
  stats: ProductivityStats | null;
  onDelete: () => void;
  onEdit: () => void;
  onExpand?: () => void;
  isLoading?: boolean;
  scopeInfo?: ProductivityScopeInfo;
}

const getScoreColor = (score: number): string => {
  if (score >= 150) return 'text-amber-500'; // Ouro
  if (score >= 100) return 'text-green-500'; // Verde
  if (score >= 75) return 'text-yellow-500'; // Amarelo
  return 'text-red-500'; // Vermelho
};

const getScoreIcon = (score: number) => {
  if (score >= 150) return <Star className="h-5 w-5 text-amber-500 fill-amber-500" />;
  if (score >= 100) return <Zap className="h-5 w-5 text-green-500" />;
  return null;
};

const getScoreLabel = (score: number): string => {
  if (score >= 175) return 'Excepcional';
  if (score >= 150) return 'Excelente';
  if (score >= 125) return 'Muito Bom';
  if (score >= 100) return 'No Alvo';
  if (score >= 75) return 'Atenção';
  if (score >= 50) return 'Melhorar';
  return 'Crítico';
};

const ProductivityCardComponent = ({
  title,
  stats,
  onDelete,
  onEdit,
  onExpand,
  isLoading = false,
  scopeInfo,
}: ProductivityCardProps) => {
  const score = stats?.productivityScore ?? 100;
  const progressPercentage = Math.min((score / 200) * 100, 100);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {title}
          </CardTitle>
          {scopeInfo && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-xs font-normal">
                {scopeInfo.label}
              </Badge>
              {scopeInfo.details && (
                <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={scopeInfo.details}>
                  {scopeInfo.details}
                </span>
              )}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Move className="mr-2 h-4 w-4" />
              Redimensionar
            </DropdownMenuItem>
            {onExpand && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExpand(); }}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expandir
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score principal */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className={cn('text-4xl font-bold', getScoreColor(score))}>
                  {score}%
                </span>
                {getScoreIcon(score)}
              </div>
              <p className={cn('text-sm font-medium', getScoreColor(score))}>
                {getScoreLabel(score)}
              </p>
            </div>

            {/* Barra de progresso até 200% */}
            <div className="space-y-1">
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                {/* Marcador de 100% */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-border z-10"
                  style={{ left: '50%' }}
                />
                {/* Barra de progresso */}
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    score >= 150 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                    score >= 100 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    score >= 75 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  )}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-medium">100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Breakdown por categoria */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Antecipadas</span>
                </div>
                <span className="font-medium">
                  {stats?.early ?? 0} ({stats?.earlyRate ?? 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">No prazo</span>
                </div>
                <span className="font-medium">
                  {(stats?.onTime ?? 0) + (stats?.noDueDate ?? 0)} ({stats?.onTimeRate ?? 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">Atrasadas</span>
                </div>
                <span className="font-medium">
                  {stats?.late ?? 0} ({stats?.lateRate ?? 0}%)
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center">
                📊 Total: {stats?.totalCompleted ?? 0} tarefas concluídas
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ProductivityCard = memo(ProductivityCardComponent);
