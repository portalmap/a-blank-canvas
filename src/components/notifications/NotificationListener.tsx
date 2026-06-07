import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from "@/lib/router-compat";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { toast } from 'sonner';
import { UserPlus, MessageSquare, Clock, AlertTriangle, Newspaper, ShieldPlus, ShieldMinus } from 'lucide-react';

// --- localStorage helpers ---
const NOTIF_PREFIX = 'notif_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getNotifiedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIF_PREFIX + key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { ids: string[]; ts: number };
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      localStorage.removeItem(NOTIF_PREFIX + key);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function addToNotifiedSet(key: string, id: string) {
  const set = getNotifiedSet(key);
  set.add(id);
  localStorage.setItem(
    NOTIF_PREFIX + key,
    JSON.stringify({ ids: Array.from(set), ts: Date.now() })
  );
}

function wasNotified(key: string, id: string): boolean {
  return getNotifiedSet(key).has(id);
}

export function NotificationListener() {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { data: settings } = useNotificationSettings();
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id;
  const workspaceId = activeWorkspace?.id;

  const showToast = useCallback(
    (title: string, description: string, icon: React.ReactNode, link?: string) => {
      toast(title, {
        description,
        icon,
        duration: 8000,
        action: link
          ? {
              label: 'Ver →',
              onClick: () => navigate(link),
            }
          : undefined,
      });
    },
    [navigate]
  );

  // --- Realtime subscriptions ---
  useEffect(() => {
    if (!userId || !workspaceId || !settings) return;

    // Skip first render to avoid toasting existing data
    if (!mountedRef.current) {
      mountedRef.current = true;
    }

    const channel = supabase.channel(`notif-${workspaceId}-${userId}`);

    // 1. Task assigned
    if ((settings as any).task_assigned !== false) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_assignees',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (wasNotified('task_assign', row.id)) return;
          addToNotifiedSet('task_assign', row.id);
          showToast(
            'Tarefa atribuída a você',
            'Uma nova tarefa foi atribuída a você.',
            <UserPlus className="h-4 w-4" />,
            `/task/${row.task_id}`
          );
        }
      );
    }

    // 2. Comment assigned (task)
    if ((settings as any).comment_assigned !== false) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
          filter: `assignee_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (wasNotified('comment_assign', row.id)) return;
          addToNotifiedSet('comment_assign', row.id);
          showToast(
            'Comentário atribuído a você',
            'Um comentário foi atribuído a você em uma tarefa.',
            <MessageSquare className="h-4 w-4" />,
            `/task/${row.task_id}`
          );
        }
      );

      // 2b. Comment assigned (chat)
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `assignee_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (wasNotified('chat_comment_assign', row.id)) return;
          addToNotifiedSet('chat_comment_assign', row.id);
          showToast(
            'Mensagem atribuída a você',
            'Uma mensagem de chat foi atribuída a você.',
            <MessageSquare className="h-4 w-4" />,
            `/chat?channel=${row.channel_id}&message=${row.id}`
          );
        }
      );
    }

    // 3. Feed new post
    if ((settings as any).feed_new_post !== false) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_posts',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Don't notify the author
          if (row.author_id === userId) return;
          if (wasNotified('feed_post', row.id)) return;
          addToNotifiedSet('feed_post', row.id);
          showToast(
            'Novo post no feed',
            'Um novo post foi publicado no feed.',
            <Newspaper className="h-4 w-4" />,
            '/'
          );
        }
      );
    }

    // 4. Space permission added
    if ((settings as any).space_permission_change !== false) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'space_permissions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (wasNotified('space_perm_add', row.id)) return;
          addToNotifiedSet('space_perm_add', row.id);
          showToast(
            'Acesso a Space concedido',
            'Você recebeu acesso a um novo Space.',
            <ShieldPlus className="h-4 w-4" />,
            `/space/${row.space_id}`
          );
        }
      );

      // 4b. Space permission removed
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'space_permissions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.old as any;
          const delKey = `space_perm_del_${row.id}`;
          if (wasNotified('space_perm_del', delKey)) return;
          addToNotifiedSet('space_perm_del', delKey);
          showToast(
            'Acesso a Space removido',
            'Seu acesso a um Space foi removido.',
            <ShieldMinus className="h-4 w-4" />
          );
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, workspaceId, settings, showToast]);

  // --- Polling for overdue / due tomorrow ---
  useEffect(() => {
    if (!userId || !workspaceId || !settings) return;

    const checkDueTasks = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Overdue tasks
      if ((settings as any).task_overdue !== false) {
        const { data: overdue } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('workspace_id', workspaceId)
          .lt('due_date', todayStr)
          .is('completed_at', null)
          .is('archived_at', null);

        // Filter to only tasks assigned to this user
        if (overdue?.length) {
          const taskIds = overdue.map((t) => t.id);
          const { data: myAssignments } = await supabase
            .from('task_assignees')
            .select('task_id')
            .eq('user_id', userId)
            .in('task_id', taskIds);

          const myTaskIds = new Set(myAssignments?.map((a) => a.task_id) || []);

          overdue.forEach((task) => {
            if (!myTaskIds.has(task.id)) return;
            const notifKey = `${task.id}_${todayStr}`;
            if (wasNotified('overdue', notifKey)) return;
            addToNotifiedSet('overdue', notifKey);
            showToast(
              'Tarefa atrasada',
              task.title || 'Uma tarefa está atrasada.',
              <AlertTriangle className="h-4 w-4" />,
              `/task/${task.id}`
            );
          });
        }
      }

      // Due tomorrow
      if ((settings as any).task_due_tomorrow !== false) {
        const { data: dueTomorrow } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('workspace_id', workspaceId)
          .eq('due_date', tomorrowStr)
          .is('completed_at', null)
          .is('archived_at', null);

        if (dueTomorrow?.length) {
          const taskIds = dueTomorrow.map((t) => t.id);
          const { data: myAssignments } = await supabase
            .from('task_assignees')
            .select('task_id')
            .eq('user_id', userId)
            .in('task_id', taskIds);

          const myTaskIds = new Set(myAssignments?.map((a) => a.task_id) || []);

          dueTomorrow.forEach((task) => {
            if (!myTaskIds.has(task.id)) return;
            const notifKey = `${task.id}_${tomorrowStr}`;
            if (wasNotified('due_tomorrow', notifKey)) return;
            addToNotifiedSet('due_tomorrow', notifKey);
            showToast(
              'Tarefa vence amanhã',
              task.title || 'Uma tarefa vence amanhã.',
              <Clock className="h-4 w-4" />,
              `/task/${task.id}`
            );
          });
        }
      }
    };

    // Run immediately then every 5 minutes
    checkDueTasks();
    pollingRef.current = setInterval(checkDueTasks, 5 * 60 * 1000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userId, workspaceId, settings, showToast]);

  return null;
}
