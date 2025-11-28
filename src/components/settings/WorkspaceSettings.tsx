import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function WorkspaceSettings() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const currentWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);

  // Selecionar o primeiro workspace quando carregar
  useEffect(() => {
    if (workspaces?.length && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Atualizar os campos quando o workspace selecionado mudar
  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || "");
    }
  }, [currentWorkspace]);

  const updateWorkspace = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("Nenhum workspace encontrado");

      const { error } = await supabase
        .from('workspaces')
        .update({ 
          name,
          description: description || null 
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar workspace');
      console.error(error);
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  if (!currentWorkspace) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Nenhum workspace encontrado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Workspace</CardTitle>
        <CardDescription>
          Gerencie as informações do seu workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-select">Selecionar Workspace</Label>
          <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
            <SelectTrigger id="workspace-select">
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-name">Nome do Workspace</Label>
          <Input 
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do workspace"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workspace-description">Descrição</Label>
          <Textarea 
            id="workspace-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do workspace (opcional)"
            rows={4}
          />
        </div>

        <Button 
          onClick={() => updateWorkspace.mutate()}
          disabled={updateWorkspace.isPending || !name.trim()}
        >
          {updateWorkspace.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </CardContent>
    </Card>
  );
}
