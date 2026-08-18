import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileAvatarData {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  avatar_origem: string | null;
}

/** Hook único de leitura do perfil (inclui a foto já resolvida em avatar_url). */
export const useProfile = (userId?: string | null) => {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileAvatarData | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, avatar_path, avatar_origem")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileAvatarData) ?? null;
    },
  });
};