import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useWorkspaces, useDefaultWorkspace, useSetDefaultWorkspace } from "@/hooks/useWorkspaces";

export function UserProfile() {
  const { user } = useAuth();
  const [email] = useState(user?.email || "");
  const { data: workspaces } = useWorkspaces();
  const { data: defaultWorkspaceId } = useDefaultWorkspace();
  const setDefaultWorkspace = useSetDefaultWorkspace();

  const handleDefaultWorkspaceChange = (value: string) => {
    setDefaultWorkspace.mutate(value === "__none__" ? null : value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil do Usuário</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={email}
            disabled
            className="bg-muted"
          />
          <p className="text-sm text-muted-foreground">
            Seu email não pode ser alterado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-id">ID do Usuário</Label>
          <Input 
            id="user-id" 
            value={user?.id || ""}
            disabled
            className="bg-muted font-mono text-xs"
          />
        </div>

        {workspaces && workspaces.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="default-workspace">Workspace Padrão</Label>
            <Select 
              value={defaultWorkspaceId || "__none__"} 
              onValueChange={handleDefaultWorkspaceChange}
            >
              <SelectTrigger id="default-workspace">
                <SelectValue placeholder="Selecione um workspace padrão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum (mostrar seleção)</SelectItem>
                {workspaces.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Este workspace será selecionado automaticamente ao abrir o sistema
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
