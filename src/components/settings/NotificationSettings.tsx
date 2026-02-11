import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useNotificationSettings';
import { Bell, MessageSquare, Clock, AlertTriangle, Newspaper, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const notificationTypes = [
  {
    key: 'task_assigned' as const,
    label: 'Tarefa atribuída',
    description: 'Quando uma tarefa é atribuída ao usuário',
    icon: Bell,
  },
  {
    key: 'comment_assigned' as const,
    label: 'Comentário atribuído',
    description: 'Quando um comentário é atribuído ao usuário (tarefa ou chat)',
    icon: MessageSquare,
  },
  {
    key: 'task_due_tomorrow' as const,
    label: 'Tarefa vence amanhã',
    description: 'Alerta quando uma tarefa do usuário vence no dia seguinte',
    icon: Clock,
  },
  {
    key: 'task_overdue' as const,
    label: 'Tarefa atrasada',
    description: 'Alerta quando uma tarefa do usuário está atrasada',
    icon: AlertTriangle,
  },
  {
    key: 'feed_new_post' as const,
    label: 'Novo post no feed',
    description: 'Quando um novo post é publicado no feed do workspace',
    icon: Newspaper,
  },
  {
    key: 'space_permission_change' as const,
    label: 'Permissão de Space alterada',
    description: 'Quando o usuário recebe ou perde acesso a um Space',
    icon: Shield,
  },
];

export function NotificationSettings() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const handleToggle = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações em Tempo Real
        </CardTitle>
        <CardDescription>
          Configure quais notificações serão exibidas para os membros do workspace. 
          As notificações são pessoais e aparecem apenas para o usuário envolvido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationTypes.map(({ key, label, description, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor={key} className="font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              id={key}
              checked={(settings as any)?.[key] ?? true}
              onCheckedChange={(v) => handleToggle(key, v)}
              disabled={updateSettings.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
