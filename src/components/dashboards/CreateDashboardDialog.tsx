import { useState } from 'react';
import { LayoutDashboard, BarChart3, PieChart, LineChart, ListTodo } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateDashboard, DashboardConfig, DashboardCard } from '@/hooks/useDashboards';
import { cn } from '@/lib/utils';

interface CreateDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (dashboardId: string) => void;
}

const templates = [
  {
    id: 'blank',
    name: 'Em branco',
    description: 'Comece do zero com um painel vazio',
    icon: LayoutDashboard,
    config: { cards: [] } as DashboardConfig,
  },
  {
    id: 'overview',
    name: 'Visão Geral',
    description: 'Cards de status, prioridade e tarefas atrasadas',
    icon: BarChart3,
    config: {
      cards: [
        {
          id: 'card-1',
          type: 'pie_chart',
          title: 'Tarefas por Status',
          config: { groupBy: 'status' },
          position: { x: 0, y: 0, w: 4, h: 3 },
        },
        {
          id: 'card-2',
          type: 'bar_chart',
          title: 'Tarefas por Prioridade',
          config: { groupBy: 'priority' },
          position: { x: 4, y: 0, w: 4, h: 3 },
        },
        {
          id: 'card-3',
          type: 'calculation',
          title: 'Total de Tarefas',
          config: { metric: 'total' },
          position: { x: 8, y: 0, w: 2, h: 1 },
        },
        {
          id: 'card-4',
          type: 'calculation',
          title: 'Concluídas',
          config: { metric: 'completed' },
          position: { x: 10, y: 0, w: 2, h: 1 },
        },
        {
          id: 'card-5',
          type: 'overdue_tasks',
          title: 'Tarefas Atrasadas',
          config: {},
          position: { x: 8, y: 1, w: 4, h: 2 },
        },
      ] as DashboardCard[],
    } as DashboardConfig,
  },
  {
    id: 'workload',
    name: 'Carga de Trabalho',
    description: 'Distribuição de tarefas por responsável',
    icon: PieChart,
    config: {
      cards: [
        {
          id: 'card-1',
          type: 'bar_chart',
          title: 'Tarefas por Responsável',
          config: { groupBy: 'assignee' },
          position: { x: 0, y: 0, w: 6, h: 3 },
        },
        {
          id: 'card-2',
          type: 'priority_breakdown',
          title: 'Distribuição de Prioridade',
          config: {},
          position: { x: 6, y: 0, w: 6, h: 3 },
        },
      ] as DashboardCard[],
    } as DashboardConfig,
  },
  {
    id: 'progress',
    name: 'Progresso',
    description: 'Acompanhamento de progresso e evolução',
    icon: LineChart,
    config: {
      cards: [
        {
          id: 'card-1',
          type: 'line_chart',
          title: 'Evolução Semanal',
          config: { timeRange: 'week' },
          position: { x: 0, y: 0, w: 8, h: 3 },
        },
        {
          id: 'card-2',
          type: 'calculation',
          title: 'Taxa de Conclusão',
          config: { metric: 'completed' },
          position: { x: 8, y: 0, w: 4, h: 3 },
        },
      ] as DashboardCard[],
    } as DashboardConfig,
  },
];

export const CreateDashboardDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateDashboardDialogProps) => {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createDashboard = useCreateDashboard();

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      const result = await createDashboard.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        config: selectedTemplate.config,
      });

      // Reset form
      setStep('template');
      setSelectedTemplate(templates[0]);
      setName('');
      setDescription('');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(result.id);
      }
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  const handleBack = () => {
    setStep('template');
  };

  const handleNext = () => {
    setStep('details');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'template' ? 'Escolha um template' : 'Detalhes do painel'}
          </DialogTitle>
          <DialogDescription>
            {step === 'template'
              ? 'Selecione um template para começar ou crie do zero'
              : 'Defina o nome e a descrição do seu painel'}
          </DialogDescription>
        </DialogHeader>

        {step === 'template' ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  'flex flex-col items-start gap-2 p-4 rounded-lg border-2 transition-all text-left',
                  selectedTemplate.id === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    selectedTemplate.id === template.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <template.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{template.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do painel *</Label>
              <Input
                id="name"
                placeholder="Ex: Visão Geral do Projeto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo deste painel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Template selecionado:</span> {selectedTemplate.name}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'template' ? (
            <Button onClick={handleNext}>Continuar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!name.trim() || createDashboard.isPending}
              >
                {createDashboard.isPending ? 'Criando...' : 'Criar Painel'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
