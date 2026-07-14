# Integrações do MAP Flow

Este documento descreve, com o máximo de detalhes técnicos, como o **MAP Flow** (este projeto) se comunica com dois sistemas externos:

1. **Portal MAP** — integração via API Token (REST) e Webhooks bidirecionais.
2. **MAP Hub Flow** — identity provider central: SSO, verificação contínua de sessão, revogação em tempo real e sinais de segurança.

> Fonte de verdade: código sob `supabase/functions/*` e `src/routes/sso.*`, `src/contexts/AuthContext.tsx`, `src/hooks/useSessionGuard.ts`, `src/lib/hubRevocationChannel.ts`, `src/hooks/useWebhooks.ts`.

---

## 1. Visão geral

```text
                    ┌──────────────────────┐
                    │    MAP Hub Flow      │  (Identity Provider)
                    │  auth + roles +      │
                    │  revogação global    │
                    └──────────┬───────────┘
           SSO code / redeem   │   session-status / security-report
           Realtime revoked    │   (server-to-server, client_secret)
                    ▼          ▼
                    ┌──────────────────────┐
                    │      MAP Flow        │◄─── Portal MAP (Bearer api_token)
                    │  (este projeto)      │      POST /api-tasks
                    │                      │      ANY  /api-gateway/*
                    │                      │      POST /webhooks-inbound
                    │                      │───► Portal MAP (HMAC-signed)
                    │                      │      POST <endpoint>   (task.*, list.*, comment.*, ...)
                    └──────────────────────┘
```

### Tabela-resumo dos endpoints

| Canal | Direção | Endpoint | Autenticação | Finalidade |
|---|---|---|---|---|
| Portal → MAP Flow | Entrada | `POST /functions/v1/api-tasks` | `Bearer <api_token>` | Criação simples de tarefa |
| Portal → MAP Flow | Entrada | `ANY /functions/v1/api-gateway/<recurso>` | `Bearer <api_token>` | CRUD completo (16 recursos) |
| Externo → MAP Flow | Entrada | `POST /functions/v1/webhooks-inbound` | `x-webhook-token` e/ou `x-webhook-signature` (HMAC) | Inbox de webhooks recebidos |
| MAP Flow → Portal | Saída | `POST <url configurada>` | `x-webhook-signature` (HMAC do endpoint) | Notifica eventos (task.*, list.*, etc.) |
| Cliente → MAP Flow | Interno | `POST /functions/v1/sso-exchange` | pública (`verify_jwt=false`) | Troca `code` do Hub por sessão local |
| MAP Flow → Hub | Saída | `POST HUB_SSO_REDEEM_URL` | `client_secret` server-to-server | Redeem do `code` SSO |
| Cliente → MAP Flow | Interno | `POST /functions/v1/session-guard` | JWT do usuário (`verify_jwt=true`) | Verificação contínua de sessão |
| MAP Flow → Hub | Saída | `POST /api/public/session-status` | `client_secret` | Consulta revogação global |
| MAP Flow → Hub | Saída | `POST /api/public/security-report` | `client_secret` | Reporta sinais (ip_change, fingerprint_change, refresh_reuse) |
| Cliente → MAP Flow | Interno | `POST /functions/v1/report-refresh-reuse` | pública (`verify_jwt=false`) | Proxy do sinal `refresh_reuse` |
| Hub → Cliente | Push | Realtime channel `session-revocations` | `VITE_HUB_ANON_KEY` | Logout push em tempo real |

---

## 2. Integração com o Portal MAP

O Portal MAP é um sistema externo que orquestra publicações/tarefas. Ele **consome** dados do MAP Flow via API Token e **recebe** notificações via webhooks assinados.

### 2.1 Endpoints que o Portal chama neste projeto (entrada)

Todos os endpoints estão em `supabase/functions/*`. Base URL:

```
https://<PROJECT_REF>.supabase.co/functions/v1
```

#### 2.1.1 `POST /api-tasks` — criação simples de tarefa

Arquivo: `supabase/functions/api-tasks/index.ts`.

**Autenticação:** `Authorization: Bearer <api_token>` — validado contra `public.api_tokens` (`token`, `is_active=true`, `expires_at` no futuro).

