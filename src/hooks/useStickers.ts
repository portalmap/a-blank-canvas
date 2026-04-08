import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface StickerPack {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Sticker {
  id: string;
  pack_id: string | null;
  workspace_id: string;
  name: string | null;
  image_url: string;
  created_by: string;
  created_at: string;
  signed_url?: string;
}

const getStickerSignedUrl = async (path: string): Promise<string> => {
  const { data } = await supabase.storage.from('stickers').createSignedUrl(path, 1296000);
  return data?.signedUrl || path;
};

export const useStickerPacks = () => {
  const { activeWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['sticker-packs', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('sticker_packs')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StickerPack[];
    },
    enabled: !!activeWorkspace?.id,
  });
};

export const useStickers = (packId?: string) => {
  const { activeWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['stickers', activeWorkspace?.id, packId],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];
      let query = supabase
        .from('stickers')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      if (packId) query = query.eq('pack_id', packId);
      const { data, error } = await query;
      if (error) throw error;

      // Resolve signed URLs
      const stickers = data as Sticker[];
      const paths = stickers.map(s => s.image_url);
      if (paths.length > 0) {
        const { data: signedData } = await supabase.storage.from('stickers').createSignedUrls(paths, 1296000);
        if (signedData) {
          stickers.forEach((s, i) => { s.signed_url = signedData[i]?.signedUrl || s.image_url; });
        }
      }
      return stickers;
    },
    enabled: !!activeWorkspace?.id,
  });
};

export const useRecentStickers = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['recent-stickers', user?.id, activeWorkspace?.id],
    queryFn: async () => {
      if (!user?.id || !activeWorkspace?.id) return [];
      const { data: usage, error } = await supabase
        .from('sticker_usage')
        .select('sticker_id, used_at')
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!usage || usage.length === 0) return [];

      const ids = [...new Set(usage.map(u => u.sticker_id))];
      const { data: stickers } = await supabase
        .from('stickers')
        .select('*')
        .in('id', ids);
      if (!stickers) return [];

      const paths = stickers.map(s => s.image_url);
      const { data: signedData } = await supabase.storage.from('stickers').createSignedUrls(paths, 1296000);
      const stickerMap = new Map(stickers.map((s, i) => [s.id, { ...s, signed_url: signedData?.[i]?.signedUrl || s.image_url } as Sticker]));

      // Return in order of usage
      return ids.map(id => stickerMap.get(id)).filter(Boolean) as Sticker[];
    },
    enabled: !!user?.id && !!activeWorkspace?.id,
  });
};

export const useCreateStickerPack = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user?.id || !activeWorkspace?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('sticker_packs')
        .insert({ workspace_id: activeWorkspace.id, name, description: description || null, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sticker-packs'] });
      toast.success('Pacote criado!');
    },
    onError: () => toast.error('Erro ao criar pacote'),
  });
};

export const useCreateSticker = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ file, packId, name }: { file: File | Blob; packId?: string; name?: string }) => {
      if (!user?.id || !activeWorkspace?.id) throw new Error('Não autenticado');

      const timestamp = Date.now();
      const ext = file instanceof File ? file.name.split('.').pop() : 'png';
      const storagePath = `${user.id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('stickers').upload(storagePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('stickers')
        .insert({
          workspace_id: activeWorkspace.id,
          pack_id: packId || null,
          name: name || null,
          image_url: storagePath,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers'] });
      toast.success('Figurinha criada!');
    },
    onError: () => toast.error('Erro ao criar figurinha'),
  });
};

export const useRecordStickerUsage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (stickerId: string) => {
      if (!user?.id) return;
      await supabase.from('sticker_usage').insert({ sticker_id: stickerId, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-stickers'] });
    },
  });
};

export const useDeleteSticker = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stickerId: string) => {
      const { error } = await supabase.from('stickers').delete().eq('id', stickerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers'] });
      toast.success('Figurinha removida!');
    },
    onError: () => toast.error('Erro ao remover figurinha'),
  });
};

export const getStickerById = async (stickerId: string): Promise<Sticker | null> => {
  const { data, error } = await supabase.from('stickers').select('*').eq('id', stickerId).maybeSingle();
  if (error || !data) return null;
  const signed = await getStickerSignedUrl(data.image_url);
  return { ...data, signed_url: signed } as Sticker;
};
