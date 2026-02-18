

# Corrigir Tratamento de JWT Expirado no Chat (e em toda a aplicacao)

## Diagnostico

O erro "Erro ao enviar mensagem" nao e especifico do chat. **Todas** as requisicoes ao banco estao falhando com `JWT expired` (status 401). O token de autenticacao expirou e o mecanismo de refresh automatico nao conseguiu renova-lo (provavelmente a aba ficou inativa por muito tempo ou o refresh token tambem expirou).

**Solucao imediata para o usuario:** Fazer logout e login novamente.

## Melhoria Proposta

Adicionar deteccao global de JWT expirado para redirecionar automaticamente ao login quando isso ocorrer, evitando que o usuario veja erros genericos sem entender o motivo.

### Alteracoes

**1. `src/contexts/AuthContext.tsx`**

Adicionar tratamento do evento `TOKEN_REFRESHED` com falha e do evento `SIGNED_OUT` no `onAuthStateChange`. Quando detectar que a sessao foi perdida (newSession === null e havia sessao anterior), exibir um toast informativo e redirecionar para `/auth`.

```text
if (event === 'SIGNED_OUT' && previousSessionRef.current) {
  toast.info('Sua sessao expirou. Faca login novamente.');
  navigate('/auth');
}
```

**2. `src/integrations/supabase/client.ts`** (nao editavel diretamente)

O cliente ja esta configurado com `autoRefreshToken: true`, entao nao ha mudanca aqui.

**3. `src/hooks/useChat.ts` (opcional)**

Adicionar tratamento especifico no `onError` do `useSendMessage` para detectar erro 401/PGRST303 e orientar o usuario a relogar:

```text
onError: (error: any) => {
  if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired')) {
    toast.error('Sessao expirada. Por favor, faca login novamente.');
  } else {
    toast.error('Erro ao enviar mensagem');
  }
}
```

## Resumo

| Arquivo | Alteracao |
|---|---|
| `src/contexts/AuthContext.tsx` | Detectar perda de sessao e redirecionar para login com mensagem informativa |
| `src/hooks/useChat.ts` | Mensagem de erro especifica para JWT expirado no envio de mensagem |

## Nota

A causa raiz e a expiracao natural do token. A correcao melhora a experiencia do usuario ao informar claramente o que aconteceu e redirecionar automaticamente, em vez de exibir erros genericos.