**Payload aceito:**

```json
{
  "title": "string (obrigatório)",
  "description": "string?",
  "due_date": "YYYY-MM-DD?",
  "start_date": "YYYY-MM-DD?",
  "priority": "low | medium | high | urgent",
  "list_id": "uuid?",
  "status_id": "uuid?",
  "status_name": "string? (case-insensitive)",
  "attachment_url": "string?"
}
```

**Resolução do `list_id`:** payload > `api_tokens.target_list_id`. Se ambos vazios, retorna 400. A lista precisa pertencer ao `workspace_id` do token (403 caso contrário).

**Resolução do `status_id` (cadeia de fallback):**
1. Se `status_name` foi enviado → busca `statuses` com `scope_type='list'`, `scope_id=<list>`, `ilike(name, status_name)`.
2. Status default da lista (`scope_type='list'`, `is_default=true`).
3. Primeiro status da lista (`order_index ASC`).
4. Status default do workspace (`scope_type='workspace'`, `is_default=true`).
5. Primeiro status do workspace.

**Defaults de data:** `start_date = hoje`, `due_date = hoje + 7 dias`.

**Efeitos colaterais:**
- Insere em `tasks` com `created_by_user_id = api_tokens.created_by`.
- Registra `task_activities` com `activity_type='task.created'` e `metadata.created_by='api'`.
- Se `attachment_url` presente, insere em `task_attachments`.
- Atualiza `api_tokens.last_used_at`.

**Respostas:**
- `201 { success: true, task_id, message }`
- `400` (campo obrigatório ausente / lista sem status)
- `401` (token ausente/inválido/expirado)
- `403` (lista fora do workspace do token)
- `404` (lista não encontrada)
- `500` (erro interno)

> A UI reconhece `metadata.created_by='portal'` em `task_activities` e exibe o selo **🌐 Portal MAP** (`src/components/tasks/TaskActivityItem.tsx`). Se o Portal quiser esse selo específico, deve gravar `metadata.created_by='portal'` ao chamar via `api-gateway`; chamadas via `api-tasks` são marcadas como `'api'`.

#### 2.1.2 `ANY /api-gateway/<recurso>[/<id>]` — CRUD completo

Arquivo: `supabase/functions/api-gateway/index.ts`. Autenticação idêntica (`Bearer <api_token>`).

O path tem o formato `/api-gateway/<recurso>` ou `/api-gateway/<recurso>/<id>`. Formato de resposta:

```json
{ "data": ... }
// ou
{ "error": "mensagem" }
```

**Recursos suportados:**

| Recurso | Métodos | Filtros relevantes (query string) |
|---|---|---|
| `workspaces` | GET, PUT | — |
| `spaces` | GET, POST, PUT, DELETE | `name` (ilike parcial) |
| `folders` | GET, POST, PUT, DELETE | `space_id` |
| `lists` | GET, POST, PUT, DELETE | `space_id` |
| `tasks` | GET, POST, PUT, DELETE | `tag_name`, `space_id`, e filtros por list/status |
| `subtasks` | GET, POST | vinculado a `tasks` |
| `statuses` | GET, POST | scope by list/workspace |
| `tags` | GET, POST, PUT, DELETE | — |
| `task-tags` | GET, POST, DELETE | pivot tarefa↔tag |
| `comments` | GET, POST, PUT, DELETE | — |
| `checklists` | GET, POST, PUT, DELETE | por `task_id` |
| `checklist-items` | GET, POST, PUT, DELETE | por `checklist_id` |
| `assignees` | GET, POST, DELETE | por `task_id` |
| `attachments` | GET, POST, DELETE | por `task_id`; resolve `file_url` para signed URL (bucket `task-attachments`, TTL 3 888 000 s ≈ 45 dias) |
| `members` | GET | membros do workspace |
| `activities` | GET, POST | `task_activities` |

**GET `/`:** retorna auto-documentação com a lista de endpoints (`{ data.message: "API Gateway v1.0", endpoints: [...] }`).

**Erros padrão:** 400 (validação/DB), 401 (token), 404 (recurso não encontrado), 405 (método não permitido), 500 (erro interno).

#### 2.1.3 `POST /webhooks-inbound?source=<slug>&workspace=<uuid>` — inbox

