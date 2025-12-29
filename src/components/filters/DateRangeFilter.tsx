import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subDays, subMonths, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type PeriodOption = 'current-month' | 'last-month' | 'last-30' | 'last-90' | 'year' | 'custom' | 'all';

interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface DateRangeFilterProps {
  onDateRangeChange: (range: DateRange) => void;
  defaultPeriod?: PeriodOption;
}

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: 'all', label: 'Todo Período' },
  { value: 'current-month', label: 'Mês Atual' },
  { value: 'last-month', label: 'Mês Anterior' },
  { value: 'last-30', label: 'Últimos 30 dias' },
  { value: 'last-90', label: 'Últimos 90 dias' },
  { value: 'year', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const getDateRange = (period: PeriodOption): DateRange => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  switch (period) {
    case 'current-month':
      return { startDate: startOfMonth(today), endDate: today };
    case 'last-month':
      const lastMonth = subMonths(today, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    case 'last-30':
      return { startDate: subDays(today, 30), endDate: today };
    case 'last-90':
      return { startDate: subDays(today, 90), endDate: today };
    case 'year':
      return { startDate: startOfYear(today), endDate: today };
    case 'all':
      return { startDate: undefined, endDate: undefined };
    default:
      return { startDate: undefined, endDate: undefined };
  }
};

export const DateRangeFilter = ({ 
  onDateRangeChange, 
  defaultPeriod = 'all' 
}: DateRangeFilterProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(defaultPeriod);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (selectedPeriod !== 'custom') {
      const range = getDateRange(selectedPeriod);
      onDateRangeChange(range);
    }
  }, [selectedPeriod, onDateRangeChange]);

  useEffect(() => {
    if (selectedPeriod === 'custom') {
      onDateRangeChange({ startDate: customStartDate, endDate: customEndDate });
    }
  }, [customStartDate, customEndDate, selectedPeriod, onDateRangeChange]);

  const handlePeriodChange = (value: PeriodOption) => {
    setSelectedPeriod(value);
    if (value !== 'custom') {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPeriod === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !customStartDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? (
                  format(customStartDate, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Início</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !customEndDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? (
                  format(customEndDate, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Fim</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
                disabled={(date) => customStartDate ? date < customStartDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
