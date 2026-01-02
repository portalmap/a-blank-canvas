import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type ChatChannel = Database['public']['Tables']['chat_channels']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatChannelMember = Database['public']['Tables']['chat_channel_members']['Row'];

export const useChatChannels = () => {
  const { activeWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['chat-channels', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          *,
          spaces:linked_space_id (name, color)
        `)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeWorkspace?.id,
  });
};

// Hook to fetch all chat channels from all workspaces (global chat)
export const useAllChatChannels = () => {
  return useQuery({
    queryKey: ['all-chat-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          *,
          spaces:linked_space_id (name, color),
          workspace:workspace_id (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useSpaceChannel = (spaceId?: string) => {
  return useQuery({
    queryKey: ['space-channel', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;

      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('linked_space_id', spaceId)
        .eq('type', 'space')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });
};

export interface ChatMessageWithSender {
  id: string;
  channel_id: string;
  content: string;
  created_at: string;
  sender_id: string;
  attachments: any;
  read_at: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useChatMessages = (channelId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat-messages', channelId],
    queryFn: async (): Promise<ChatMessageWithSender[]> => {
      if (!channelId) return [];

      // First get messages
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Get unique sender IDs
      const senderIds = [...new Set(messages.map(m => m.sender_id))];

      // Fetch profiles for all senders
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine messages with sender info
      return messages.map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || null,
      }));
    },
    enabled: !!channelId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          const messageWithSender: ChatMessageWithSender = {
            ...newMsg,
            sender: profile,
          };

          queryClient.setQueryData(
            ['chat-messages', channelId],
            (old: ChatMessageWithSender[] | undefined) => [...(old || []), messageWithSender]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  return query;
};

export const useSendMessage = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    },
  });
};

export const useCreateCustomChannel = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description, memberIds, workspaceId }: { 
      name: string; 
      description?: string;
      memberIds: string[];
      workspaceId: string;
    }) => {
      if (!user?.id || !workspaceId) throw new Error('Usuário ou workspace não encontrado');

      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          workspace_id: workspaceId,
          name,
          description,
          type: 'custom',
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as owner
      const { error: ownerError } = await supabase
        .from('chat_channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'owner',
        });

      if (ownerError) throw ownerError;

      // Add other members
      if (memberIds.length > 0) {
        const memberInserts = memberIds
          .filter(id => id !== user.id)
          .map(userId => ({
            channel_id: channel.id,
            user_id: userId,
            role: 'member' as const,
          }));

        if (memberInserts.length > 0) {
          const { error: membersError } = await supabase
            .from('chat_channel_members')
            .insert(memberInserts);

          if (membersError) throw membersError;
        }
      }

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['all-chat-channels'] });
      toast.success('Canal criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar canal');
      console.error(error);
    },
  });
};

export const useChannelMembers = (channelId?: string) => {
  return useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      if (!channelId) return [];

      const { data, error } = await supabase
        .from('chat_channel_members')
        .select(`
          *,
          user:user_id (id, full_name, avatar_url)
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return data;
    },
    enabled: !!channelId,
  });
};

export const useAddChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('chat_channel_members')
        .insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', variables.channelId] });
      toast.success('Membro adicionado!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar membro');
      console.error(error);
    },
  });
};

export const useRemoveChannelMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, userId }: { channelId: string; userId: string }) => {
      const { error } = await supabase
        .from('chat_channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', variables.channelId] });
      toast.success('Membro removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro');
      console.error(error);
    },
  });
};