Arquivo: `supabase/functions/webhooks-inbound/index.ts`. Permite que sistemas externos (Portal, Zapier, n8n, etc.) empurrem eventos para dentro do MAP Flow.

**Autenticação (opcional, dupla):**
- `x-webhook-token` — comparado a env `INBOUND_WEBHOOK_TOKEN`. Se enviado, precisa bater.
- `x-webhook-signature` — HMAC-SHA256 do body cru com env `INBOUND_WEBHOOK_SIGNING_SECRET`, formato `sha256=<hex>`. Se enviado, precisa validar.
- Se nenhum header for enviado, a chamada é aceita (útil para provedores sem HMAC), mas o payload fica em quarentena em `webhook_inbox`.

**Efeitos:** insere linha em `webhook_inbox` com:
- `workspace_id` (query `workspace`, opcional)
- `source` (query `source`, default `custom`)
- `headers` (todos exceto `authorization` e `x-webhook-token`)
- `payload` (JSON)
- `status='received'`

**Respostas:** `200 { success, id, message }` / `400` (JSON inválido) / `401` (token/HMAC inválidos) / `500`.

> A partir daí, o processamento é responsabilidade da aplicação (consumer que lê `webhook_inbox` e converte em ações do domínio).

### 2.2 Endpoints que este projeto chama no Portal (saída)

Todo tráfego de saída passa pelo **dispatcher** (`supabase/functions/webhooks-dispatcher/index.ts`). O Portal é um dos possíveis destinos — qualquer URL cadastrada em `webhook_endpoints` recebe as notificações.

#### 2.2.1 Ciclo de vida de um webhook

```text
 evento no app
      │
      ▼
 triggerWebhook()  ─►  POST /functions/v1/webhook-enqueue
 (useWebhookTrigger)          │
                              ▼
                     seleciona webhook_endpoints
                     (is_active=true, events ⊇ evento OR '*')
                              │
                              ▼
                     INSERT webhook_deliveries (status='pending')
                              │
                              ▼
                     /functions/v1/webhooks-dispatcher (cron / manual)
                              │
                              ▼
                     POST <endpoint.url> com HMAC
                              │
                    ┌─────────┴──────────┐
                success                erro / timeout
                    │                       │
                    ▼                       ▼
          status='success'         backoff exponencial
          delivered_at=now         next_attempt_at += 1/5/15/60/180/720/1440 min
                                   attempt_count >= 8 → status='failed'
```

#### 2.2.2 `webhook-enqueue` (`POST /functions/v1/webhook-enqueue`)

Chamado internamente por `useWebhookTrigger`:

```json
{
  "event_type": "task.created",
  "workspace_id": "<uuid>",
  "payload": { ... }
}
```

Percorre `webhook_endpoints` do workspace, filtra os que assinam `event_type` (ou `*`), e insere N linhas em `webhook_deliveries` com `status='pending'`, `attempt_count=0`, `next_attempt_at=now`.

#### 2.2.3 `webhooks-dispatcher`

A cada execução (recomendado por cron/pg_cron), lê até 50 entregas com `status='pending' AND next_attempt_at <= now`, faz `POST` para cada `endpoint.url` com:

**Envelope:**

```json
{
  "id": "<delivery_uuid>",
  "event": "task.created",
  "workspace_id": "<uuid>",
  "occurred_at": "2026-07-14T12:00:00.000Z",
  "data": { ... payload original ... }
}
```

**Headers:**

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `x-webhook-signature` | `sha256=<hex>` — HMAC-SHA256 do body com `webhook_endpoints.secret` |
| `x-webhook-id` | UUID da entrega |
| `x-webhook-event` | Nome do evento |
| `x-webhook-timestamp` | ISO-8601 |

**Timeout:** 30 segundos por requisição (`AbortController`).

**Sucesso** (`response.ok`): grava `status='success'`, `delivered_at`, `last_status_code`, `attempt_count += 1`.

**Falha** (HTTP ≥ 400 ou erro de rede):
- `attempt_count += 1`, grava `last_status_code` e `last_error` (primeiros 500 chars da resposta ou mensagem do erro).
- Se `attempt_count >= 8` → `status='failed'` (permanente).
- Caso contrário → agenda nova tentativa: `next_attempt_at = now + backoff[attempt_count-1]`.

