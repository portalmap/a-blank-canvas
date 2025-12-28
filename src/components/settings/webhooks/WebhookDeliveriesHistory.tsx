import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebhookDeliveries } from "@/hooks/useWebhooks";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookDeliveriesHistoryProps {
  workspaceId: string;
}

export function WebhookDeliveriesHistory({ workspaceId }: WebhookDeliveriesHistoryProps) {
  const { data: deliveries, isLoading } = useWebhookDeliveries(workspaceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Entregas</CardTitle>
      </CardHeader>
      <CardContent>
        {deliveries && deliveries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma entrega registrada</p>
            <p className="text-sm">As entregas de webhook aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries?.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(delivery.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{delivery.event_type}</span>
                      {getStatusBadge(delivery.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(delivery.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      {delivery.attempt_count > 0 && (
                        <span>• {delivery.attempt_count} tentativa(s)</span>
                      )}
                      {delivery.last_status_code && (
                        <span>• HTTP {delivery.last_status_code}</span>
                      )}
                    </div>
                    {delivery.last_error && (
                      <p className="text-xs text-destructive truncate max-w-md">
                        {delivery.last_error}
                      </p>
                    )}
                  </div>
                </div>
                {delivery.delivered_at && (
                  <span className="text-xs text-muted-foreground">
                    Entregue: {format(new Date(delivery.delivered_at), "HH:mm:ss", { locale: ptBR })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
