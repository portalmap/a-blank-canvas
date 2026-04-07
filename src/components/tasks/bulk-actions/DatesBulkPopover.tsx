import { ReactNode, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBulkUpdateDueDate } from "@/hooks/useBulkTaskActions";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DatesBulkPopoverProps {
  children: ReactNode;
  taskIds: string[];
  onSuccess: () => void;
}

export function DatesBulkPopover({
  children,
  taskIds,
  onSuccess,
}: DatesBulkPopoverProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const updateDueDate = useBulkUpdateDueDate();
  const { data: userRole } = useUserRole();
  const canEditDates = userRole?.isAdmin || userRole?.isOwner || userRole?.isGlobalOwner;

  if (!canEditDates) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex opacity-50 cursor-not-allowed">{children}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Apenas admins e proprietários podem alterar datas
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  const handleApply = () => {
    updateDueDate.mutate(
      { taskIds, dueDate: date ? format(date, "yyyy-MM-dd") : null },
      {
        onSuccess: () => {
          setOpen(false);
          setDate(undefined);
          onSuccess();
        },
      }
    );
  };

  const handleClearDate = () => {
    updateDueDate.mutate(
      { taskIds, dueDate: null },
      {
        onSuccess: () => {
          setOpen(false);
          setDate(undefined);
          onSuccess();
        },
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">
            Data de vencimento
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={ptBR}
            className="rounded-md border"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleClearDate}
              disabled={updateDueDate.isPending}
            >
              Limpar
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleApply}
              disabled={!date || updateDueDate.isPending}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