**Backoff (em minutos):** `[1, 5, 15, 60, 180, 720, 1440]` → 1m, 5m, 15m, 1h, 3h, 12h, 24h. Após esgotar, mantém 24h.

#### 2.2.4 Como o Portal deve validar a assinatura

```ts
const expected = "sha256=" +
  hmacSha256Hex(rawBody, endpointSecret);
// comparar em tempo constante com o header x-webhook-signature
```

Rejeitar a requisição se não bater. O `endpointSecret` é o valor da coluna `webhook_endpoints.secret` (gerado no cliente com `crypto.getRandomValues(32 bytes)` — ver `useRegenerateWebhookSecret` em `src/hooks/useWebhooks.ts`) e é compartilhado apenas entre o MAP Flow e o Portal.

#### 2.2.5 Eventos disponíveis

Definidos em `src/hooks/useWebhooks.ts` (`WEBHOOK_EVENTS`) e no tipo `WebhookEventType` de `src/hooks/useWebhookTrigger.ts`:

- `task.created`, `task.updated`, `task.deleted`, `task.status_changed`
- `comment.created`, `comment.updated`
- `list.created`, `list.updated`, `list.deleted`
- `space.created`, `space.updated`
- `webhook.test` (disparado pelo botão de teste da UI)
- `*` (coringa: recebe todos)

### 2.3 Tabelas envolvidas na integração com o Portal

| Tabela | Papel |
|---|---|
| `api_tokens` | Chaves emitidas ao Portal. Colunas-chave: `token` (secreto), `workspace_id`, `target_list_id`, `created_by`, `is_active`, `expires_at`, `last_used_at`. |
| `webhook_endpoints` | URLs cadastradas para receber eventos. Colunas: `url`, `events[]`, `secret` (HMAC), `is_active`, `description`, `workspace_id`, `created_by`. |
| `webhook_deliveries` | Fila persistente de entregas. Colunas: `endpoint_id`, `event_type`, `payload`, `status`, `attempt_count`, `next_attempt_at`, `last_status_code`, `last_error`, `delivered_at`. |
| `webhook_inbox` | Inbox de webhooks recebidos. Colunas: `workspace_id`, `source`, `headers`, `payload`, `status`, `error`, `received_at`, `processed_at`. |

---

## 3. Integração com o MAP Hub Flow

O Hub é o **identity provider central**: cuida de login unificado, catálogo de papéis (`administrador_global`, `administrador`, `gestor`, `membro`, `convidado`), revogação global de sessões e coleta de sinais de segurança dos apps.

### 3.1 Variáveis de ambiente

**Edge functions (Deno):**

| Variável | Uso |
|---|---|
| `HUB_BASE_URL` | Base do Hub (ex.: `https://hub.map.app`). |
| `HUB_SSO_REDEEM_URL` | Endpoint completo de redeem do `code` SSO. |
| `SSO_CLIENT_SECRET` | Segredo compartilhado app↔Hub. Nunca sai do servidor. |
| `APP_SLUG` | `map-flow`. |

**Cliente (Vite, `import.meta.env`):**

| Variável | Uso |
|---|---|
| `VITE_HUB_BASE_URL` | Redirecionamento inicial em `/sso/login`. |
| `VITE_HUB_SUPABASE_URL` | Projeto Supabase do Hub (Realtime de revogação). |
| `VITE_HUB_ANON_KEY` | Anon key do Hub (subscribe read-only ao canal). |

### 3.2 Fluxo de login SSO

```text
/sso/login  ──►  ${HUB_BASE_URL}/sso/login?app=map-flow&redirect=<cb>
                                │
                     (usuário autentica no Hub)
                                │
                                ▼
/sso/callback?code=XYZ  ──►  POST /functions/v1/sso-exchange { code, fingerprint }
                                │
                                ▼
                     POST ${HUB_SSO_REDEEM_URL}  (server-to-server, client_secret)
                                │
                                ▼
                     { user: {id,email,name,avatar_url}, role, app }
                                │
                                ▼
                     upsert profiles / user_roles
                     upsert session_context (baseline_ip, baseline_fingerprint, login_at)
                     admin.generateLink('magiclink') → token_hash
                                │
                                ▼
                     cliente supabase.auth.verifyOtp({ token_hash })
                                │
                                ▼
                     sessão Supabase local emitida → navigate(redirect)
```

