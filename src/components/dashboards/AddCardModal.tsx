import { useState } from 'react';
import { 
  PieChart, BarChart3, LineChart, Calculator, ListTodo, 
  AlertTriangle, FileText, Target 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardCard } from '@/hooks/useDashboards';
import { cn } from '@/lib/utils';

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCard: (card: DashboardCard) => void;
}

interface CardTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof PieChart;
  category: string;
  hasGroupBy?: boolean;
  hasMetric?: boolean;
  hasTimeRange?: boolean;
}

const cardTypes: CardTypeConfig[] = [
  {
    id: 'pie_chart',
    name: 'Gráfico de Pizza',
    description: 'Distribuição visual em fatias',
    icon: PieChart,
    category: 'Gráficos',
    hasGroupBy: true,
  },
  {
    id: 'bar_chart',
    name: 'Gráfico de Barras',
    description: 'Comparação entre categorias',
    icon: BarChart3,
    category: 'Gráficos',
    hasGroupBy: true,
  },
  {
    id: 'line_chart',
    name: 'Gráfico de Linha',
    description: 'Evolução ao longo do tempo',
    icon: LineChart,
    category: 'Gráficos',
    hasTimeRange: true,
  },
  {
    id: 'calculation',
    name: 'Cálculo',
    description: 'Métrica numérica destacada',
    icon: Calculator,
    category: 'Métricas',
    hasMetric: true,
  },
  {
    id: 'overdue_tasks',
    name: 'Tarefas Atrasadas',
    description: 'Lista de tarefas em atraso',
    icon: AlertTriangle,
    category: 'Listas',
  },
  {
    id: 'priority_breakdown',
    name: 'Prioridades',
    description: 'Distribuição por prioridade',
    icon: Target,
    category: 'Status',
  },
  {
    id: 'notes',
    name: 'Notas',
    description: 'Texto livre para anotações',
    icon: FileText,
    category: 'Outros',
  },
];

const groupByOptions = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'assignee', label: 'Responsável' },
];

const metricOptions = [
  { value: 'total', label: 'Total de Tarefas' },
  { value: 'completed', label: 'Tarefas Concluídas' },
  { value: 'overdue', label: 'Tarefas Atrasadas' },
  { value: 'on_track', label: 'Tarefas em Dia' },
];

const timeRangeOptions = [
  { value: 'week', label: 'Última Semana' },
  { value: 'month', label: 'Último Mês' },
  { value: 'quarter', label: 'Último Trimestre' },
  { value: 'year', label: 'Último Ano' },
];

export const AddCardModal = ({ open, onOpenChange, onAddCard }: AddCardModalProps) => {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<typeof cardTypes[number] | null>(null);
  const [title, setTitle] = useState('');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'assignee'>('status');
  const [metric, setMetric] = useState<'total' | 'completed' | 'overdue' | 'on_track'>('total');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  const resetForm = () => {
    setStep('type');
    setSelectedType(null);
    setTitle('');
    setGroupBy('status');
    setMetric('total');
    setTimeRange('week');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSelectType = (type: typeof cardTypes[number]) => {
    setSelectedType(type);
    setTitle(type.name);
    setStep('config');
  };

  const handleBack = () => {
    setStep('type');
  };

  const handleAdd = () => {
    if (!selectedType || !title.trim()) return;

    const card: DashboardCard = {
      id: `card-${Date.now()}`,
      type: selectedType.id as DashboardCard['type'],
      title: title.trim(),
      config: {
        ...(selectedType.hasGroupBy && { groupBy }),
        ...(selectedType.hasMetric && { metric }),
        ...(selectedType.hasTimeRange && { timeRange }),
      },
      position: { x: 0, y: 0, w: 4, h: 2 },
    };

    onAddCard(card);
    handleClose();
  };

  // Group card types by category
  const categories = cardTypes.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, typeof cardTypes[number][]>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' ? 'Adicionar Card' : 'Configurar Card'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type'
              ? 'Escolha o tipo de card que deseja adicionar'
              : 'Configure as opções do card'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="space-y-6 py-4 max-h-[400px] overflow-y-auto">
            {Object.entries(categories).map(([category, types]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {types.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border border-border',
                        'hover:border-primary hover:bg-primary/5 transition-all text-left'
                      )}
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <type.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Card</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Tarefas por Status"
              />
            </div>

            {selectedType?.hasGroupBy && (
              <div className="space-y-2">
                <Label>Agrupar por</Label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupByOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedType?.hasMetric && (
              <div className="space-y-2">
                <Label>Métrica</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedType?.hasTimeRange && (
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <selectedType.icon className="h-4 w-4" />
                <span className="font-medium">Tipo:</span> {selectedType?.name}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'type' ? (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
              <Button onClick={handleAdd} disabled={!title.trim()}>
                Adicionar Card
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
