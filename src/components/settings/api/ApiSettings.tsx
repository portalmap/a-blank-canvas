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
const GATEWAY_ENDPOINT = `${SUPABASE_URL}/functions/v1/api-gateway`;
const TASKS_ENDPOINT = `${SUPABASE_URL}/functions/v1/api-tasks`;

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
  const [showDocs, setShowDocs] = useState(false);

  const copyEndpoint = async (url: string, label: string) => {
    await navigator.clipboard.writeText(url);
    toast({
      title: "URL copiada",
      description: `A URL do endpoint ${label} foi copiada para a área de transferência.`,
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

          {/* API Completa Endpoint */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API Completa (todos os recursos)</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={GATEWAY_ENDPOINT}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => copyEndpoint(GATEWAY_ENDPOINT, "API Completa")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              RESTful API com acesso a todos os recursos do workspace.
            </p>
          </div>

          {/* API de Tarefas Endpoint */}
          <div className="space-y-2">
            <label className="text-sm font-medium">API de Tarefas (apenas criar tarefas)</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={TASKS_ENDPOINT}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => copyEndpoint(TASKS_ENDPOINT, "API de Tarefas")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoint legado para criar tarefas via POST.
            </p>
          </div>

          {/* Documentation Toggle */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowDocs(!showDocs)}
          >
            {showDocs ? "Ocultar Documentação" : "Ver Documentação da API"}
          </Button>

          {showDocs && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4 text-sm">
              <h4 className="font-semibold">Endpoints Disponíveis</h4>
              <div className="font-mono text-xs space-y-1">
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /spaces</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /folders</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /lists</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /tasks</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /subtasks</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /statuses</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /tags - Etiquetas do workspace</p>
                <p><span className="text-green-600">GET/POST/DELETE</span> /task-tags - Relações tarefa-etiqueta</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /comments</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /checklists</p>
                <p><span className="text-green-600">GET/POST/PUT/DELETE</span> /checklist-items</p>
                <p><span className="text-green-600">GET/POST/DELETE</span> /assignees</p>
                <p><span className="text-green-600">GET/POST/DELETE</span> /attachments</p>
                <p><span className="text-blue-600">GET</span> /members</p>
              </div>

              <h4 className="font-semibold mt-4">Exemplo de Uso</h4>
              <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Listar tarefas
GET ${GATEWAY_ENDPOINT}/tasks
Authorization: Bearer {SEU_TOKEN}

// Criar tarefa
POST ${GATEWAY_ENDPOINT}/tasks
Authorization: Bearer {SEU_TOKEN}
Content-Type: application/json

{
  "title": "Nova Tarefa",
  "list_id": "uuid-da-lista",
  "description": "Descrição opcional",
  "priority": "high"
}

// Atualizar tarefa
PUT ${GATEWAY_ENDPOINT}/tasks/{task_id}
Authorization: Bearer {SEU_TOKEN}
Content-Type: application/json

{
  "title": "Título Atualizado",
  "status_id": "uuid-do-status"
}`}
              </pre>

              <h4 className="font-semibold mt-4">Query Parameters</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li><code className="bg-background px-1 rounded">/tasks?list_id=uuid</code> - Filtrar tarefas por lista</li>
                <li><code className="bg-background px-1 rounded">/tasks?status_id=uuid</code> - Filtrar por status</li>
                <li><code className="bg-background px-1 rounded">/lists?space_id=uuid</code> - Filtrar listas por espaço</li>
                <li><code className="bg-background px-1 rounded">/folders?space_id=uuid</code> - Filtrar pastas por espaço</li>
                <li><code className="bg-background px-1 rounded">/comments?task_id=uuid</code> - Comentários de uma tarefa</li>
                <li><code className="bg-background px-1 rounded">/subtasks?parent_id=uuid</code> - Subtarefas de uma tarefa</li>
                <li><code className="bg-background px-1 rounded">/task-tags?task_id=uuid</code> - Etiquetas de uma tarefa</li>
              </ul>

              <h4 className="font-semibold mt-4">Gerenciar Etiquetas</h4>
              <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`// Listar etiquetas do workspace
GET ${GATEWAY_ENDPOINT}/tags
Authorization: Bearer {SEU_TOKEN}

// Criar etiqueta
POST ${GATEWAY_ENDPOINT}/tags
{
  "name": "Bug",
  "color": "#ef4444"
}

// Adicionar etiqueta a uma tarefa
POST ${GATEWAY_ENDPOINT}/task-tags
{
  "task_id": "uuid-da-tarefa",
  "tag_id": "uuid-da-etiqueta"
}

// Remover etiqueta de uma tarefa
DELETE ${GATEWAY_ENDPOINT}/task-tags?task_id=uuid&tag_id=uuid`}
              </pre>
            </div>
          )}
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
