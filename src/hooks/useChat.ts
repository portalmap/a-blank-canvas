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
  edited_at: string | null;
  edit_count: number | null;
  assignee_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  sender: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  assignee: {
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

      // Get unique sender and assignee IDs
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const assigneeIds = [...new Set(messages.map(m => (m as any).assignee_id).filter(Boolean))];
      const allUserIds = [...new Set([...senderIds, ...assigneeIds])];

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine messages with sender and assignee info
      return messages.map(msg => ({
        ...msg,
        edited_at: (msg as any).edited_at || null,
        edit_count: (msg as any).edit_count || 0,
        assignee_id: (msg as any).assignee_id || null,
        resolved_at: (msg as any).resolved_at || null,
        resolved_by: (msg as any).resolved_by || null,
        sender: profileMap.get(msg.sender_id) || null,
        assignee: (msg as any).assignee_id ? profileMap.get((msg as any).assignee_id) || null : null,
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
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as ChatMessage;
            
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .maybeSingle();

            // Fetch assignee profile if present
            let assigneeProfile = null;
            if ((newMsg as any).assignee_id) {
              const { data: aProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', (newMsg as any).assignee_id)
                .maybeSingle();
              assigneeProfile = aProfile;
            }

            const messageWithSender: ChatMessageWithSender = {
              ...newMsg,
              edited_at: (newMsg as any).edited_at || null,
              edit_count: (newMsg as any).edit_count || 0,
              assignee_id: (newMsg as any).assignee_id || null,
              resolved_at: (newMsg as any).resolved_at || null,
              resolved_by: (newMsg as any).resolved_by || null,
              sender: profile,
              assignee: assigneeProfile,
            };

            queryClient.setQueryData(
              ['chat-messages', channelId],
              (old: ChatMessageWithSender[] | undefined) => [...(old || []), messageWithSender]
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            
            // Fetch assignee profile if changed
            let assigneeProfile = null;
            if (updatedMsg.assignee_id) {
              const { data: aProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', updatedMsg.assignee_id)
                .maybeSingle();
              assigneeProfile = aProfile;
            }
            
            queryClient.setQueryData(
              ['chat-messages', channelId],
              (old: ChatMessageWithSender[] | undefined) => 
                old?.map(msg => 
                  msg.id === updatedMsg.id 
                    ? { 
                        ...msg, 
                        content: updatedMsg.content,
                        edited_at: updatedMsg.edited_at,
                        edit_count: updatedMsg.edit_count,
                        assignee_id: updatedMsg.assignee_id,
                        assignee: assigneeProfile,
                        resolved_at: updatedMsg.resolved_at,
                        resolved_by: updatedMsg.resolved_by,
                      }
                    : msg
                ) || []
            );
          }
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
    mutationFn: async ({ channelId, content, assigneeId }: { 
      channelId: string; 
      content: string;
      assigneeId?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
          assignee_id: assigneeId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, hasAssignee: !!assigneeId };
    },
    onError: (error) => {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    },
  });
};

export const useResolveChatAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, channelId }: { 
      messageId: string; 
      channelId: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('chat_messages')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', messageId);

      if (error) throw error;
      return { messageId, channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', data.channelId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-comments'] });
      toast.success('Atribuição resolvida!');
    },
    onError: (error) => {
      toast.error('Erro ao resolver atribuição');
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

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      // First delete channel members
      const { error: membersError } = await supabase
        .from('chat_channel_members')
        .delete()
        .eq('channel_id', channelId);

      if (membersError) throw membersError;

      // Then delete messages
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('channel_id', channelId);

      if (messagesError) throw messagesError;

      // Finally delete the channel
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-channels'] });
      queryClient.invalidateQueries({ queryKey: ['all-chat-channels'] });
      toast.success('Canal excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir canal');
      console.error(error);
    },
  });
};

export const useUpdateChatMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, content, channelId, assigneeId }: { 
      messageId: string; 
      content: string;
      channelId: string;
      assigneeId?: string | null;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar o edit_count atual - usando type assertion porque a coluna foi adicionada recentemente
      const { data: currentMessage } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      const newEditCount = ((currentMessage as any)?.edit_count || 0) + 1;

      const { data, error } = await supabase
        .from('chat_messages')
        .update({
          content,
          edited_at: new Date().toISOString(),
          edit_count: newEditCount,
          assignee_id: assigneeId,
        })
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, channelId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', data.channelId] });
      queryClient.invalidateQueries({ queryKey: ['my-assigned-comments'] });
      toast.success('Mensagem editada!');
    },
    onError: (error) => {
      toast.error('Erro ao editar mensagem');
      console.error(error);
    },
  });
};
