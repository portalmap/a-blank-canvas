import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Repeat, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useStatusesForScope } from '@/hooks/useStatuses';
import { useUpdateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecurrenceConfig {
  recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  day_of_week?: string;
  monthly_mode?: 'first_day' | 'last_day' | 'specific_day' | 'weekday_ordinal';
  day_of_month?: number;
  weekday_ordinal?: 1 | 2 | 3 | 4 | -1;
  weekday?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  trigger_on_status_id: string;
  skip_weekends: boolean;
  repeat_forever: boolean;
  on_complete_action: 'create_new_task' | 'update_status';
  reset_status_id?: string;
}

interface TaskRecurrenceConfigProps {
  taskId: string;
  listId: string;
  workspaceId: string;
  recurrenceConfig: RecurrenceConfig | null;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const MONTHLY_MODES = [
  { value: 'first_day', label: 'Primeiro dia' },
  { value: 'last_day', label: 'Último dia' },
  { value: 'specific_day', label: 'Dia específico' },
  { value: 'weekday_ordinal', label: 'Dia da semana específico' },
];

const ORDINALS = [
  { value: '1', label: 'Primeira' },
  { value: '2', label: 'Segunda' },
  { value: '3', label: 'Terceira' },
  { value: '4', label: 'Quarta' },
  { value: '-1', label: 'Última' },
];

export const TaskRecurrenceConfig = ({ taskId, listId, workspaceId, recurrenceConfig }: TaskRecurrenceConfigProps) => {
  const [isOpen, setIsOpen] = useState(!!recurrenceConfig);
  const [config, setConfig] = useState<RecurrenceConfig>(
    recurrenceConfig || {
      recurrence_type: 'daily',
      trigger_on_status_id: '',
      skip_weekends: false,
      repeat_forever: true,
      on_complete_action: 'create_new_task',
    }
  );
  const [hasRecurrence, setHasRecurrence] = useState(!!recurrenceConfig);

  const updateTask = useUpdateTask();
  const { data: statuses } = useStatusesForScope('list', listId, workspaceId);

  const doneStatuses = statuses?.filter(s => s.category === 'done') || [];
  const activeStatuses = statuses?.filter(s => s.category !== 'done') || [];

  // Sync config when task changes
  useEffect(() => {
    if (recurrenceConfig) {
      setConfig(recurrenceConfig);
      setHasRecurrence(true);
    } else {
      setHasRecurrence(false);
    }
  }, [taskId, recurrenceConfig]);

  const showDayOfWeek = config.recurrence_type === 'weekly' || config.recurrence_type === 'biweekly';
  const showMonthlyMode = config.recurrence_type === 'monthly' || config.recurrence_type === 'quarterly';

  const handleSave = async (updatedConfig: RecurrenceConfig) => {
    if (!updatedConfig.trigger_on_status_id) {
      toast.error('Selecione o status que dispara a recorrência');
      return;
    }

    try {
      await updateTask.mutateAsync({
        id: taskId,
        recurrenceConfig: updatedConfig as any,
      });
      setHasRecurrence(true);
      toast.success('Recorrência configurada!');
    } catch (error) {
      console.error('Erro ao salvar recorrência:', error);
    }
  };

  const handleRemove = async () => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        recurrenceConfig: null as any,
      });
      setHasRecurrence(false);
      setConfig({
        recurrence_type: 'daily',
        trigger_on_status_id: '',
        skip_weekends: false,
        repeat_forever: true,
        on_complete_action: 'create_new_task',
      });
      toast.success('Recorrência removida');
    } catch (error) {
      console.error('Erro ao remover recorrência:', error);
    }
  };

  const updateConfig = (partial: Partial<RecurrenceConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 text-sm font-medium",
            hasRecurrence ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Repeat className="h-4 w-4" />
          Recorrência
          {hasRecurrence && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Ativa
            </span>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-3 px-2">
        {/* Frequência */}
        <div className="space-y-1.5">
          <Label className="text-xs">Frequência</Label>
          <Select
            value={config.recurrence_type}
            onValueChange={(v) => updateConfig({ recurrence_type: v as RecurrenceConfig['recurrence_type'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dia da semana (weekly/biweekly) */}
        {showDayOfWeek && (
          <div className="space-y-1.5">
            <Label className="text-xs">Dia da semana</Label>
            <Select
              value={config.day_of_week || 'monday'}
              onValueChange={(v) => updateConfig({ day_of_week: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Modo mensal (monthly/quarterly) */}
        {showMonthlyMode && (
          <div className="space-y-1.5">
            <Label className="text-xs">Dia do período</Label>
            <Select
              value={config.monthly_mode || 'first_day'}
              onValueChange={(v) => updateConfig({ monthly_mode: v as RecurrenceConfig['monthly_mode'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHLY_MODES.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {config.monthly_mode === 'specific_day' && (
              <Input
                type="number"
                min={1}
                max={31}
                value={config.day_of_month || 1}
                onChange={(e) => updateConfig({ day_of_month: parseInt(e.target.value) || 1 })}
                className="mt-1.5"
              />
            )}
            {config.monthly_mode === 'weekday_ordinal' && (
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <Select
                  value={String(config.weekday_ordinal ?? 1)}
                  onValueChange={(v) => updateConfig({ weekday_ordinal: parseInt(v) as RecurrenceConfig['weekday_ordinal'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ordem..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDINALS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={config.weekday || 'monday'}
                  onValueChange={(v) => updateConfig({ weekday: v as RecurrenceConfig['weekday'] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Status que dispara */}
        <div className="space-y-1.5">
          <Label className="text-xs">Status que dispara a recorrência <span className="text-destructive">*</span></Label>
          <Select
            value={config.trigger_on_status_id}
            onValueChange={(v) => updateConfig({ trigger_on_status_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um status de conclusão..." />
            </SelectTrigger>
            <SelectContent>
              {(doneStatuses.length > 0 ? doneStatuses : statuses || []).map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color || '#94a3b8' }} />
                    <span>{status.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`skip-weekends-${taskId}`}
              checked={config.skip_weekends}
              onCheckedChange={(checked) => updateConfig({ skip_weekends: !!checked })}
            />
            <Label htmlFor={`skip-weekends-${taskId}`} className="text-xs cursor-pointer">
              Ignorar fins de semana
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`repeat-forever-${taskId}`}
              checked={config.repeat_forever}
              onCheckedChange={(checked) => updateConfig({ repeat_forever: !!checked })}
            />
            <Label htmlFor={`repeat-forever-${taskId}`} className="text-xs cursor-pointer">
              Repetir para sempre
            </Label>
          </div>
        </div>

        {/* Ação ao concluir */}
        <div className="space-y-2">
          <Label className="text-xs">Ação ao concluir</Label>
          <RadioGroup
            value={config.on_complete_action}
            onValueChange={(v) => updateConfig({ on_complete_action: v as RecurrenceConfig['on_complete_action'] })}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="create_new_task" id={`create-new-${taskId}`} />
              <Label htmlFor={`create-new-${taskId}`} className="text-xs cursor-pointer">
                Criar nova tarefa
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="update_status" id={`update-status-${taskId}`} />
              <Label htmlFor={`update-status-${taskId}`} className="text-xs cursor-pointer">
                Atualizar status para...
              </Label>
            </div>
          </RadioGroup>

          {config.on_complete_action === 'update_status' && (
            <Select
              value={config.reset_status_id || ''}
              onValueChange={(v) => updateConfig({ reset_status_id: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Status de destino..." />
              </SelectTrigger>
              <SelectContent>
                {(activeStatuses.length > 0 ? activeStatuses : statuses || []).map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color || '#94a3b8' }} />
                      <span>{status.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => handleSave(config)} className="flex-1">
            Salvar
          </Button>
          {hasRecurrence && (
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
