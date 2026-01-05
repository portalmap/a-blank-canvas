import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Copy, RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ApiToken } from "@/hooks/useApiTokens";
import { useToast } from "@/hooks/use-toast";

interface TokenCardProps {
  token: ApiToken;
  lists: Array<{ id: string; name: string }>;
  statuses: Array<{ id: string; name: string; color: string | null }>;
  onUpdate: (updates: {
    id: string;
    workspaceId: string;
    name?: string;
    targetListId?: string | null;
    defaultStatusId?: string | null;
    isActive?: boolean;
  }) => void;
  onRegenerate: (id: string, workspaceId: string) => void;
  onDelete: (id: string, workspaceId: string) => void;
  isUpdating: boolean;
}

export function TokenCard({
  token,
  lists,
  statuses,
  onUpdate,
  onRegenerate,
  onDelete,
  isUpdating,
}: TokenCardProps) {
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const copyToken = async () => {
    await navigator.clipboard.writeText(token.token);
    toast({
      title: "Token copiado",
      description: "O token foi copiado para a área de transferência.",
    });
  };

  const maskedToken = showToken
    ? token.token
    : "•".repeat(32) + token.token.slice(-8);

  return (
    <Card className={!token.is_active ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${token.is_active ? "bg-green-500" : "bg-muted"}`} />
            {token.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={token.is_active ? "default" : "secondary"}>
              {token.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Switch
              checked={token.is_active}
              onCheckedChange={(checked) =>
                onUpdate({
                  id: token.id,
                  workspaceId: token.workspace_id,
                  isActive: checked,
                })
              }
              disabled={isUpdating}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Token</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono overflow-hidden text-ellipsis">
              {maskedToken}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={copyToken}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Lista de destino
            </label>
            <Select
              value={token.target_list_id || "none"}
              onValueChange={(value) =>
                onUpdate({
                  id: token.id,
                  workspaceId: token.workspace_id,
                  targetListId: value === "none" ? null : value,
                })
              }
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (definir na requisição)</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Status padrão
            </label>
            <Select
              value={token.default_status_id || "none"}
              onValueChange={(value) =>
                onUpdate({
                  id: token.id,
                  workspaceId: token.workspace_id,
                  defaultStatusId: value === "none" ? null : value,
                })
              }
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Usar padrão da lista</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color || "#94a3b8" }}
                      />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {token.last_used_at ? (
              <span>
                Último uso:{" "}
                {formatDistanceToNow(new Date(token.last_used_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            ) : (
              <span>Nunca utilizado</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerar token?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá gerar um novo token e invalidar o atual.
                    Qualquer integração usando este token deixará de funcionar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onRegenerate(token.id, token.workspace_id)}
                  >
                    Regenerar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir token?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O token será removido
                    permanentemente e todas as integrações que o utilizam
                    deixarão de funcionar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(token.id, token.workspace_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
