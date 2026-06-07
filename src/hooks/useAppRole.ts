import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type HubRole =
  | "administrador_global"
  | "administrador"
  | "gestor"
  | "membro"
  | "convidado";

/**
 * Returns the raw Hub role stored on the local profile.
 * Intentionally minimal: only exposes the slug and a single global-admin flag.
 * Mapping to internal permissions is built separately on top of this.
 */
export function useAppRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["app-role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role_slug")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role_slug ?? null) as HubRole | null;
    },
  });

  return {
    role: data ?? null,
    isHubGlobalAdmin: data === "administrador_global",
    isLoading,
  };
}