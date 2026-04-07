import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useProductivityStats, ProductivityScope } from '@/hooks/useProductivityStats';
import { useProductivityDetailsReport } from '@/hooks/useProductivityDetailsReport';
import ProductivityReportDialog from '@/components/dashboards/cards/ProductivityReportDialog';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, HelpCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScopeProductivityCardProps {
  scope: ProductivityScope;
  spaceId?: string;
  folderId?: string;
  listId?: string;
}

const ScopeProductivityCard = ({ scope, spaceId, folderId, listId }: ScopeProductivityCardProps) => {
  const [includeTransferred, setIncludeTransferred] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: stats, isLoading } = useProductivityStats({
    scope,
    spaceId,
    folderId,
    listId,
    includeTransferred,
  });

  const { data: report, isLoading: reportLoading } = useProductivityDetailsReport({
    scope,
    spaceId,
    folderId,
    listId,
    includeTransferred,
    enabled: reportOpen,
  });

  const score = stats?.productivityScore ?? 0;
  const scoreColor = score >= 150 ? 'text-green-500' : score >= 100 ? 'text-blue-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  const indicators = [
    { label: 'Antecipadas', value: stats?.early ?? 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'No Prazo', value: stats?.onTime ?? 0, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Atrasadas', value: stats?.late ?? 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Sem Prazo', value: stats?.noDueDate ?? 0, icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Carregando produtividade...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Produtividade
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="scope-transferred"
                  checked={includeTransferred}
                  onCheckedChange={setIncludeTransferred}
                  className="scale-75"
                />
                <Label htmlFor="scope-transferred" className="text-xs text-muted-foreground cursor-pointer">
                  Transferidas
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
                <FileText className="h-3.5 w-3.5 mr-1" />
                Relatório
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={cn('text-3xl font-bold', scoreColor)}>{score}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2">
              {indicators.map((ind) => (
                <div key={ind.label} className={cn('rounded-lg p-2 text-center', ind.bg)}>
                  <ind.icon className={cn('h-3.5 w-3.5 mx-auto mb-1', ind.color)} />
                  <p className={cn('text-lg font-semibold', ind.color)}>{ind.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{ind.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {stats?.totalCompleted ?? 0} tarefas concluídas
          </p>
        </CardContent>
      </Card>

      <ProductivityReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        report={report ?? null}
        isLoading={reportLoading}
        title="Relatório de Produtividade"
      />
    </>
  );
};

export default ScopeProductivityCard;
