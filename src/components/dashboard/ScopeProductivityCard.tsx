import { useState, useCallback, useEffect } from 'react';
import { startOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useProductivityStats, ProductivityScope } from '@/hooks/useProductivityStats';
import { useProductivityDetailsReport } from '@/hooks/useProductivityDetailsReport';
import { ProductivityReportDialog } from '@/components/dashboards/cards/ProductivityReportDialog';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, HelpCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const storageKey = `productivity-card-collapsed:${scope}:${listId || folderId || spaceId || 'workspace'}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? true : stored === '1';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed, storageKey]);

  const handleDateRangeChange = useCallback((range: { startDate: Date | undefined; endDate: Date | undefined }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  const { data: stats, isLoading } = useProductivityStats({
    scope,
    spaceId,
    folderId,
    listId,
    includeTransferred,
    startDate,
    endDate,
  });

  const { data: report, isLoading: reportLoading } = useProductivityDetailsReport({
    scope,
    spaceId,
    folderId,
    listId,
    includeTransferred,
    startDate,
    endDate,
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
        <CardContent className="py-3">
          <div className="h-6 flex items-center justify-center text-muted-foreground text-sm">Carregando produtividade...</div>
        </CardContent>
      </Card>
    );
  }

  if (collapsed) {
    return (
      <>
        <Card>
          <CardContent className="py-2 px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  Produtividade
                </div>
                <span className={cn('text-base font-bold', scoreColor)}>{score}%</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {stats?.early ?? 0}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    {stats?.onTime ?? 0}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    {stats?.late ?? 0}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    {stats?.noDueDate ?? 0}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCollapsed(false)} className="h-7 px-2">
                <span className="text-xs mr-1">Expandir</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
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
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Produtividade
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <DateRangeFilter onDateRangeChange={handleDateRangeChange} defaultPeriod="current-month" />
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
              <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)} className="h-8 px-2">
                <ChevronUp className="h-4 w-4" />
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
