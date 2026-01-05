import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Plus, Key } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useListsForWorkspace } from "@/hooks/useLists";
import { useStatuses } from "@/hooks/useStatuses";
import {
  useApiTokens,
  useCreateApiToken,
  useUpdateApiToken,
  useRegenerateApiToken,
  useDeleteApiToken,
} from "@/hooks/useApiTokens";
import { useToast } from "@/hooks/use-toast";
import { TokenCard } from "./TokenCard";
import { CreateTokenDialog } from "./CreateTokenDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function ApiSettings() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: lists = [] } = useListsForWorkspace(activeWorkspace?.id);
  const { data: statuses = [] } = useStatuses(activeWorkspace?.id);
  const { data: tokens = [], isLoading: tokensLoading } = useApiTokens(activeWorkspace?.id);
  const createToken = useCreateApiToken();
  const updateToken = useUpdateApiToken();
  const regenerateToken = useRegenerateApiToken();
  const deleteToken = useDeleteApiToken();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const endpointUrl = `${SUPABASE_URL}/functions/v1/api-tasks`;

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(endpointUrl);
    toast({
      title: "URL copiada",
      description: "A URL do endpoint foi copiada para a área de transferência.",
    });
  };

  const handleCreateToken = async (data: {
    name: string;
    targetListId?: string;
    defaultStatusId?: string;
  }) => {
    if (!activeWorkspace?.id) return;

    await createToken.mutateAsync({
      workspaceId: activeWorkspace.id,
      name: data.name,
      targetListId: data.targetListId,
      defaultStatusId: data.defaultStatusId,
    });

    setCreateDialogOpen(false);
  };

  if (workspacesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!activeWorkspace && workspaces && workspaces.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecione um Workspace</CardTitle>
          <CardDescription>
            Escolha um workspace para gerenciar os tokens de API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={(value) => {
              const workspace = workspaces.find((w) => w.id === value);
              if (workspace) setActiveWorkspace(workspace);
            }}
          >
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Selecione um workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
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
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Integração de API</CardTitle>
          </div>
          <CardDescription>
            Configure tokens para integrar sistemas externos e criar tarefas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workspace selector */}
          {workspaces && workspaces.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace</label>
              <Select
                value={activeWorkspace?.id}
                onValueChange={(value) => {
                  const workspace = workspaces.find((w) => w.id === value);
                  if (workspace) setActiveWorkspace(workspace);
                }}
              >
                <SelectTrigger className="w-full max-w-sm">
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
            </div>
          )}

          {/* Endpoint URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">URL do Endpoint</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={endpointUrl}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyEndpoint}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta URL para enviar requisições POST com tarefas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Token Button */}
      <Button onClick={() => setCreateDialogOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Criar Novo Token
      </Button>

      {/* Tokens List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Tokens {tokens.length > 0 && `(${tokens.length})`}
        </h3>

        {tokensLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum token criado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie um token para começar a integrar sistemas externos.
              </p>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <TokenCard
              key={token.id}
              token={token}
              lists={lists}
              statuses={statuses}
              onUpdate={(updates) => updateToken.mutate(updates)}
              onRegenerate={(id, workspaceId) =>
                regenerateToken.mutate({ id, workspaceId })
              }
              onDelete={(id, workspaceId) =>
                deleteToken.mutate({ id, workspaceId })
              }
              isUpdating={updateToken.isPending}
            />
          ))
        )}
      </div>

      {/* Create Dialog */}
      <CreateTokenDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        lists={lists}
        statuses={statuses}
        onSubmit={handleCreateToken}
        isLoading={createToken.isPending}
      />
    </div>
  );
}
