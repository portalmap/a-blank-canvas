import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, User, Eye, Folder, List, LayoutGrid, Building2 } from 'lucide-react';
import { useToggleAutomation, useDeleteAutomation, type Automation, type AutomationScope } from '@/hooks/useAutomations';

interface AutomationCardProps {
  automation: Automation;
  userName?: string;
  userAvatar?: string;
}

const getScopeIcon = (scope: AutomationScope) => {
  switch (scope) {
    case 'workspace': return <Building2 className="h-3.5 w-3.5" />;
    case 'space': return <LayoutGrid className="h-3.5 w-3.5" />;
    case 'folder': return <Folder className="h-3.5 w-3.5" />;
    case 'list': return <List className="h-3.5 w-3.5" />;
  }
};

const getScopeLabel = (scope: AutomationScope) => {
  switch (scope) {
    case 'workspace': return 'Workspace';
    case 'space': return 'Space';
    case 'folder': return 'Pasta';
    case 'list': return 'Lista';
  }
};

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'auto_assign_user': return <User className="h-5 w-5 text-primary" />;
    case 'auto_add_follower': return <Eye className="h-5 w-5 text-blue-500" />;
    default: return <User className="h-5 w-5" />;
  }
};

const getActionLabel = (actionType: string) => {
  switch (actionType) {
    case 'auto_assign_user': return 'Atribuir Responsável';
    case 'auto_add_follower': return 'Adicionar Seguidor';
    default: return actionType;
  }
};

export function AutomationCard({ automation, userName, userAvatar }: AutomationCardProps) {
  const toggleAutomation = useToggleAutomation();
  const deleteAutomation = useDeleteAutomation();

  const handleToggle = (checked: boolean) => {
    toggleAutomation.mutate({ id: automation.id, isActive: checked });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      deleteAutomation.mutate(automation.id);
    }
  };

  const actionConfig = automation.action_config as Record<string, any> | null;

  return (
    <Card className={`transition-opacity ${!automation.enabled ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon and Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
              {getActionIcon(automation.action_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">
                  {automation.description || getActionLabel(automation.action_type)}
                </h4>
                <Badge variant="outline" className="gap-1 text-xs">
                  {getScopeIcon(automation.scope_type)}
                  {getScopeLabel(automation.scope_type)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getActionLabel(automation.action_type)} quando tarefa for criada
              </p>
            </div>
          </div>

          {/* Center: Assigned User */}
          {actionConfig?.user_id && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Avatar className="h-7 w-7">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="text-xs">
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {userName || 'Usuário'}
              </span>
            </div>
          )}

          {/* Right: Toggle and Delete */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Switch
              checked={automation.enabled}
              onCheckedChange={handleToggle}
              disabled={toggleAutomation.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteAutomation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
