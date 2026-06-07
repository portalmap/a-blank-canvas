import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useWebhookEndpoints, 
  useCreateWebhookEndpoint, 
  useUpdateWebhookEndpoint,
  useRegenerateWebhookSecret,
  WEBHOOK_EVENTS 
} from "@/hooks/useWebhooks";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

interface WebhookEndpointFormProps {
  workspaceId: string;
  endpointId?: string;
  onClose: () => void;
}

export function WebhookEndpointForm({ workspaceId, endpointId, onClose }: WebhookEndpointFormProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: endpoints } = useWebhookEndpoints(workspaceId);
  const createEndpoint = useCreateWebhookEndpoint();
  const updateEndpoint = useUpdateWebhookEndpoint();
  const regenerateSecret = useRegenerateWebhookSecret();

  const isEditing = !!endpointId;
  const endpoint = endpoints?.find((e) => e.id === endpointId);

  useEffect(() => {
    if (endpoint) {
      setUrl(endpoint.url);
      setDescription(endpoint.description || "");
      setSelectedEvents(endpoint.events);
    }
  }, [endpoint]);

  const handleEventToggle = (eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue)
        ? prev.filter((e) => e !== eventValue)
        : [...prev, eventValue]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && endpointId) {
      updateEndpoint.mutate(
        { id: endpointId, url, description, events: selectedEvents },
        { onSuccess: onClose }
      );
    } else {
      createEndpoint.mutate(
        { workspaceId, url, description, events: selectedEvents },
        { onSuccess: onClose }
      );
    }
  };

  const handleRegenerateSecret = () => {
    if (endpointId) {
      regenerateSecret.mutate({ id: endpointId });
    }
  };

  const isValid = url.trim() !== "" && selectedEvents.length > 0;
  const isPending = createEndpoint.isPending || updateEndpoint.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{isEditing ? "Editar Endpoint" : "Novo Endpoint"}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">URL do Webhook *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://hooks.example.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              A URL que receberá os eventos via POST
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Ex: Integração com Zapier para CRM"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Eventos *</Label>
            <p className="text-xs text-muted-foreground">
              Selecione os eventos que devem disparar este webhook
            </p>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.value}
                    checked={selectedEvents.includes(event.value)}
                    onCheckedChange={() => handleEventToggle(event.value)}
                  />
                  <Label htmlFor={event.value} className="text-sm font-normal cursor-pointer">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Secret</Label>
              <div className="flex items-center gap-2">
                <Input
                  value="••••••••••••••••••••••••••••••••"
                  disabled
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateSecret}
                  disabled={regenerateSecret.isPending}
                >
                  {regenerateSecret.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O secret é usado para assinar os payloads enviados (HMAC SHA256)
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4">
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Endpoint"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