**Detalhes por etapa (referências em `src/routes/sso.login.tsx`, `src/routes/sso.callback.tsx`, `supabase/functions/sso-exchange/index.ts`):**

1. `/sso/login` guarda o alvo de redirecionamento em `sessionStorage['sso:redirect']` (apenas paths relativos passam por `safeRedirect`) e monta a URL do Hub.
2. Retorno do Hub em `/sso/callback?code=<auth_code>`.
3. `sso.callback` protege contra **reuso do `code`**:
   - Se já existe sessão Supabase local (F5 após login) → pula o exchange, limpa a query e navega direto.
   - Caso contrário chama `sso-exchange` uma única vez e, sucesso ou falha, executa `history.replaceState({}, "", "/sso/callback")` para que um F5 não retente com o mesmo `code`.
   - Se o Hub responder 401 (`invalid_grant`/"rejected code (401)"), a UI mostra "Este código de login já foi utilizado ou expirou" com o botão **"Fazer login novamente"**.
4. `sso-exchange`:
   - `verify_jwt=false` (público, cf. `supabase/config.toml`).
   - CORS estrito (`isAllowedOrigin`): aceita apenas origem ausente (S2S), `localhost`/`127.0.0.1`, hostname que **termine** em `.lovable.app` ou `.lovableproject.com` (regex ancorado `$`), e o exato `mapflow.lovable.app`. Nunca usa `*`.
   - `POST HUB_SSO_REDEEM_URL` server-to-server com `{ code, client_secret, app: 'map-flow' }`.
   - Valida `payload.app === APP_SLUG` e `role ∈ { administrador_global, administrador, gestor, membro, convidado }` — falha loud (nunca emite sessão para papel desconhecido).
   - `findUserByEmail`: primeiro tenta `profiles ilike email`; senão pagina `auth.admin.listUsers` (200/página, até 50 páginas) — evita depender só da primeira página.
   - Se não encontrado → `auth.admin.createUser({ email, email_confirm: true, user_metadata })`; em corrida, tenta re-lookup antes de errar.
   - Upsert em `profiles` por `id` (`email`, `full_name`, `avatar_url`, `role_slug`).
   - Chama a RPC **`sync_hub_role_to_app_roles(_user_id, _role_slug)`** para materializar o papel no sistema local `user_roles` (não fatal — se falhar, só loga).
   - `auth.admin.generateLink({ type: 'magiclink', email, options?: { redirectTo } })` → devolve `properties.hashed_token`.
   - Upsert em `session_context` com `baseline_ip` (do primeiro `x-forwarded-for` ou `x-real-ip`), `baseline_fingerprint` (do body `{ fingerprint }`), `login_at=now`.
   - Resposta: `{ email, token_hash, type: 'magiclink' }`.
5. Cliente chama `supabase.auth.verifyOtp({ type: 'magiclink', token_hash })` — o Supabase local emite o par access/refresh token e a sessão passa a ser padrão.

**Códigos de erro comuns:**
- `Hub rejected code (401)` — code já usado/expirado. Cliente detecta e oferece novo login.
- `Invalid role from Hub: "<x>"` — papel fora da whitelist, sem sessão.
- `Wrong app slug: <x>` — o Hub misturou apps; nunca sessão.

### 3.3 Verificação contínua de sessão

Arquivos: `src/hooks/useSessionGuard.ts`, `supabase/functions/session-guard/index.ts`.

