import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  useWebhookEndpoints, 
  useUpdateWebhookEndpoint, 
  useDeleteWebhookEndpoint,
  useSendTestWebhook,
  useTriggerDispatcher
} from "@/hooks/useWebhooks";
import { WebhookEndpointForm } from "./WebhookEndpointForm";
import { 
  Plus, 
  Loader2, 
  Edit, 
  Trash2, 
  Send, 
  Play,
  Globe,
  AlertCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WebhookEndpointsListProps {
  workspaceId: string;
}

export function WebhookEndpointsList({ workspaceId }: WebhookEndpointsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [deleteEndpointId, setDeleteEndpointId] = useState<string | null>(null);

  const { data: endpoints, isLoading } = useWebhookEndpoints(workspaceId);
  const updateEndpoint = useUpdateWebhookEndpoint();
  const deleteEndpoint = useDeleteWebhookEndpoint();
  const sendTestWebhook = useSendTestWebhook();
  const triggerDispatcher = useTriggerDispatcher();

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updateEndpoint.mutate({ id, is_active: !currentStatus });
  };

  const handleDelete = () => {
    if (deleteEndpointId) {
      deleteEndpoint.mutate({ id: deleteEndpointId, workspaceId });
      setDeleteEndpointId(null);
    }
  };

  const handleSendTest = (endpointId: string) => {
    sendTestWebhook.mutate({ endpointId, workspaceId });
  };

  const handleTriggerDispatcher = () => {
    triggerDispatcher.mutate({ workspaceId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showForm || editingEndpoint) {
    return (
      <WebhookEndpointForm
        workspaceId={workspaceId}
        endpointId={editingEndpoint || undefined}
        onClose={() => {
          setShowForm(false);
          setEditingEndpoint(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Endpoint
          </Button>
          <Button variant="outline" onClick={handleTriggerDispatcher} disabled={triggerDispatcher.isPending}>
            {triggerDispatcher.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Processar Fila
          </Button>
        </div>
      </div>

      {endpoints && endpoints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum endpoint configurado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione um endpoint para começar a enviar webhooks para serviços externos.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Endpoint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints?.map((endpoint) => (
            <Card key={endpoint.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-medium truncate">
                        {endpoint.url}
                      </CardTitle>
                      <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                        {endpoint.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {endpoint.description && (
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {endpoint.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={endpoint.is_active}
                      onCheckedChange={() => handleToggleActive(endpoint.id, endpoint.is_active)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEndpoint(endpoint.id)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendTest(endpoint.id)}
                    disabled={sendTestWebhook.isPending}
                  >
                    {sendTestWebhook.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1" />
                    )}
                    Testar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteEndpointId(endpoint.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteEndpointId} onOpenChange={() => setDeleteEndpointId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Excluir Endpoint
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este endpoint? Esta ação não pode ser desfeita.
              Todas as entregas pendentes para este endpoint também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
