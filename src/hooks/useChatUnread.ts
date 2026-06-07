import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadChannelInfo {
  channelId: string;
  lastMessageAt: string;
}

// Hook para buscar canais com mensagens não lidas
export const useUnreadChannels = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-channels', user?.id],
    queryFn: async (): Promise<string[]> => {
      if (!user?.id) return [];

      // Buscar última mensagem de cada canal que o usuário tem acesso
      const { data: channelsWithMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('channel_id, created_at')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Agrupar por canal e pegar a última mensagem
      const latestByChannel = new Map<string, string>();
      channelsWithMessages?.forEach(msg => {
        if (!latestByChannel.has(msg.channel_id)) {
          latestByChannel.set(msg.channel_id, msg.created_at);
        }
      });

      // Buscar status de leitura do usuário
      const { data: readStatus, error: readError } = await supabase
        .from('chat_read_status')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);

      if (readError) throw readError;

      // Criar map de last_read_at por canal
      const readByChannel = new Map<string, string>();
      readStatus?.forEach(status => {
        readByChannel.set(status.channel_id, status.last_read_at);
      });

      // Identificar canais com mensagens não lidas
      const unreadChannelIds: string[] = [];
      
      latestByChannel.forEach((lastMessageAt, channelId) => {
        const lastReadAt = readByChannel.get(channelId);
        
        // Canal não lido se:
        // 1. Nunca foi lido (não existe em readByChannel)
        // 2. Última mensagem é mais recente que última leitura
        if (!lastReadAt || new Date(lastMessageAt) > new Date(lastReadAt)) {
          unreadChannelIds.push(channelId);
        }
      });

      return unreadChannelIds;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
};

// Hook para marcar canal como lido
export const useMarkChannelAsRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId }: { channelId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upsert: inserir ou atualizar last_read_at
      const { error } = await supabase
        .from('chat_read_status')
        .upsert(
          {
            user_id: user.id,
            channel_id: channelId,
            last_read_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,channel_id',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidar cache de canais não lidos
      queryClient.invalidateQueries({ queryKey: ['unread-channels'] });
    },
  });
};
