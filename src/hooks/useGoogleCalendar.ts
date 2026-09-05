import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
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

export const GOOGLE_CONNECT_RETURN_TO_KEY = 'google-calendar:return-to';

function isInsideIframe() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * Escuta a conclusão do OAuth feita em aba nova (mesma origem) e devolve o código
 * de uso único para que a troca aconteça nesta aba, que tem a sessão do MAP Flow.
 */
function waitForOAuthTabCompletion(tab: Window) {
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
        event.source !== tab ||
        event.data?.connectorId !== CONNECTOR_ID ||
        (type !== 'appUserConnectorOAuthComplete' && type !== 'appUserConnectorOAuthFailed')
      )
        return;
      cleanup();
      if (type === 'appUserConnectorOAuthComplete') {
        resolve(typeof event.data?.code === 'string' ? event.data.code : null);
        return;
      }
      reject(
        new Error(
          typeof event.data?.error === 'string' && event.data.error
            ? event.data.error
            : 'Não foi possível concluir a conexão com o Google.',
        ),
      );
    };
    window.addEventListener('message', onMessage);
    poll = window.setInterval(() => {
      if (!tab.closed) return;
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
      const { authorizationUrl } = await start();
      sessionStorage.setItem(
        GOOGLE_CONNECT_RETURN_TO_KEY,
        `${window.location.pathname}${window.location.search}`,
      );

      // Fora de iframe: a própria página vai ao Google e volta para a rota de retorno,
      // que conclui a troca do código e redireciona de volta.
      if (!isInsideIframe()) {
        window.location.assign(authorizationUrl);
        // A navegação descarrega a página; o mutation não retorna.
        return new Promise<boolean>(() => {});
      }

      // Dentro da pré-visualização (iframe): abre a autorização em aba independente
      // já com a URL final (evita herdar restrições do contexto incorporado).
      // Sem "noopener" para que a rota de retorno consiga avisar esta aba.
      const tab = window.open(authorizationUrl, '_blank');
      if (!tab) {
        sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
        throw new Error('Libere as janelas pop-up do navegador e tente de novo.');
      }
      try {
        await waitForOAuthTabCompletion(tab);
      } catch (error) {
        tab.close();
        throw error;
      }
      return true;
    },
    onSuccess: () => {
      sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-accounts'] });
      toast.success('Google Agenda conectado');
    },
    onError: (e: Error) => {
      sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
      toast.error(e.message || 'Erro ao conectar o Google');
    },
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