- Hook roda **ao montar** (com sessão) e a cada **30 minutos**.
- `POST /functions/v1/session-guard` com `Authorization: Bearer <access_token>` e body `{ fingerprint }` (`verify_jwt=true`).
- A função:
  1. Extrai o usuário do bearer token via `admin.auth.getUser(token)`. Sem sucesso → `{ action: 'continue' }` (fail-open).
  2. Lê `session_context` (`baseline_ip`, `baseline_fingerprint`, `login_at`).
  3. **Strong signals** (locais):
     - IP atual != `baseline_ip` → `strongSignal='ip_change'`.
     - Fingerprint atual != `baseline_fingerprint` → `strongSignal='fingerprint_change'`.
  4. `POST ${HUB_BASE_URL}/api/public/session-status` com `{ client_secret, app_slug, email, since: login_at }`, timeout 3s. Se responder `{ revoked: true }` → `hub_revoked`.
  5. Se houver strong signal → também dispara `POST ${HUB_BASE_URL}/api/public/security-report` com `signal_type` e detalhes (IPs/fingerprints baseline vs atual).
  6. Responde:
     - `{ action: 'logout', reason: 'ip_change' | 'fingerprint_change' }` para signal local.
     - `{ action: 'logout', reason: 'hub_revoked' }` para revogação do Hub.
     - `{ action: 'continue' }` em qualquer outro caso (**fail-open**: erros de rede, timeout, Hub off, erros internos nunca deslogam).
- Cliente reage a `logout`: `queryClient.clear()`, toast contextual, `supabase.auth.signOut()`, redireciona para `/sso/login?redirect=<path atual>`.

### 3.4 Revogação em tempo real (push)

Arquivos: `src/lib/hubRevocationChannel.ts`, `src/contexts/AuthContext.tsx`.

- O cliente instancia um segundo `SupabaseClient` apontando para o **projeto Supabase do Hub** (`VITE_HUB_SUPABASE_URL` + `VITE_HUB_ANON_KEY`), sem persistir sessão.
- Subscreve o canal Realtime **`session-revocations`**, evento `broadcast: revoked`.
- Payload esperado: `{ subject_hash: string, revoked_at: ISO-8601 }`.
- Comparação local: `subject_hash === sha256Hex(user.email)`. Descarta eventos alheios.
- Descarta também eventos com `revoked_at <= session_context.login_at` (revogações antigas relativas à sessão atual).
- Ao aceitar: `queryClient.clear()`, toast "Sua sessão foi encerrada pelo administrador.", `signOut()` e navega para `/sso/login`.

### 3.5 Refresh-token reuse (detecção de roubo de sessão)

Arquivos: `src/contexts/AuthContext.tsx`, `supabase/functions/report-refresh-reuse/index.ts`.

- Quando `supabase.auth.onAuthStateChange` dispara `SIGNED_OUT` **inesperado** (o usuário não iniciou logout, e não está em `/signed-out` ou `/sso/*`), o cliente:
  1. Chama `POST /functions/v1/report-refresh-reuse` (público, `verify_jwt=false`) com `{ email }`.
  2. `queryClient.clear()`, toast, e navega para `/sso/login?redirect=<path>`.
- `report-refresh-reuse` injeta `client_secret` server-side e faz `POST ${HUB_BASE_URL}/api/public/security-report` com `signal_type: 'refresh_reuse'`. Sempre responde `{ ok: true }` (fail-open, sem leak de timing/estado).

### 3.6 Sincronização de papéis

- Fonte de verdade do papel: **Hub**, no campo `role` retornado pelo redeem.
- Espelho local: `profiles.role_slug` (para exibição) e `public.user_roles` (para RLS).
- A RPC `sync_hub_role_to_app_roles(_user_id, _role_slug)` (executada dentro de `sso-exchange`) mapeia:
  - `administrador_global` → `global_owner`
  - `administrador` → `admin`
  - demais papéis → papel local equivalente conforme a lógica do RPC.
- Como é chamada em todo login, mudanças de papel no Hub são propagadas na próxima autenticação. Para forçar propagação imediata, o Hub deve revogar a sessão via canal Realtime — o próximo login trará o novo papel.

### 3.7 Tabelas envolvidas na integração com o Hub

| Tabela | Papel |
|---|---|
| `profiles` | Espelho do usuário do Hub. Colunas: `id` (= `auth.users.id`), `email`, `full_name`, `avatar_url`, `role_slug`. |
| `session_context` | Baseline por sessão. Colunas: `user_id`, `email`, `baseline_ip`, `baseline_fingerprint`, `login_at`. |
| `user_roles` | Fonte de verdade local para RLS. Populada por `sync_hub_role_to_app_roles`. |

