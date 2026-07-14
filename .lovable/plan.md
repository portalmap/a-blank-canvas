# Documento de Integrações — MAP Flow

Vou criar um único arquivo `docs/INTEGRATIONS.md` na raiz do projeto, em português, cobrindo com detalhes as duas integrações que este projeto (MAP Flow) mantém com sistemas externos:

1. **Portal MAP** — integração via API Token (REST) e Webhooks.
2. **MAP Hub Flow** — SSO centralizado, verificação contínua de sessão e revogação em tempo real.

Nenhum código-fonte será alterado — apenas o markdown será criado.

## Estrutura do documento

### 1. Visão geral
- Diagrama textual mostrando os três sistemas (Portal MAP ↔ MAP Flow ↔ MAP Hub Flow) e o sentido do fluxo de cada canal.
- Tabela-resumo de cada endpoint, sua direção (in/out), autenticação e finalidade.

### 2. Integração com o Portal MAP

**2.1 Endpoints que o Portal chama neste projeto (entrada):**
- `POST /functions/v1/api-tasks` — criação simples de tarefa a partir do Portal. Autenticação via `Authorization: Bearer <api_token>` (tabela `api_tokens`, coluna `token`). Detalhar payload (`title`, `description`, `due_date`, `start_date`, `priority`, `list_id`, `status_id`, `status_name` case-insensitive, `attachment_url`), lógica de resolução de `list_id` (payload → `target_list_id` do token), cadeia de fallback do `status_id` (por nome → default da lista → primeiro da lista → default do workspace → primeiro do workspace), datas default (hoje / hoje+7d), registro em `task_activities` com `metadata.created_by = 'api'`, atualização de `last_used_at` no token, e códigos de erro (400/401/403/404/500).
- `ANY /functions/v1/api-gateway/<recurso>[/<id>]` — CRUD completo para automações externas. Autenticação idêntica (Bearer token). Listar recursos suportados: `workspaces`, `spaces`, `folders`, `lists`, `tasks`, `subtasks`, `statuses`, `tags`, `task-tags`, `comments`, `checklists`, `checklist-items`, `assignees`, `attachments`, `members`, `activities`. Documentar filtros por query string (`name`, `tag_name`, `space_id`, etc.), resolução de anexos para signed URLs (`task-attachments` bucket, 45 dias) e formato de resposta `{ data }` / `{ error }`.
- `POST /functions/v1/webhooks-inbound?source=<slug>&workspace=<uuid>` — recebe webhooks vindos de sistemas externos (Portal ou outros). Autenticação dupla e opcional: header `x-webhook-token` (comparado a `INBOUND_WEBHOOK_TOKEN`) e/ou `x-webhook-signature` HMAC-SHA256 (segredo `INBOUND_WEBHOOK_SIGNING_SECRET`). Persiste em `webhook_inbox` (headers filtrados, payload, status `received`).
- Atividade `task.created` marcada como `created_by: 'portal'` é reconhecida na UI (`TaskActivityItem`) e renderizada com o rótulo "🌐 Portal MAP".

**2.2 Endpoints que este projeto chama no Portal (saída):**
- `POST <endpoint_configurado>` — disparado pela edge function `webhooks-dispatcher` para cada endpoint registrado em `webhook_endpoints` que assine o evento (ou `*`). Estrutura completa do envelope:
  ```json
  {
    "id": "<delivery_uuid>",
    "event": "task.created",
    "workspace_id": "<uuid>",
    "occurred_at": "ISO-8601",
    "data": { ... }
  }
  ```
