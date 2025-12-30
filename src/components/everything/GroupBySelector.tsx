import { Calendar, CircleDot, User, Flag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type GroupByOption = 'due_date' | 'status' | 'assignee' | 'priority' | 'none';

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
] as const;

export function GroupBySelector({ value, onChange }: GroupBySelectorProps) {
  const selected = groupByOptions.find(o => o.value === value);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Agrupar por:</span>
      <Select value={value} onValueChange={(v) => onChange(v as GroupByOption)}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selected?.icon && <selected.icon className="h-4 w-4" />}
              <span>{selected?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
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
    </div>
  );
}
