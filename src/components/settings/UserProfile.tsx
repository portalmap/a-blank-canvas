import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useWorkspaces, useDefaultWorkspace, useSetDefaultWorkspace } from "@/hooks/useWorkspaces";
import { AvatarUpload } from "./AvatarUpload";
import { useProfile } from "@/hooks/useProfile";

export function UserProfile() {
  const { user } = useAuth();
  const [email] = useState(user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { data: profile } = useProfile(user?.id);
  const fullName = profile?.full_name || user?.email || "";
  const { data: workspaces } = useWorkspaces();
  const { data: defaultWorkspaceId } = useDefaultWorkspace();
  const setDefaultWorkspace = useSetDefaultWorkspace();

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.avatar_url]);

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
      <CardContent className="space-y-6">
        {user?.id && (
          <div className="flex flex-col items-center gap-2 pb-2 border-b">
            <AvatarUpload
              userId={user.id}
              currentUrl={avatarUrl}
              fullName={fullName}
              size={96}
              onChange={(url) => setAvatarUrl(url)}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP — até 2 MB
            </p>
          </div>
        )}

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
