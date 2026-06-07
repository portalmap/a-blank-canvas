import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AutomationCondition {
  id: string;
  field: 'tag' | 'priority' | 'assignee' | 'due_date' | 'has_subtasks';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_set' | 'is_not_set' | 'any_of' | 'none_of';
  value: string | string[];
  logic: 'AND' | 'OR';
}

interface ConditionRowProps {
  condition: AutomationCondition;
  workspaceId: string;
  onUpdate: (updates: Partial<AutomationCondition>) => void;
  onDelete: () => void;
}

const FIELD_OPTIONS = [
  { value: 'tag', label: 'Etiqueta' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'assignee', label: 'Responsável' },
  { value: 'due_date', label: 'Data de vencimento' },
  { value: 'has_subtasks', label: 'Subtarefas' },
];

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  tag: [
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'any_of', label: 'Inclui uma das opções' },
    { value: 'none_of', label: 'Não inclui nenhuma' },
  ],
  priority: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'É diferente de' },
    { value: 'any_of', label: 'É uma das opções' },
  ],
  assignee: [
    { value: 'is_set', label: 'Está atribuído' },
    { value: 'is_not_set', label: 'Não está atribuído' },
    { value: 'contains', label: 'Inclui usuário' },
    { value: 'not_contains', label: 'Não inclui usuário' },
  ],
  due_date: [
    { value: 'is_set', label: 'Está definida' },
    { value: 'is_not_set', label: 'Não está definida' },
  ],
  has_subtasks: [
    { value: 'is_set', label: 'Possui subtarefas' },
    { value: 'is_not_set', label: 'Não possui subtarefas' },
  ],
};

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export const ConditionRow = ({
  condition,
  workspaceId,
  onUpdate,
  onDelete,
}: ConditionRowProps) => {
  // Fetch workspace members for assignee conditions
  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data: workspaceMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      const userIds = workspaceMembers.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return workspaceMembers.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null,
      }));
    },
    enabled: !!workspaceId && condition.field === 'assignee',
  });

  // Fetch tags for tag conditions
  const { data: tags = [] } = useQuery({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('task_tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId && condition.field === 'tag',
  });

  const handleFieldChange = (field: string) => {
    // Reset operator and value when field changes
    const defaultOperator = OPERATOR_OPTIONS[field]?.[0]?.value || 'equals';
    onUpdate({ 
      field: field as AutomationCondition['field'], 
      operator: defaultOperator as AutomationCondition['operator'],
      value: [] 
    });
  };

  const handleOperatorChange = (operator: string) => {
    onUpdate({ operator: operator as AutomationCondition['operator'] });
  };

  const handleValueChange = (value: string | string[]) => {
    onUpdate({ value });
  };

  const operators = OPERATOR_OPTIONS[condition.field] || [];
  const needsValue = !['is_set', 'is_not_set'].includes(condition.operator);

  const renderValueInput = () => {
    if (!needsValue) return null;

    const currentValues = Array.isArray(condition.value) ? condition.value : [condition.value].filter(Boolean);

    switch (condition.field) {
      case 'priority':
        return (
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map(opt => (
              <Badge
                key={opt.value}
                variant={currentValues.includes(opt.value) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  if (currentValues.includes(opt.value)) {
                    handleValueChange(currentValues.filter(v => v !== opt.value));
                  } else {
                    handleValueChange([...currentValues, opt.value]);
                  }
                }}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        );

      case 'assignee':
        return (
          <Select
            value={currentValues[0] || ''}
            onValueChange={(v) => handleValueChange([v])}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione usuário..." />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || 'Usuário'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'tag':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {currentValues.map(tagName => (
                <Badge
                  key={tagName}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleValueChange(currentValues.filter(v => v !== tagName))}
                >
                  {tagName} ×
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(v) => {
                if (v && !currentValues.includes(v)) {
                  handleValueChange([...currentValues, v]);
                }
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Adicionar etiqueta..." />
              </SelectTrigger>
              <SelectContent>
                {tags
                  .filter(tag => !currentValues.includes(tag.name))
                  .map(tag => (
                    <SelectItem key={tag.id} value={tag.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#94a3b8' }}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <Input
            value={typeof condition.value === 'string' ? condition.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Valor..."
            className="h-8"
          />
        );
    }
  };

  return (
    <div className="flex items-start gap-1.5 p-2 bg-muted/30 rounded-md border">
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* Field selector */}
          <Select value={condition.field} onValueChange={handleFieldChange}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator selector */}
          <Select value={condition.operator} onValueChange={handleOperatorChange}>
            <SelectTrigger className="h-7 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value input */}
        {needsValue && <div className="pl-0">{renderValueInput()}</div>}
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
