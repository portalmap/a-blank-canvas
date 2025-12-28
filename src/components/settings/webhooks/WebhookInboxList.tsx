import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebhookInbox } from "@/hooks/useWebhooks";
import { Loader2, Inbox, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookInboxListProps {
  workspaceId: string;
}

export function WebhookInboxList({ workspaceId }: WebhookInboxListProps) {
  const { data: inboxItems, isLoading } = useWebhookInbox(workspaceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "received":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Inbox className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge variant="default" className="bg-green-500">Processado</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      case "received":
        return <Badge variant="secondary">Recebido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Webhooks Recebidos</CardTitle>
      </CardHeader>
      <CardContent>
        {inboxItems && inboxItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum webhook recebido</p>
            <p className="text-sm">
              Webhooks de serviços externos aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxItems?.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm capitalize">{item.source}</span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(item.received_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </span>
                      {item.processed_at && (
                        <span>
                          • Processado: {format(new Date(item.processed_at), "HH:mm:ss", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    {item.error && (
                      <p className="text-xs text-destructive truncate max-w-md">
                        {item.error}
                      </p>
                    )}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver payload
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