- Headers enviados: `Content-Type: application/json`, `x-webhook-signature: sha256=<hex>` (HMAC do body com o `secret` do endpoint), `x-webhook-id`, `x-webhook-event`, `x-webhook-timestamp`.
- Ciclo de vida: enfileirado em `webhook_deliveries` pela função `webhook-enqueue` → dispatcher percorre `status=pending` → sucesso marca `success`; erros aplicam backoff exponencial (1m, 5m, 15m, 1h, 3h, 12h, 24h) com `MAX_ATTEMPTS=8`, timeout de 30s.
- Eventos disponíveis (do `WEBHOOK_EVENTS`): `task.created`, `task.updated`, `task.deleted`, `task.status_changed`, `comment.created`, `comment.updated`, `list.created/updated/deleted`, `space.created/updated`, `webhook.test`, coringa `*`.
- Como o Portal registra seu endpoint: via UI de Webhooks (`useWebhooks.ts`) — insere em `webhook_endpoints` com `url`, `events[]`, `secret` (gerado com `crypto.getRandomValues`), `is_active`, `description`.
- Como o Portal deve validar as chamadas: recalcular HMAC-SHA256(body, secret) e comparar com `x-webhook-signature`, usando comparação em tempo constante.

**2.3 Tabelas envolvidas:** `api_tokens`, `webhook_endpoints`, `webhook_deliveries`, `webhook_inbox`. Descrever colunas-chave de cada.

### 3. Integração com o MAP Hub Flow

**3.1 Objetivo:** o Hub é o identity provider central. Cuida de login, papéis (`administrador_global`, `administrador`, `gestor`, `membro`, `convidado`), revogação global e sinais de segurança.

**3.2 Variáveis de ambiente (edge + client):**
- Edge: `HUB_BASE_URL`, `HUB_SSO_REDEEM_URL`, `SSO_CLIENT_SECRET`, `APP_SLUG=map-flow`.
- Cliente (Vite): `VITE_HUB_BASE_URL`, `VITE_HUB_SUPABASE_URL`, `VITE_HUB_ANON_KEY`.

**3.3 Fluxo de login (SSO):**
1. Usuário abre `/sso/login` → cliente monta URL `${HUB_BASE_URL}/sso/login?app=map-flow&redirect=<callback>` e redireciona.
2. Hub autentica → volta para `/sso/callback?code=<auth_code>`.
3. `sso.callback.tsx` chama a edge function `sso-exchange` com `{ code, fingerprint }`.
4. `sso-exchange` (verify_jwt=false) faz `POST HUB_SSO_REDEEM_URL` server-to-server com `{ code, client_secret, app }`. O Hub responde `{ user: {id, email, name, avatar_url}, role, app }`.
5. Edge function valida `role` contra whitelist, valida `app === APP_SLUG`, procura/cria usuário no Supabase local (busca por email em `profiles` e paginação em `auth.admin.listUsers`), upserta `profiles`, chama RPC `sync_hub_role_to_app_roles` para popular `user_roles`, cria um magic-link OTP e devolve `{ email, token_hash, type: 'magiclink' }`.
6. Cliente chama `supabase.auth.verifyOtp` → sessão local emitida → redireciona para o alvo salvo.
7. Baseline de segurança (`session_context`): IP externo (`x-forwarded-for`), `fingerprint` do dispositivo, `login_at` são gravados no upsert.
8. Detalhes anti-reuso: query string é limpa via `history.replaceState` após consumir o `code`; se já existe sessão local (F5), pula a troca; detecção de 401/`invalid_grant` mostra "Fazer login novamente".
9. CORS estrito da `sso-exchange`: apenas `localhost/127.0.0.1`, `*.lovable.app` (regex ancorado), `*.lovableproject.com` (regex ancorado), `mapflow.lovable.app` e origem ausente. Sem `*`.

**3.4 Verificação contínua da sessão:**
- Hook `useSessionGuard` roda ao montar e a cada 30 min → chama `POST /functions/v1/session-guard` (verify_jwt=true) com `{ fingerprint }`.
- `session-guard`:
  - Compara IP externo atual com `session_context.baseline_ip` e fingerprint com `baseline_fingerprint`. Se houver **strong signal** (`ip_change` ou `fingerprint_change`) → reporta `POST HUB_BASE_URL/api/public/security-report` e responde `{ action: 'logout', reason: strongSignal }`.
  - Faz `POST HUB_BASE_URL/api/public/session-status` (`{ client_secret, app_slug, email, since: login_at }`) — se Hub responder `{ revoked: true }` → `{ action: 'logout', reason: 'hub_revoked' }`.
  - Falhas de rede / internas do Hub são **fail-open** (`continue`), nunca deslogam por engano. Timeout de 3s no fetch.
