import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GroupedReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted: boolean;
}

export const useMessageReactions = (channelId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['chat-reactions', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      // Get all message IDs for this channel first
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('channel_id', channelId);

      if (!messages || messages.length === 0) return [];

      const messageIds = messages.map(m => m.id);
      
      const { data, error } = await supabase
        .from('chat_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (error) throw error;
      return (data || []) as ChatReaction[];
    },
    enabled: !!channelId,
  });

  // Realtime subscription for reactions
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-reactions-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-reactions', channelId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return query;
};

export const groupReactions = (reactions: ChatReaction[], messageId: string, currentUserId?: string): GroupedReaction[] => {
  const messageReactions = reactions.filter(r => r.message_id === messageId);
  const grouped = new Map<string, { count: number; userIds: string[] }>();

  messageReactions.forEach(r => {
    const existing = grouped.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.userIds.push(r.user_id);
    } else {
      grouped.set(r.emoji, { count: 1, userIds: [r.user_id] });
    }
  });

  return Array.from(grouped.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userIds: data.userIds,
    hasReacted: currentUserId ? data.userIds.includes(currentUserId) : false,
  }));
};

export const useToggleReaction = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji, channelId }: { messageId: string; emoji: string; channelId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('chat_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chat_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) throw error;
      }

      return { channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-reactions', data.channelId] });
    },
  });
};
