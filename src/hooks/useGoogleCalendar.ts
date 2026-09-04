import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
  completeGoogleCalendarConnection,
  disconnectGoogleCalendarAccount,
  getMyGoogleCalendarStatus,
  listGoogleCalendarAccounts,
  startGoogleCalendarConnect,
  syncMyGoogleCalendar,
} from '@/lib/google-calendar.functions';
import { useAuth } from '@/contexts/AuthContext';

const CONNECTOR_ID = 'google_calendar';

export function useMyGoogleStatus() {
  const { user } = useAuth();
  const fetchStatus = useServerFn(getMyGoogleCalendarStatus);
  return useQuery({
    queryKey: ['google-calendar-status', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchStatus(),
  });
}

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== 'appUserConnectorOAuthComplete' && type !== 'appUserConnectorOAuthFailed')
      )
        return;
      cleanup();
      if (type === 'appUserConnectorOAuthComplete') {
        resolve(typeof event.data?.code === 'string' ? event.data.code : null);
        return;
      }
      popup.close();
      reject(new Error('Não foi possível concluir a conexão com o Google.'));
    };
    window.addEventListener('message', onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error('A janela do Google foi fechada antes de concluir.'));
    }, 500);
  });
}

export function useConnectGoogleCalendar() {
  const queryClient = useQueryClient();
  const start = useServerFn(startGoogleCalendarConnect);
  const complete = useServerFn(completeGoogleCalendarConnection);

  return useMutation({
    mutationFn: async () => {
      const popup = window.open('', 'google-calendar-oauth', 'width=600,height=720');
      if (!popup) throw new Error('Libere as janelas pop-up do navegador e tente de novo.');
      let code: string | null;
      try {
        const { authorizationUrl } = await start();
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = authorizationUrl;
        code = await completion;
      } catch (error) {
        popup.close();
        throw error;
      }
      if (code) await complete({ data: { code } });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-accounts'] });
      toast.success('Google Agenda conectado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao conectar o Google'),
  });
}

export function useSyncGoogleCalendar() {
  const queryClient = useQueryClient();
  const sync = useServerFn(syncMyGoogleCalendar);

  return useMutation({
    mutationFn: () => sync(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      if (result?.error) toast.error('O Google recusou a sincronização. Tente reconectar.');
    },
  });
}

export function useGoogleCalendarAccounts(enabled: boolean) {
  const list = useServerFn(listGoogleCalendarAccounts);
  return useQuery({
    queryKey: ['google-calendar-accounts'],
    enabled,
    queryFn: () => list(),
  });
}

export function useDisconnectGoogleAccount() {
  const queryClient = useQueryClient();
  const disconnect = useServerFn(disconnectGoogleCalendarAccount);

  return useMutation({
    mutationFn: (userId: string) => disconnect({ data: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Conta desconectada');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao desconectar'),
  });
}
