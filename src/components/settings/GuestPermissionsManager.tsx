import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Folder, List, CheckSquare } from "lucide-react";
import { useWorkspaces } from "@/hooks/useWorkspaces";

type PermissionRole = "viewer" | "editor";

export function GuestPermissionsManager() {
  const { data: workspaces } = useWorkspaces();
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.[0];

  // Buscar guests do workspace
  const { data: guests } = useQuery({
    queryKey: ["workspace-guests", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("role", "guest");

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  // Buscar recursos disponíveis (spaces, folders, lists, tasks)
  const { data: spaces } = useQuery({
    queryKey: ["spaces", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("spaces")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: folders } = useQuery({
    queryKey: ["folders", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("folders")
        .select("id, name, space_id, spaces(name)")
        .in("space_id", spaces?.map((s) => s.id) || []);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace && !!spaces,
  });

  const { data: lists } = useQuery({
    queryKey: ["lists", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await supabase
        .from("lists")
        .select("id, name, folder_id, space_id")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  // Buscar permissões atuais do guest selecionado
  const { data: guestPermissions } = useQuery({
    queryKey: ["guest-permissions", selectedGuestId],
    queryFn: async () => {
      if (!selectedGuestId) return { spaces: [], folders: [], lists: [] };

      const [spacePerms, folderPerms, listPerms] = await Promise.all([
        supabase
          .from("space_permissions")
          .select("*")
          .eq("user_id", selectedGuestId),
        supabase
          .from("folder_permissions")
          .select("*")
          .eq("user_id", selectedGuestId),
        supabase
          .from("list_permissions")
          .select("*")
          .eq("user_id", selectedGuestId),
      ]);

      return {
        spaces: spacePerms.data || [],
        folders: folderPerms.data || [],
        lists: listPerms.data || [],
      };
    },
    enabled: !!selectedGuestId,
  });

  // Adicionar/remover permissões
  const togglePermission = useMutation({
    mutationFn: async ({
      resourceType,
      resourceId,
      hasPermission,
      role = "viewer",
    }: {
      resourceType: "space" | "folder" | "list";
      resourceId: string;
      hasPermission: boolean;
      role?: PermissionRole;
    }) => {
      const table = `${resourceType}_permissions`;
      const column = `${resourceType}_id`;

      if (hasPermission) {
        // Remover permissão
        if (resourceType === "space") {
          const { error } = await supabase
            .from("space_permissions")
            .delete()
            .eq("user_id", selectedGuestId)
            .eq("space_id", resourceId);
          if (error) throw error;
        } else if (resourceType === "folder") {
          const { error } = await supabase
            .from("folder_permissions")
            .delete()
            .eq("user_id", selectedGuestId)
            .eq("folder_id", resourceId);
          if (error) throw error;
        } else if (resourceType === "list") {
          const { error } = await supabase
            .from("list_permissions")
            .delete()
            .eq("user_id", selectedGuestId)
            .eq("list_id", resourceId);
          if (error) throw error;
        }
      } else {
        // Adicionar permissão
        if (resourceType === "space") {
          const { error } = await supabase
            .from("space_permissions")
            .insert({
              user_id: selectedGuestId,
              space_id: resourceId,
              role,
            });
          if (error) throw error;
        } else if (resourceType === "folder") {
          const { error } = await supabase
            .from("folder_permissions")
            .insert({
              user_id: selectedGuestId,
              folder_id: resourceId,
              role,
            });
          if (error) throw error;
        } else if (resourceType === "list") {
          const { error } = await supabase
            .from("list_permissions")
            .insert({
              user_id: selectedGuestId,
              list_id: resourceId,
              role,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guest-permissions"] });
      toast.success("Permissão atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissão");
    },
  });

  const hasSpacePermission = (spaceId: string) =>
    guestPermissions?.spaces.some((p) => p.space_id === spaceId);

  const hasFolderPermission = (folderId: string) =>
    guestPermissions?.folders.some((p) => p.folder_id === folderId);

  const hasListPermission = (listId: string) =>
    guestPermissions?.lists.some((p) => p.list_id === listId);

  if (!guests || guests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Permissões de Convidados
          </CardTitle>
          <CardDescription>
            Nenhum convidado encontrado no workspace
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Gerenciar Permissões de Convidados
        </CardTitle>
        <CardDescription>
          Defina acesso específico a recursos para convidados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Selecione um Convidado</Label>
          <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um convidado" />
            </SelectTrigger>
            <SelectContent>
              {guests.map((guest) => (
                <SelectItem key={guest.user_id} value={guest.user_id}>
                  {guest.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGuestId && (
          <div className="space-y-6">
            {/* Spaces */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <h3 className="font-semibold">Espaços</h3>
              </div>
              <div className="space-y-2">
                {spaces?.map((space) => (
                  <div
                    key={space.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={hasSpacePermission(space.id)}
                        onCheckedChange={() =>
                          togglePermission.mutate({
                            resourceType: "space",
                            resourceId: space.id,
                            hasPermission: hasSpacePermission(space.id),
                          })
                        }
                      />
                      <Label className="cursor-pointer">{space.name}</Label>
                    </div>
                    {hasSpacePermission(space.id) && (
                      <Badge variant="outline">Acesso concedido</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Folders */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                <h3 className="font-semibold">Pastas</h3>
              </div>
              <div className="space-y-2">
                {folders?.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={hasFolderPermission(folder.id)}
                        onCheckedChange={() =>
                          togglePermission.mutate({
                            resourceType: "folder",
                            resourceId: folder.id,
                            hasPermission: hasFolderPermission(folder.id),
                          })
                        }
                      />
                      <div>
                        <Label className="cursor-pointer">{folder.name}</Label>
                        <p className="text-xs text-muted-foreground">
                          em {folder.spaces?.name}
                        </p>
                      </div>
                    </div>
                    {hasFolderPermission(folder.id) && (
                      <Badge variant="outline">Acesso concedido</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lists */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <h3 className="font-semibold">Listas</h3>
              </div>
              <div className="space-y-2">
                {lists?.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={hasListPermission(list.id)}
                        onCheckedChange={() =>
                          togglePermission.mutate({
                            resourceType: "list",
                            resourceId: list.id,
                            hasPermission: hasListPermission(list.id),
                          })
                        }
                      />
                      <Label className="cursor-pointer">{list.name}</Label>
                    </div>
                    {hasListPermission(list.id) && (
                      <Badge variant="outline">Acesso concedido</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}