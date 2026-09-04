import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

function OAuthReturn() {
  const [message, setMessage] = useState('Concluindo a conexão com o Google...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notifyOpenerAndClose = (
      type: 'appUserConnectorOAuthComplete' | 'appUserConnectorOAuthFailed',
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: 'google_calendar', code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get('success') !== 'true') {
      setMessage(params.get('error') ?? 'A autorização não foi concluída.');
      notifyOpenerAndClose('appUserConnectorOAuthFailed');
      return;
    }

    const code = params.get('code');
    if (!code) {
      if (params.get('offline_access_allowed') === 'false') {
        notifyOpenerAndClose('appUserConnectorOAuthComplete');
        return;
      }
      setMessage('A autorização terminou sem código de troca.');
      notifyOpenerAndClose('appUserConnectorOAuthFailed');
      return;
    }

    notifyOpenerAndClose('appUserConnectorOAuthComplete', code);
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
