import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { completeGoogleCalendarConnection } from '@/lib/google-calendar.functions';
import { GOOGLE_CONNECT_RETURN_TO_KEY } from '@/hooks/useGoogleCalendar';

const CONNECTOR_ID = 'google_calendar';

function OAuthReturn() {
  const navigate = useNavigate();
  const complete = useServerFn(completeGoogleCalendarConnection);
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

    // Fluxo em aba separada (pré-visualização): a Agenda original espera um aviso.
    // Nunca concluímos a troca aqui — esta aba não tem a sessão do MAP Flow.
    const notifyOpener = (
      type: 'appUserConnectorOAuthComplete' | 'appUserConnectorOAuthFailed',
      exchangeCode: string | null = null,
      readableError: string | null = null,
    ): boolean => {
      if (!window.opener) return false;
      window.opener.postMessage(
        { type, connectorId: CONNECTOR_ID, code: exchangeCode, error: readableError },
        window.location.origin,
      );
      window.close();
      return true;
    };

    if (!success || (params.get('offline_access_allowed') !== 'false' && !code)) {
      const readable = errorParam ?? 'A autorização não foi concluída.';
      if (notifyOpener('appUserConnectorOAuthFailed', null, readable)) {
        setMessage(readable);
        return;
      }
      setMessage(readable);
      toast.error('Erro ao conectar o Google', { description: readable });
      navigate({ to: returnTo, replace: true });
      return;
    }

    // Aba separada: devolve o código para a Agenda concluir com a sessão dela.
    if (window.opener) {
      setMessage('Conexão autorizada! Esta janela será fechada.');
      notifyOpener('appUserConnectorOAuthComplete', code ?? null);
      return;
    }

    // Fluxo de redirecionamento da própria página: concluir aqui e voltar à Agenda.
    if (!code) {
      setMessage('A autorização terminou sem código de troca.');
      toast.error('Erro ao conectar o Google');
      navigate({ to: returnTo, replace: true });
      return;
    }
    complete({ data: { code } })
      .then(() => {
        toast.success('Google Agenda conectado');
        navigate({ to: returnTo, replace: true });
      })
      .catch((err: Error) => {
        setMessage(err.message || 'Não foi possível concluir a conexão.');
        toast.error('Erro ao conectar o Google', { description: err.message });
        navigate({ to: returnTo, replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {message}
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