- Ação `logout` → `queryClient.clear()`, toast, `supabase.auth.signOut()`, redireciona para `/sso/login?redirect=...`.

**3.5 Revogação em tempo real (push):**
- `src/lib/hubRevocationChannel.ts` cria um cliente Supabase para o **projeto do Hub** (`VITE_HUB_SUPABASE_URL` + `VITE_HUB_ANON_KEY`) e ouve o canal Realtime `session-revocations`, evento `revoked`.
- Payload: `{ subject_hash, revoked_at }`. Cliente compara `subject_hash` com `sha256Hex(email)` local e só desloga se `revoked_at > login_at`. Mesma sequência de logout do session-guard.

**3.6 Refresh-token reuse (detecção de roubo de sessão):**
- Quando `onAuthStateChange` dispara `SIGNED_OUT` inesperado (usuário não iniciou logout e não está em `/signed-out` ou `/sso/*`), o cliente chama `POST /functions/v1/report-refresh-reuse` (verify_jwt=false) com `{ email }`.
- Essa função injeta o `client_secret` server-side e faz `POST HUB_BASE_URL/api/public/security-report` com `signal_type: 'refresh_reuse'`. Retorno é sempre 200 (fail-open, sem leak de timing).

**3.7 Sincronização de papéis:**
- `sso-exchange` invoca a RPC `sync_hub_role_to_app_roles(_user_id, _role_slug)` (não fatal). Mapeia `administrador_global → global_owner`, `administrador → admin`, etc., populando `public.user_roles` — que é a fonte de verdade para RLS local.

**3.8 Tabelas envolvidas:** `profiles` (`id`, `email`, `full_name`, `avatar_url`, `role_slug`), `session_context` (`user_id`, `email`, `baseline_ip`, `baseline_fingerprint`, `login_at`), `user_roles`.

### 4. Configuração no Hub
Lista curta dos itens que o Hub precisa ter cadastrados para o MAP Flow funcionar:
- App slug: `map-flow`
- Redirect URIs autorizados: `https://mapflow.lovable.app/sso/callback`, `https://id-preview--*.lovable.app/sso/callback`, `https://*.lovableproject.com/sso/callback`, `http://localhost:8080/sso/callback`.
- Client secret compartilhado (`SSO_CLIENT_SECRET`).
- Endpoints públicos consumidos pelo MAP Flow: `/sso/redeem`, `/api/public/session-status`, `/api/public/security-report`.
- Canal Realtime: `session-revocations` (broadcast `revoked`).

### 5. Referências rápidas
Tabela com os caminhos de arquivo mais importantes para cada fluxo, para facilitar manutenção:
- `supabase/functions/api-tasks/index.ts`
- `supabase/functions/api-gateway/index.ts`
- `supabase/functions/webhook-enqueue/index.ts`
- `supabase/functions/webhooks-dispatcher/index.ts`
- `supabase/functions/webhooks-inbound/index.ts`
- `supabase/functions/sso-exchange/index.ts`
- `supabase/functions/session-guard/index.ts`
- `supabase/functions/report-refresh-reuse/index.ts`
- `src/routes/sso.login.tsx`, `src/routes/sso.callback.tsx`
- `src/contexts/AuthContext.tsx`, `src/hooks/useSessionGuard.ts`
- `src/lib/hubRevocationChannel.ts`
- `src/hooks/useWebhooks.ts`, `src/hooks/useWebhookTrigger.ts`

## Entrega

Arquivo único: `docs/INTEGRATIONS.md`. Sem alterações em código, migrations, secrets ou config.