---

## 4. Configuração necessária no MAP Hub Flow

Para o MAP Flow funcionar contra um novo Hub, cadastrar/verificar:

- **App slug:** `map-flow`.
- **Client secret compartilhado:** valor guardado como `SSO_CLIENT_SECRET` nas edge functions.
- **Redirect URIs autorizadas** (todas apontam para `/sso/callback` deste app):
  - `https://mapflow.lovable.app/sso/callback` (produção)
  - `https://id-preview--<project-id>.lovable.app/sso/callback` (preview Lovable)
  - `https://<sandbox>.lovableproject.com/sso/callback` (sandbox Lovable)
  - `http://localhost:8080/sso/callback` (dev local)
- **Endpoints públicos que o app consome no Hub:**
  - `POST ${HUB_SSO_REDEEM_URL}` (redeem do `code` SSO)
  - `POST ${HUB_BASE_URL}/api/public/session-status`
  - `POST ${HUB_BASE_URL}/api/public/security-report`
- **Canal Realtime:** `session-revocations`, evento `revoked`, payload `{ subject_hash, revoked_at }`. `subject_hash = sha256Hex(email.toLowerCase())`.
- **Papéis permitidos no retorno do redeem:** `administrador_global`, `administrador`, `gestor`, `membro`, `convidado`. Qualquer outro valor invalida o login.

---

## 5. Referências rápidas de arquivos

### Integração Portal MAP
- `supabase/functions/api-tasks/index.ts` — criação simples de tarefa
- `supabase/functions/api-gateway/index.ts` — CRUD completo
- `supabase/functions/webhook-enqueue/index.ts` — fila de saída
- `supabase/functions/webhooks-dispatcher/index.ts` — dispatcher com HMAC + backoff
- `supabase/functions/webhooks-inbound/index.ts` — inbox
- `src/hooks/useWebhookTrigger.ts` — dispara eventos internamente
- `src/hooks/useWebhooks.ts` — CRUD de endpoints/deliveries/inbox na UI

### Integração MAP Hub Flow
- `src/routes/sso.login.tsx` — redireciona para o Hub
- `src/routes/sso.callback.tsx` — troca do `code`, anti-reuse
- `supabase/functions/sso-exchange/index.ts` — redeem + provisão local
- `supabase/functions/session-guard/index.ts` — verificação contínua
- `supabase/functions/report-refresh-reuse/index.ts` — proxy do sinal `refresh_reuse`
- `src/hooks/useSessionGuard.ts` — polling do session-guard
- `src/contexts/AuthContext.tsx` — orquestração de logout, revogação e reuse
- `src/lib/hubRevocationChannel.ts` — Realtime channel do Hub
- `src/lib/deviceFingerprint.ts` — cálculo do fingerprint local
- `supabase/config.toml` — flags `verify_jwt` das funções SSO

---

## 6. Checklist para debug rápido

**Portal não consegue criar tarefa:**
1. `api_tokens.is_active` e `expires_at`?
2. `list_id` do payload (ou `target_list_id` do token) pertence ao `workspace_id` do token?
3. Existe algum status alcançável na cadeia de fallback?

**Portal não recebe webhook:**
1. `webhook_endpoints` do workspace tem a URL, `is_active=true`, `events[]` inclui o evento (ou `*`)?
2. `webhook_deliveries` tem linhas com `status='pending'`? O dispatcher está rodando?
3. `last_status_code` e `last_error` da última tentativa dizem o quê?

**Login SSO falha:**
1. `HUB_BASE_URL` e `HUB_SSO_REDEEM_URL` corretos nas edge functions?
2. `SSO_CLIENT_SECRET` do app bate com o do Hub?
3. O redirect URI usado (`/sso/callback` com o host atual) está autorizado no Hub?
4. F5 no callback → é `Hub rejected code (401)` esperado; use o botão de novo login.

**Usuário logado é deslogado sem motivo:**
1. Ver logs de `session-guard` — houve `ip_change`/`fingerprint_change`?
2. Hub disparou revogação (canal `session-revocations`)?
3. `SIGNED_OUT` inesperado → verificar `report-refresh-reuse` (indício de token reuse).
