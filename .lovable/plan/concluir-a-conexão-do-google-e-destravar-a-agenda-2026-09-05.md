# Concluir a conexão do Google e destravar a Agenda

## 1. "Failed to exchange token" na última etapa

A autorização no Google agora funciona. O que falha é a troca final feita **dentro da aba/janela aberta pelo botão**: nessa aba a sessão do MAP Flow não existe (a pré-visualização isola o login por janela), então a chamada que registra a conexão é recusada e o código de uso único se perde.

Correção: a aba do Google passa a apenas devolver o código para a tela da Agenda que a abriu, e a **troca é feita pela Agenda**, que tem a sessão. Também vou garantir que o código seja trocado uma única vez (hoje dá para disparar duas vezes, o que gera as duas mensagens de erro repetidas) e que a mensagem de erro mostre o motivo real vindo do Google.

## 2. Erro que impede a Agenda de listar compromissos

Ao abrir a Agenda, a busca de compromissos falha com "recursão infinita" nas regras de acesso: a regra dos compromissos consulta a tabela de convidados, e a regra dos convidados volta a consultar os compromissos.

Correção: substituir esse par de regras por verificações que não se consultam entre si (uma função de verificação isolada), mantendo exatamente o mesmo comportamento: cada pessoa vê os compromissos que criou e aqueles em que foi convidada.

## Detalhes técnicos

- `src/routes/oauth.google-calendar.return.tsx`: no caminho com `window.opener`, apenas `postMessage({ type: 'appUserConnectorOAuthComplete', code })` e fechar; nunca chamar `completeGoogleCalendarConnection` na aba do popup. No caminho de redirecionamento de página inteira (sem opener), manter a troca local com guarda de execução única (`useRef`).
- `src/hooks/useGoogleCalendar.ts`: `waitForOAuthTabCompletion` passa a resolver com o `code`; o mutation chama `completeGoogleCalendarConnection({ data: { code } })` na aba original e só então invalida `google-calendar-status` / `agenda-events` / `google-calendar-accounts`. Propagar a mensagem de erro do servidor no toast.
- `src/lib/google-calendar.functions.ts`: repassar o texto de erro do gateway em `completeGoogleCalendarConnection` para diagnóstico legível.
- Migration: criar função `security definer` `public.user_is_calendar_event_guest(_user_id uuid, _event_id uuid)` e recriar a policy `Guests can view invited events` em `calendar_events` usando-a; ajustar `Guest can view own invitation` em `calendar_event_guests` para não reconsultar `calendar_events` de forma recursiva (usar função `security definer` já existente/nova). Sem alteração de dados.

## Verificação

1. Abrir a Agenda: a lista de compromissos carrega sem erro.
2. Clicar em **Conectar Google**, autorizar e confirmar o toast "Google Agenda conectado".
3. Conferir em **Configurações > Integrações** a conta como "online".
