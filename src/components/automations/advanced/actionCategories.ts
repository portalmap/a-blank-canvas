import { 
  CircleDot,
  Flag,
  UserPlus,
  UserMinus,
  Eye,
  Tag,
  Calendar,
  CalendarClock,
  Bell,
  ListPlus,
  ArrowRight,
  Archive,
  Webhook,
  LucideIcon
} from 'lucide-react';

export interface ActionOption {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  configFields?: ActionConfigField[];
}

export interface ActionConfigField {
  name: string;
  label: string;
  type: 'select' | 'text' | 'user' | 'users' | 'status' | 'priority' | 'date' | 'number' | 'list' | 'tag' | 'date_config';
  required?: boolean;
  options?: { value: string; label: string }[];
}

export const ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'set_status',
    label: 'Alterar status',
    description: 'Mudar o status da tarefa',
    icon: CircleDot,
    configFields: [
      { name: 'status_id', label: 'Status', type: 'status', required: true }
    ]
  },
  {
    id: 'set_priority',
    label: 'Alterar prioridade',
    description: 'Mudar a prioridade da tarefa',
    icon: Flag,
    configFields: [
      { 
        name: 'priority', 
        label: 'Prioridade', 
        type: 'select', 
        required: true,
        options: [
          { value: 'urgent', label: 'Urgente' },
          { value: 'high', label: 'Alta' },
          { value: 'medium', label: 'Média' },
          { value: 'low', label: 'Baixa' },
        ]
      }
    ]
  },
  {
    id: 'auto_assign_user',
    label: 'Atribuir responsável',
    description: 'Adicionar responsáveis à tarefa',
    icon: UserPlus,
    configFields: [
      { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
    ]
  },
  {
    id: 'add_assignee',
    label: 'Adicionar responsável',
    description: 'Adicionar mais responsáveis à tarefa',
    icon: UserPlus,
    configFields: [
      { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
    ]
  },
  {
    id: 'remove_assignee',
    label: 'Remover responsável',
    description: 'Remover um responsável da tarefa',
    icon: UserMinus,
    configFields: [
      { name: 'user_id', label: 'Usuário', type: 'user', required: true }
    ]
  },
  {
    id: 'remove_all_assignees',
    label: 'Remover todos os responsáveis',
    description: 'Remove todos os responsáveis da tarefa',
    icon: UserMinus,
    configFields: []
  },
  {
    id: 'auto_add_follower',
    label: 'Adicionar seguidor',
    description: 'Adicionar seguidores à tarefa',
    icon: Eye,
    configFields: [
      { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
    ]
  },
  {
    id: 'add_follower',
    label: 'Adicionar seguidor',
    description: 'Adicionar seguidores à tarefa',
    icon: Eye,
    configFields: [
      { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
    ]
  },
  {
    id: 'add_tag',
    label: 'Adicionar etiqueta',
    description: 'Adicionar uma tag à tarefa',
    icon: Tag,
    configFields: [
      { name: 'tag_id', label: 'Etiqueta', type: 'tag', required: true }
    ]
  },
  {
    id: 'remove_tag',
    label: 'Remover etiqueta',
    description: 'Remover uma tag da tarefa',
    icon: Tag,
    configFields: [
      { name: 'tag_id', label: 'Etiqueta', type: 'tag', required: true }
    ]
  },
  {
    id: 'set_due_date',
    label: 'Definir data de vencimento',
    description: 'Definir ou alterar a data final',
    icon: Calendar,
    configFields: [
      { name: 'date_config', label: 'Configuração de data', type: 'date_config', required: true }
    ]
  },
  {
    id: 'set_start_date',
    label: 'Definir data de início',
    description: 'Definir ou alterar a data de início',
    icon: CalendarClock,
    configFields: [
      { name: 'date_config', label: 'Configuração de data', type: 'date_config', required: true }
    ]
  },
  {
    id: 'send_notification',
    label: 'Enviar notificação',
    description: 'Enviar uma notificação para usuários',
    icon: Bell,
    configFields: [
      { name: 'message', label: 'Mensagem', type: 'text', required: true },
      { name: 'user_id', label: 'Para usuário', type: 'user', required: true }
    ]
  },
  {
    id: 'create_subtask',
    label: 'Criar subtarefa',
    description: 'Criar uma nova subtarefa',
    icon: ListPlus,
    configFields: [
      { name: 'title', label: 'Título da subtarefa', type: 'text', required: true }
    ]
  },
  {
    id: 'move_task',
    label: 'Mover tarefa',
    description: 'Mover para outra lista',
    icon: ArrowRight,
    configFields: [
      { name: 'target_list_id', label: 'Lista de destino', type: 'list', required: true }
    ]
  },
  {
    id: 'archive_task',
    label: 'Arquivar tarefa',
    description: 'Arquivar a tarefa',
    icon: Archive,
    configFields: []
  },
  {
    id: 'send_webhook',
    label: 'Disparar webhook',
    description: 'Enviar dados para uma URL externa',
    icon: Webhook,
    configFields: [
      { name: 'url', label: 'URL do webhook', type: 'text', required: true }
    ]
  },
];

export const getActionById = (id: string): ActionOption | undefined => {
  return ACTION_OPTIONS.find(action => action.id === id);
};
