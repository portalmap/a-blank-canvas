import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Loader2, ChevronRight, FolderOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type PermissionRole = Database["public"]["Enums"]["permission_role"];

interface Space {
  id: string;
  name: string;
}

interface WorkspaceWithSpaces {
  id: string;
  name: string;
  spaces: Space[];
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
}: UserPermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithSpaces[]>([]);
  const [permissions, setPermissions] = useState<Map<string, Permission>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && workspaceId) {
      loadResources();
      loadPermissions();
    }
  }, [open, userId, workspaceId]);

  const loadResources = async () => {
    setLoadingResources(true);
    try {
      // Buscar o workspace específico
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspaceId)
        .single();

      if (wsError) throw wsError;

      // Buscar spaces desse workspace
      const { data: spaces, error: spacesError } = await supabase
        .from("spaces")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (spacesError) throw spacesError;

      setWorkspaces([{
        id: workspace.id,
        name: workspace.name,
        spaces: spaces || [],
      }]);

      // Expandir automaticamente o workspace
      setExpanded(new Set([workspaceId]));
    } catch (error: any) {
      toast.error("Erro ao carregar recursos");
      console.error(error);
    } finally {
      setLoadingResources(false);
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
      console.error(error);
    }
  };

  const handleToggleResource = (resourceId: string, enabled: boolean) => {
    const newPermissions = new Map(permissions);
    if (enabled) {
      newPermissions.set(resourceId, {
        resourceId,
        role: "viewer",
      });
    } else {
      newPermissions.delete(resourceId);
    }
    setPermissions(newPermissions);
  };

  const handleRoleChange = (resourceId: string, role: PermissionRole) => {
    const newPermissions = new Map(permissions);
    const existing = newPermissions.get(resourceId);
    if (existing) {
      newPermissions.set(resourceId, { ...existing, role });
      setPermissions(newPermissions);
    }
  };

  const handleToggleExpand = (wsId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(wsId)) {
      newExpanded.delete(wsId);
    } else {
      newExpanded.add(wsId);
    }
    setExpanded(newExpanded);
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
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar permissões");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCount = (workspace: WorkspaceWithSpaces) => {
    return workspace.spaces.filter(s => permissions.has(s.id)).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões de Spaces</DialogTitle>
          <DialogDescription>
            Defina quais Spaces {userName} pode acessar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {loadingResources ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : workspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum workspace encontrado
            </p>
          ) : (
            workspaces.map((workspace) => {
              const isExpanded = expanded.has(workspace.id);
              const selectedCount = getSelectedCount(workspace);

              return (
                <Collapsible
                  key={workspace.id}
                  open={isExpanded}
                  onOpenChange={() => handleToggleExpand(workspace.id)}
                >
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 hover:bg-muted/50 rounded-lg transition-colors border">
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <span className="font-medium flex-1 text-left">{workspace.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {selectedCount}/{workspace.spaces.length} spaces
                    </span>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-6 mt-1">
                    {workspace.spaces.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 pl-6">
                        Nenhum space neste workspace
                      </p>
                    ) : (
                      <div className="space-y-2 py-2">
                        {workspace.spaces.map((space) => {
                          const permission = permissions.get(space.id);
                          const enabled = !!permission;

                          return (
                            <div
                              key={space.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                enabled ? "bg-primary/5 border-primary/20" : "bg-background"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`space-${space.id}`}
                                  checked={enabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleResource(space.id, checked as boolean)
                                  }
                                />
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <Label
                                  htmlFor={`space-${space.id}`}
                                  className="font-normal cursor-pointer"
                                >
                                  {space.name}
                                </Label>
                              </div>

                              {enabled && (
                                <Select
                                  value={permission.role}
                                  onValueChange={(value) =>
                                    handleRoleChange(space.id, value as PermissionRole)
                                  }
                                >
                                  <SelectTrigger className="w-[140px] h-8">
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
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
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
