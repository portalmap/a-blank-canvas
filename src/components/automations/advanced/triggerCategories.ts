import { 
  Star, 
  Sparkles, 
  ArrowRight, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  Settings2,
  Plus,
  Edit,
  CircleDot,
  Clock,
  RefreshCw,
  Move,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Timer,
  UserPlus,
  UserMinus,
  Type,
  Flag,
  Tag,
  Link2,
  Unlock,
  LucideIcon
} from 'lucide-react';

export interface TriggerOption {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

export interface TriggerCategory {
  name: string;
  icon: LucideIcon;
  triggers: TriggerOption[];
}

export const TRIGGER_CATEGORIES: TriggerCategory[] = [
  {
    name: 'Popular',
    icon: Star,
    triggers: [
      { 
        id: 'on_task_created', 
        label: 'Tarefa ou subtarefa criada', 
        description: 'Quando uma nova tarefa é criada neste escopo',
        icon: Plus 
      },
      { 
        id: 'on_custom_field_changed', 
        label: 'Alterações de campo personalizado', 
        description: 'Quando um campo personalizado é alterado',
        icon: Edit 
      },
      { 
        id: 'on_status_changed', 
        label: 'Alterações de status', 
        description: 'Quando o status de uma tarefa muda',
        icon: CircleDot 
      },
      { 
        id: 'on_schedule', 
        label: 'A cada...', 
        description: 'Executar em intervalos regulares',
        icon: Clock 
      },
    ]
  },
  {
    name: 'AI',
    icon: Sparkles,
    triggers: [
      { 
        id: 'on_task_updated', 
        label: 'Tarefa ou subtarefa atualizada', 
        description: 'Quando qualquer campo de uma tarefa é alterado',
        icon: RefreshCw 
      },
    ]
  },
  {
    name: 'Adicionar ou mover',
    icon: ArrowRight,
    triggers: [
      { 
        id: 'on_task_added_here', 
        label: 'Tarefa ou subtarefa existente adicionada aqui', 
        description: 'Quando uma tarefa existente é adicionada a este escopo',
        icon: Plus 
      },
      { 
        id: 'on_task_moved_here', 
        label: 'Tarefa ou subtarefa existente movida para cá', 
        description: 'Quando uma tarefa é movida para este escopo',
        icon: Move 
      },
    ]
  },
  {
    name: 'Comunicação',
    icon: MessageSquare,
    triggers: [
      { 
        id: 'on_comment_added', 
        label: 'O comentário foi adicionado', 
        description: 'Quando um novo comentário é adicionado a uma tarefa',
        icon: MessageSquare 
      },
    ]
  },
  {
    name: 'Criar e concluir',
    icon: CheckCircle2,
    triggers: [
      { 
        id: 'on_all_checklists_resolved', 
        label: 'Todas as checklists resolvidas', 
        description: 'Quando todos os itens de checklist são marcados',
        icon: CheckCircle2 
      },
      { 
        id: 'on_all_subtasks_resolved', 
        label: 'Todas as subtarefas imediatas resolvidas', 
        description: 'Quando todas as subtarefas diretas são concluídas',
        icon: CheckCircle2 
      },
    ]
  },
  {
    name: 'Datas e horário',
    icon: Calendar,
    triggers: [
      { 
        id: 'on_due_date_changed', 
        label: 'Alterações da data final', 
        description: 'Quando a data de vencimento é alterada',
        icon: CalendarClock 
      },
      { 
        id: 'on_start_date_changed', 
        label: 'Alterações na data de início', 
        description: 'Quando a data de início é alterada',
        icon: CalendarClock 
      },
      { 
        id: 'on_date_before_after', 
        label: 'A data é antes/depois de', 
        description: 'Quando uma data atinge um período específico',
        icon: CalendarX 
      },
      { 
        id: 'on_start_date_arrives', 
        label: 'Chegada da data de início', 
        description: 'Quando a data de início chega',
        icon: CalendarCheck 
      },
      { 
        id: 'on_due_date_arrives', 
        label: 'Chegada da data final', 
        description: 'Quando a data de vencimento chega',
        icon: CalendarCheck 
      },
      { 
        id: 'on_custom_date_arrives', 
        label: 'A data do campo personalizado chegar', 
        description: 'Quando uma data de campo personalizado chega',
        icon: CalendarCheck 
      },
      { 
        id: 'on_time_tracked', 
        label: 'Tempo rastreado', 
        description: 'Quando tempo é registrado em uma tarefa',
        icon: Timer 
      },
    ]
  },
  {
    name: 'Gerenciamento de tarefas',
    icon: Settings2,
    triggers: [
      { 
        id: 'on_assignee_added', 
        label: 'Responsável adicionado', 
        description: 'Quando um responsável é atribuído',
        icon: UserPlus 
      },
      { 
        id: 'on_assignee_removed', 
        label: 'Responsável removido', 
        description: 'Quando um responsável é removido',
        icon: UserMinus 
      },
      { 
        id: 'on_name_changed', 
        label: 'O nome da tarefa ou subtarefa for alterado', 
        description: 'Quando o título de uma tarefa muda',
        icon: Type 
      },
      { 
        id: 'on_priority_changed', 
        label: 'Alterações de prioridade', 
        description: 'Quando a prioridade de uma tarefa muda',
        icon: Flag 
      },
      { 
        id: 'on_tag_added', 
        label: 'Etiqueta adicionada', 
        description: 'Quando uma tag é adicionada',
        icon: Tag 
      },
      { 
        id: 'on_tag_removed', 
        label: 'Tag removida', 
        description: 'Quando uma tag é removida',
        icon: Tag 
      },
      { 
        id: 'on_task_type_changed', 
        label: 'Alterações do tipo de tarefa', 
        description: 'Quando o tipo de tarefa muda',
        icon: Settings2 
      },
      { 
        id: 'on_task_linked', 
        label: 'Tarefa ou subtarefa vinculada', 
        description: 'Quando uma tarefa é vinculada a outra',
        icon: Link2 
      },
      { 
        id: 'on_task_unblocked', 
        label: 'Tarefa ou subtarefa desbloqueada', 
        description: 'Quando uma tarefa é desbloqueada',
        icon: Unlock 
      },
    ]
  },
];

export const getAllTriggers = (): TriggerOption[] => {
  return TRIGGER_CATEGORIES.flatMap(category => category.triggers);
};

export const getTriggerById = (id: string): TriggerOption | undefined => {
  return getAllTriggers().find(trigger => trigger.id === id);
};

export const getCategoryByTriggerId = (id: string): TriggerCategory | undefined => {
  return TRIGGER_CATEGORIES.find(category => 
    category.triggers.some(trigger => trigger.id === id)
  );
};
