import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type PermissionRole = Database["public"]["Enums"]["permission_role"];

interface Resource {
  id: string;
  name: string;
  type: "space" | "folder" | "list";
}

interface Permission {
  resourceId: string;
  role: PermissionRole;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  workspaceId: string;
  onSuccess: () => void;
}

export function UserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  workspaceId,
  onSuccess,
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [permissions, setPermissions] = useState<Map<string, Permission>>(new Map());

  useEffect(() => {
    if (open) {
      loadResources();
      loadPermissions();
    }
  }, [open, userId, workspaceId]);

  const loadResources = async () => {
    try {
      // Carregar spaces
      const { data: spaces, error: spacesError } = await supabase
        .from("spaces")
        .select("id, name")
        .eq("workspace_id", workspaceId);

      if (spacesError) throw spacesError;

      const resourceList: Resource[] = spaces?.map(s => ({
        id: s.id,
        name: s.name,
        type: "space" as const,
      })) || [];

      setResources(resourceList);
    } catch (error: any) {
      toast.error("Erro ao carregar recursos");
    }
  };

  const loadPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("space_permissions")
        .select("space_id, role")
        .eq("user_id", userId);

      if (error) throw error;

      const permMap = new Map<string, Permission>();
      data?.forEach(p => {
        permMap.set(p.space_id, {
          resourceId: p.space_id,
          role: p.role,
        });
      });

      setPermissions(permMap);
    } catch (error: any) {
      toast.error("Erro ao carregar permissões");
    }
  };

  const handleToggleResource = async (resourceId: string, enabled: boolean) => {
    if (enabled) {
      // Adicionar permissão
      const newPermissions = new Map(permissions);
      newPermissions.set(resourceId, {
        resourceId,
        role: "viewer",
      });
      setPermissions(newPermissions);
    } else {
      // Remover permissão
      const newPermissions = new Map(permissions);
      newPermissions.delete(resourceId);
      setPermissions(newPermissions);
    }
  };

  const handleRoleChange = (resourceId: string, role: PermissionRole) => {
    const newPermissions = new Map(permissions);
    const existing = newPermissions.get(resourceId);
    if (existing) {
      newPermissions.set(resourceId, { ...existing, role });
      setPermissions(newPermissions);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Remover permissões existentes
      const { error: deleteError } = await supabase
        .from("space_permissions")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Adicionar novas permissões
      const permissionsArray = Array.from(permissions.values()).map(p => ({
        space_id: p.resourceId,
        user_id: userId,
        role: p.role,
      }));

      if (permissionsArray.length > 0) {
        const { error: insertError } = await supabase
          .from("space_permissions")
          .insert(permissionsArray);

        if (insertError) throw insertError;
      }

      toast.success("Permissões atualizadas com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar permissões");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Defina permissões específicas para {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum recurso disponível
            </p>
          ) : (
            resources.map((resource) => {
              const permission = permissions.get(resource.id);
              const enabled = !!permission;

              return (
                <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        handleToggleResource(resource.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label className="font-medium">{resource.name}</Label>
                      <p className="text-xs text-muted-foreground capitalize">{resource.type}</p>
                    </div>
                  </div>

                  {enabled && (
                    <Select
                      value={permission.role}
                      onValueChange={(value) => handleRoleChange(resource.id, value as PermissionRole)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="commenter">Comentarista</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
