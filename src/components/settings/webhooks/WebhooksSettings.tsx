import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WebhookEndpointsList } from "./WebhookEndpointsList";
import { WebhookDeliveriesHistory } from "./WebhookDeliveriesHistory";
import { WebhookInboxList } from "./WebhookInboxList";
import { Loader2 } from "lucide-react";

export function WebhooksSettings() {
  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces?.find((w) => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
    }
  };

  if (loadingWorkspaces) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Selecione um workspace para gerenciar webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleWorkspaceChange}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Selecione um workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces?.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks para integrar com serviços externos
              </CardDescription>
            </div>
            {workspaces && workspaces.length > 1 && (
              <Select value={activeWorkspace.id} onValueChange={handleWorkspaceChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="inbox">Recebidos</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-4">
          <WebhookEndpointsList workspaceId={activeWorkspace.id} />
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <WebhookDeliveriesHistory workspaceId={activeWorkspace.id} />
        </TabsContent>

        <TabsContent value="inbox" className="mt-4">
          <WebhookInboxList workspaceId={activeWorkspace.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
