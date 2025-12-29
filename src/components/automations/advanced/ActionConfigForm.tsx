import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getActionById, ActionConfigField } from './actionCategories';

interface ActionConfigFormProps {
  actionId: string;
  workspaceId: string;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

export const ActionConfigForm = ({ 
  actionId, 
  workspaceId, 
  config, 
  onConfigChange 
}: ActionConfigFormProps) => {
  const action = getActionById(actionId);

  // Fetch workspace members
  const { data: members } = useQuery({
    queryKey: ['workspace-members-with-profiles', workspaceId],
    queryFn: async () => {
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
        profile: profiles?.find(p => p.id === member.user_id) || null
      }));
    },
    enabled: !!workspaceId,
  });

  // Fetch statuses
  const { data: statuses } = useQuery({
    queryKey: ['workspace-statuses', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  if (!action || !action.configFields?.length) {
    return null;
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    onConfigChange({ ...config, [fieldName]: value });
  };

  const renderField = (field: ActionConfigField) => {
    switch (field.type) {
      case 'user':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profile?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.profile?.full_name || 'Usuário'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'status':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status..." />
              </SelectTrigger>
              <SelectContent>
                {statuses?.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color || '#94a3b8' }}
                      />
                      <span>{status.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'priority':
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={config[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              type="number"
              value={config[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              value={config[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Digite ${field.label.toLowerCase()}...`}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-medium text-sm">Configurar ação</h4>
      {action.configFields.map(renderField)}
    </div>
  );
};
