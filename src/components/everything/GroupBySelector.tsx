import { Calendar, CircleDot, User, Flag, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type GroupByOption = 'due_date' | 'status' | 'assignee' | 'priority' | 'tag' | 'none';

interface GroupBySelectorProps {
  value: GroupByOption;
  onChange: (value: GroupByOption) => void;
}

const groupByOptions = [
  { value: 'none', label: 'Sem agrupamento', icon: null },
  { value: 'due_date', label: 'Data de vencimento', icon: Calendar },
  { value: 'status', label: 'Status', icon: CircleDot },
  { value: 'assignee', label: 'Responsável', icon: User },
  { value: 'priority', label: 'Prioridade', icon: Flag },
  { value: 'tag', label: 'Etiqueta', icon: Tag },
] as const;

export function GroupBySelector({ value, onChange }: GroupBySelectorProps) {
  const selected = groupByOptions.find(o => o.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as GroupByOption)}>
      <SelectTrigger className="h-8 w-auto min-w-[180px] gap-2 border-dashed bg-background hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Grupo:</span>
          {selected?.icon && <selected.icon className="h-3.5 w-3.5 text-primary" />}
          <span className="text-sm font-medium">{selected?.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-popover">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Agrupar por
        </div>
        {groupByOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon && <option.icon className="h-4 w-4" />}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
