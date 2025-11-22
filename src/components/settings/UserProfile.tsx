import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

export function UserProfile() {
  const { user } = useAuth();
  const [email] = useState(user?.email || "");

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
      </CardContent>
    </Card>
  );
}
