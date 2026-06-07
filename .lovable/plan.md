## Status atual

Boa notícia: o Supabase conectado (`efqnscrnyyyjpswctahq`) **não está vazio** — ele tem as 73 tabelas do MAP Flow (workspaces, tasks, spaces, lists, chat, documents, automations, profiles, user_roles etc.) e todas as funções de produtividade. Então é o Supabase certo, as 132 migrações já estão aplicadas.

O que ainda falta para o app voltar a funcionar de ponta a ponta:

## O que precisa ser feito

### 1. Deploy das 12 Edge Functions
As funções estão em `supabase/functions/` no repo (copiadas do GitHub) mas **não estão deployadas** no Supabase atual. Sem isso quebram: convites de usuário, transcrição de áudio, API gateway, webhooks, reset de senha, troca de email, etc.

Functions a deployar:
- `add-user-with-invite`, `send-invitation-email`, `reset-user-password`, `update-user-email`, `get-user-emails`
- `api-gateway`, `api-tasks`
- `webhook-enqueue`, `webhooks-dispatcher`, `webhooks-inbound`
- `transcribe-audio`
- `migrate-helper`

Também conferir/configurar secrets que essas funções esperam (RESEND_API_KEY para emails, OPENAI/Lovable AI para transcribe-audio, etc.) — listo o que falta após inspecionar cada função.

### 2. Verificar o estado real do preview
Os logs do dev server ainda mostram `ReferenceError: localStorage is not defined` durante SSR vindo de `WorkspaceContext`. O arquivo já tem `typeof window === "undefined"` na inicialização, então preciso:
- Confirmar se o erro persiste após o último restart (pode ser log antigo)
- Se persistir, mover providers que dependem de browser APIs para um wrapper client-only, ou marcar as rotas afetadas com `ssr: false`

### 3. Validar o fluxo principal logado
Com edge functions deployadas e SSR limpo, testar no preview:
- Login em `/auth`
- Carregamento de `/` (home com feed, tasks, workspaces)
- Navegação para spaces, lists, tasks, chat, documents, settings
- Corrigir as primeiras 2–3 telas que quebrarem (erros típicos do shim `react-router-dom` → TanStack: `Link` com `to` dinâmico, `useParams` tipado, etc.)

### 4. (Opcional, depois) Limpeza pós-migração
- Trocar o shim `@/lib/router-compat` por imports diretos de `@tanstack/react-router` nos 27 arquivos que ainda usam
- Remover os `@ts-nocheck` aplicados em massa durante a importação, arquivo por arquivo
- Reativar `strict` no `tsconfig.json`

Isso é refactor — não bloqueia o uso do app.

## Ordem sugerida

1. Deploy das 12 edge functions + configurar secrets faltantes
2. Verificar/corrigir SSR do `WorkspaceProvider` / `AuthProvider`
3. Abrir o preview, logar, navegar e corrigir erros conforme aparecem
4. (Depois, em sessão separada) limpeza do shim e dos `@ts-nocheck`

Confirma que posso seguir nessa ordem? Se sim, começo pelo passo 1 (deploy das edge functions) assim que você aprovar o plano.