import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChatSearchResult {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender_id: string;
  sender_name: string | null;
  channel_name: string;
}

export const useChatSearch = (query: string, channelId?: string) => {
  return useQuery({
    queryKey: ['chat-search', query, channelId],
    queryFn: async (): Promise<ChatSearchResult[]> => {
      if (!query || query.length < 2) return [];

      let q = supabase
        .from('chat_messages')
        .select('id, content, created_at, channel_id, sender_id')
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (channelId) {
        q = q.eq('channel_id', channelId);
      }

      const { data: messages, error } = await q;
      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Fetch profiles and channel names
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const channelIds = [...new Set(messages.map(m => m.channel_id))];

      const [{ data: profiles }, { data: channels }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', senderIds),
        supabase.from('chat_channels').select('id, name').in('id', channelIds),
      ]);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const channelMap = new Map(channels?.map(c => [c.id, c.name]) || []);

      return messages.map(m => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        channel_id: m.channel_id,
        sender_id: m.sender_id,
        sender_name: profileMap.get(m.sender_id) || null,
        channel_name: channelMap.get(m.channel_id) || 'Canal',
      }));
    },
    enabled: query.length >= 2,
  });
};
