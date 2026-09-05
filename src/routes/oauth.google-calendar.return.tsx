import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  completeGoogleCalendarConnection,
  getMyGoogleCalendarStatus,
} from '@/lib/google-calendar.functions';
import {
  GOOGLE_CONNECT_RETURN_TO_KEY,
  GOOGLE_OAUTH_CHANNEL,
  publishGoogleOAuthOutcome,
} from '@/hooks/useGoogleCalendar';

const CONNECTOR_ID = 'google_calendar';

function OAuthReturn() {
  const navigate = useNavigate();
  const complete = useServerFn(completeGoogleCalendarConnection);
  const status = useServerFn(getMyGoogleCalendarStatus);
  const [message, setMessage] = useState('Concluindo a conexão com o Google...');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success') === 'true';
    const code = params.get('code');
    const errorParam = params.get('error');

    const returnTo = (() => {
      try {
        const saved = sessionStorage.getItem(GOOGLE_CONNECT_RETURN_TO_KEY);
        sessionStorage.removeItem(GOOGLE_CONNECT_RETURN_TO_KEY);
        return saved && saved.startsWith('/') ? saved : '/agenda';
      } catch {
        return '/agenda';
      }
    })();

    // O Google corta o vínculo com a aba que abriu (COOP), então avisamos por
    // canal compartilhado da mesma origem, além do postMessage quando existir.
    const announce = (
      type: 'appUserConnectorOAuthComplete' | 'appUserConnectorOAuthFailed',
      exchangeCode: string | null = null,
      readableError: string | null = null,
    ) => {
      const payload = { type, connectorId: CONNECTOR_ID, code: exchangeCode, error: readableError };
      try {
        window.opener?.postMessage(payload, window.location.origin);
      } catch {
        /* aba sem vínculo: seguimos pelo canal compartilhado */
      }
      publishGoogleOAuthOutcome(payload);
    };

    const finishLocally = async () => {
      // Sem vínculo com a Agenda: concluímos aqui e voltamos.
      try {
        if (code) {
          await complete({ data: { code } });
        } else {
          const current = await status();
          if (!current?.connected) throw new Error('A autorização não foi concluída.');
        }
        announce('appUserConnectorOAuthComplete', null);
        toast.success('Google Agenda conectado');
      } catch (err) {
        // Pode ser um F5 com código já usado: confirmamos o estado real.
        let connected = false;
        try {
          connected = !!(await status())?.connected;
        } catch {
          /* mantém connected = false */
        }
        if (connected) {
          announce('appUserConnectorOAuthComplete', null);
          toast.success('Google Agenda conectado');
        } else {
          const readable = err instanceof Error ? err.message : 'Não foi possível conectar.';
          announce('appUserConnectorOAuthFailed', null, readable);
          toast.error('Erro ao conectar o Google', { description: readable });
        }
      }
      navigate({ to: returnTo, replace: true });
    };

    if (!success || (params.get('offline_access_allowed') !== 'false' && !code)) {
      const readable = errorParam ?? 'A autorização não foi concluída.';
      setMessage(readable);
      announce('appUserConnectorOAuthFailed', null, readable);
      if (window.opener) {
        window.close();
        return;
      }
      toast.error('Erro ao conectar o Google', { description: readable });
      navigate({ to: returnTo, replace: true });
      return;
    }

    // Aba aberta pela Agenda e ainda vinculada: devolve o código para ela concluir.
    if (window.opener) {
      setMessage('Conexão autorizada! Esta janela será fechada.');
      announce('appUserConnectorOAuthComplete', code ?? null);
      window.close();
      // Se o navegador não permitir fechar, concluímos aqui mesmo.
      window.setTimeout(() => {
        void finishLocally();
      }, 1200);
      return;
    }

    void finishLocally();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      <button
        type="button"
        className="text-xs underline hover:text-foreground"
        onClick={() => navigate({ to: '/agenda', replace: true })}
      >
        Voltar para a Agenda
      </button>
    </div>
  );
}

export const Route = createFileRoute('/oauth/google-calendar/return')({
  component: OAuthReturn,
  head: () => ({
    meta: [
      { title: 'Conexão com o Google | MAP Flow' },
      { name: 'description', content: 'Finalizando a autorização da sua conta Google no MAP Flow.' },
      { property: 'og:title', content: 'Conexão com o Google | MAP Flow' },
      { property: 'og:description', content: 'Finalizando a autorização da sua conta Google.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
});

export { GOOGLE_OAUTH_CHANNEL };
