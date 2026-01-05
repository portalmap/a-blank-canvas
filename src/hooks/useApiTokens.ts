import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ApiToken {
  id: string;
  workspace_id: string;
  name: string;
  token: string;
  target_list_id: string | null;
  default_status_id: string | null;
  is_active: boolean;
  permissions: string[];
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function useApiTokens(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["api-tokens", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from("api_tokens")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiToken[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      name,
      targetListId,
      defaultStatusId,
    }: {
      workspaceId: string;
      name: string;
      targetListId?: string;
      defaultStatusId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const token = generateSecureToken();

      const { data, error } = await supabase
        .from("api_tokens")
        .insert({
          workspace_id: workspaceId,
          name,
          token,
          target_list_id: targetListId || null,
          default_status_id: defaultStatusId || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ApiToken;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens", variables.workspaceId] });
      toast({
        title: "Token criado",
        description: "Seu token de API foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar token",
        description: error.message,
      });
    },
  });
}

export function useUpdateApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      name,
      targetListId,
      defaultStatusId,
      isActive,
    }: {
      id: string;
      workspaceId: string;
      name?: string;
      targetListId?: string | null;
      defaultStatusId?: string | null;
      isActive?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (targetListId !== undefined) updates.target_list_id = targetListId;
      if (defaultStatusId !== undefined) updates.default_status_id = defaultStatusId;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data, error } = await supabase
        .from("api_tokens")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens", result.workspaceId] });
      toast({
        title: "Token atualizado",
        description: "As configurações foram salvas.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar token",
        description: error.message,
      });
    },
  });
}

export function useRegenerateApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const newToken = generateSecureToken();

      const { data, error } = await supabase
        .from("api_tokens")
        .update({ token: newToken })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as ApiToken, workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens", result.workspaceId] });
      toast({
        title: "Token regenerado",
        description: "Um novo token foi gerado. O token anterior foi invalidado.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao regenerar token",
        description: error.message,
      });
    },
  });
}

export function useDeleteApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("api_tokens")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens", result.workspaceId] });
      toast({
        title: "Token excluído",
        description: "O token foi removido permanentemente.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir token",
        description: error.message,
      });
    },
  });
}
