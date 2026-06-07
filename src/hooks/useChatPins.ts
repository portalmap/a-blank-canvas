import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PinnedMessage {
  id: string;
  message_id: string;
  channel_id: string;
  pinned_by: string;
  pinned_at: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  };
  sender_name?: string;
}

export const usePinnedMessages = (channelId?: string) => {
  return useQuery({
    queryKey: ['chat-pinned', channelId],
    queryFn: async (): Promise<PinnedMessage[]> => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('chat_pinned_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch message contents
      const messageIds = data.map(p => p.message_id);
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, content, created_at, sender_id')
        .in('id', messageIds);

      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const messageMap = new Map(messages?.map(m => [m.id, m]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data.map(pin => {
        const msg = messageMap.get(pin.message_id);
        return {
          ...pin,
          message: msg || undefined,
          sender_name: msg ? (profileMap.get(msg.sender_id) || 'Usuário') : undefined,
        };
      });
    },
    enabled: !!channelId,
  });
};

export const usePinnedMessageIds = (channelId?: string) => {
  const { data: pinned } = usePinnedMessages(channelId);
  return new Set(pinned?.map(p => p.message_id) || []);
};

export const usePinMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_pinned_messages')
        .insert({ message_id: messageId, channel_id: channelId, pinned_by: user.id });

      if (error) throw error;
      return { channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-pinned', data.channelId] });
      toast.success('Mensagem fixada!');
    },
    onError: () => toast.error('Erro ao fixar mensagem'),
  });
};

export const useUnpinMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { messageId: string; channelId: string }) => {
      const { error } = await supabase
        .from('chat_pinned_messages')
        .delete()
        .eq('message_id', messageId);

      if (error) throw error;
      return { channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-pinned', data.channelId] });
      toast.success('Mensagem desafixada!');
    },
    onError: () => toast.error('Erro ao desafixar mensagem'),
  });
};
