## Objetivo

Criar o canal de diagnóstico isolado entre MAP Flow (spoke) e MAP Hub Flow, tratando apenas o assunto `diagnostico.ping`. Nada de produção é lido, alterado ou disparado.

## Padrão a seguir

O `sso-exchange` deste projeto é uma **Supabase Edge Function** (`supabase/functions/sso-exchange/index.ts`, registrada em `supabase/config.toml` com `verify_jwt = false`). Portanto os novos endpoints serão **Edge Functions** também, no mesmo formato (Deno.serve, `Deno.env.get`, `createClient` com `SERVICE_ROLE_KEY`).

URL pública final do inbox (será informada ao usuário no final):
`https://efqnscrnyyyjpswctahq.supabase.co/functions/v1/hub-inbox`

## Etapas

### 1. Migration — nova tabela isolada
Criar `public.relay_diagnostico_log` exatamente como especificado: colunas `direcao` (check enviado|recebido), `mensagem_id`, `origem`, `destino`, `assunto`, `modo`, `payload jsonb`, `status_code`, `observacao`, `criado_em`. RLS habilitado, **sem policy**, `REVOKE ALL ... FROM anon, authenticated`. Nenhum GRANT — acesso só via service_role a partir das Edge Functions.

### 2. Secrets
Solicitar via `add_secret` (uma única vez, após a migration): `HUB_RELAY_TOKEN`, `HUB_INBOX_TOKEN`, `DIAG_KEY`. Definir `HUB_RELAY_URL` via `set_secret` com o valor já fornecido (`https://project--3d15789c-5980-43e3-bd4f-81165402e97d.lovable.app`).

### 3. Edge Function `hub-inbox`
Arquivo novo: `supabase/functions/hub-inbox/index.ts`. Registrar em `supabase/config.toml` com `verify_jwt = false` (auth manual via `HUB_INBOX_TOKEN`).

Fluxo:
- OPTIONS → CORS (mesmo estilo restrito do `sso-exchange`, mas aqui pode aceitar server-to-server: origem ausente OK; para navegador, restringir a `*.lovable.app` / `*.lovableproject.com` com sufixo ancorado).
- Ler `Authorization: Bearer <token>`; comparar com `HUB_INBOX_TOKEN` (timing-safe). Não bate → 401.
- Parse JSON; inválido → 400.
- Inserir em `relay_diagnostico_log` com `direcao='recebido'`, `mensagem_id=body.id`, `origem`, `assunto`, `modo`, `payload`.
- Se `assunto === 'diagnostico.ping'`:
  - `modo === 'consulta'` → 200 `{ pong: true, recebido_de, sou_eu: 'map-flow', echo, processado_em }`
  - `modo === 'entrega'` → 200 `{ ok: true, recebido_de }`
- Qualquer outro `assunto` → 422 `{ error: 'assunto_nao_suportado', assunto }`.
- Nunca logar o token; nunca tocar em outra tabela.

### 4. Edge Function `relay-test-send`
Arquivo novo: `supabase/functions/relay-test-send/index.ts`. Registrar em `supabase/config.toml` com `verify_jwt = false` (auth manual via `x-diag-key`).

Fluxo:
- Validar header `x-diag-key === DIAG_KEY` (timing-safe). Não bate → 401.
- Ler `modo` da querystring (`consulta` padrão, ou `entrega`); qualquer outro → 400.
- Montar envelope: `{ destinos: ['portal-map'], assunto: 'diagnostico.ping', modo, referencia_origem: 'teste-<ts>', payload: { echo: 'ping de map-flow', quando: '<ISO now>' } }`.
- Determinar rota do Hub: `consulta` → `${HUB_RELAY_URL}/api/public/relay-query`; `entrega` → `${HUB_RELAY_URL}/api/public/relay`.
- `fetch` com `Authorization: Bearer ${HUB_RELAY_TOKEN}`, `Content-Type: application/json`, `AbortSignal.timeout(15000)`.
- Capturar status e corpo (tentar `.json()`, fallback `.text()`).
- Inserir em `relay_diagnostico_log` com `direcao='enviado'`, `destino='portal-map'`, `assunto`, `modo`, `status_code`, `observacao` (JSON stringificado do corpo).
- Responder `{ enviado_para, modo, hub_status, resposta_do_hub }`.

### 5. Tela opcional `/diagnostico-relay`
**Não incluir nesta primeira iteração** — o curl valida tudo e a tela adiciona superfície sem necessidade. Se você quiser depois, faço em uma segunda rodada usando uma terceira Edge Function `relay-diagnostico-list` (server-side, com `service_role`) atrás de uma checagem de papel `administrador`/`gestor`.

### 6. Deploy e verificação
- Deploy das duas funções (`hub-inbox`, `relay-test-send`).
- `curl` de fumaça:
  - `hub-inbox` sem token → 401.
  - `hub-inbox` com token e assunto errado → 422.
  - `hub-inbox` com `diagnostico.ping` + `modo=consulta` → 200 com `pong: true, sou_eu: 'map-flow'`.
  - `relay-test-send` sem `x-diag-key` → 401 (não vou disparar contra o Hub sem seu OK — apenas valido o gate; o disparo real é acionado por você).
- Confirmar que `relay_diagnostico_log` recebeu as linhas correspondentes.
- Relatar (a) padrão = **Edge Function** e (b) URL do inbox = `https://efqnscrnyyyjpswctahq.supabase.co/functions/v1/hub-inbox`.

## Isolamento (autocheck)
- Nenhum ALTER em tabela existente.
- Nenhum import/chamada a `api-tasks`, `api-gateway`, `webhooks-*`, `sso-*`.
- Nenhuma gravação em `webhook_deliveries` / `webhook_inbox`.
- Nenhuma policy em `relay_diagnostico_log` (acesso só via service_role).
- Tokens só lidos via `Deno.env.get` dentro das funções; nunca no frontend, nunca logados.

## Detalhes técnicos
- Comparação de tokens: `crypto.timingSafeEqual` sobre `TextEncoder`.
- CORS do `hub-inbox`: reaproveitar o padrão anchored-suffix do `sso-exchange` para preflight; o Hub chama server-to-server (sem Origin), o que já é aceito.
- `service_role` cliente com `auth: { persistSession: false, autoRefreshToken: false }`.
- Erros de insert no log não devem quebrar a resposta funcional (log-e-continua, igual `session_context` no `sso-exchange`).