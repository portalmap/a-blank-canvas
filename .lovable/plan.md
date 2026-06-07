## Camada de detecção de sessão roubada + revogação do Hub (fail-open)

Princípio: a sessão local de 7 dias continua mandando. O Hub é REDE DE SEGURANÇA — só derruba quando responde explicitamente "revoked" ou quando há sinal forte LOCAL. Hub indisponível nunca derruba.

### 1. Variáveis de ambiente

- Secrets (já existentes): `SSO_CLIENT_SECRET`, `HUB_BASE_URL`, `HUB_SSO_REDEEM_URL`, `APP_SLUG`.
- Adicionar no `.env` (públicos, vão no bundle):
  - `VITE_HUB_SUPABASE_URL`
  - `VITE_HUB_ANON_KEY`

### 2. Migration — tabela `session_context`

```text
session_context (
  user_id uuid PK FK auth.users,
  email text not null,
  login_at timestamptz not null default now(),
  baseline_ip text,
  baseline_fingerprint text,
  updated_at timestamptz
)
```

- GRANTs: `authenticated` (select próprio), `service_role` ALL.
- RLS: `auth.uid() = user_id` para SELECT. INSERT/UPDATE apenas via service_role (edge functions).
- Trigger `updated_at`.

### 3. Edge function `sso-exchange` — gravar baseline no login

Após `verifyOtp` lógico (na verdade após criar/garantir o usuário no fluxo atual), o front envia ao `sso-exchange` o `fingerprint` do dispositivo. A função:

- Lê IP externo do header `x-forwarded-for` (primeiro IP).
- Faz UPSERT em `session_context` com `user_id`, `email`, `baseline_ip`, `baseline_fingerprint`, `login_at = now()`.

Ajuste mínimo no contrato: adicionar `fingerprint` ao body do exchange. O front calcula antes de chamar.

### 4. Nova edge function `session-guard` (verify_jwt=true)

Recebe `{ fingerprint }` no body. Lê o user do JWT (cabeçalho Authorization).

Fluxo:
1. Obter IP atual via `x-forwarded-for`.
2. Carregar baseline de `session_context` (via service_role).
3. SINAL FORTE LOCAL se:
   - `current_ip !== baseline_ip` (quando baseline existe), ou
   - `fingerprint !== baseline_fingerprint`.
4. Consultar Hub (timeout curto, ex. 3s):
   - `POST {HUB_BASE_URL}/api/public/session-status` body `{ client_secret, app_slug, email, since: login_at.toISOString() }`.
   - Qualquer erro de rede/timeout/status != 2xx → ignorar (fail-open).
   - Se `{ revoked: true }` → marcar para logout.
5. Se SINAL FORTE local → reportar:
   - `POST {HUB_BASE_URL}/api/public/security-report` com `{ client_secret, app_slug, email, signal_type: "ip_change" | "fingerprint_change", details }`.
   - Retornar `{ action: "logout", reason }`.
6. Se Hub respondeu revoked → `{ action: "logout", reason: "hub_revoked" }`.
7. Caso contrário → `{ action: "continue" }`.

Erros internos da função (não o Hub) também são fail-open: devolver `continue`.

### 5. Cliente — fingerprint estável

Helper `src/lib/deviceFingerprint.ts`:
- Concatena `navigator.userAgent`, `navigator.platform`, `navigator.language`, `screen.width x screen.height`, `screen.colorDepth`, `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Hash via `crypto.subtle.digest('SHA-256', ...)` → hex.

Usado tanto no `sso-callback` (envia ao `sso-exchange`) quanto no `session-guard`.

### 6. Cliente — hook `useSessionGuard`

Em `AuthContext` (ou novo `SessionGuardProvider` montado no `__root`):
- Quando há sessão ativa: chamar `session-guard` imediatamente e a cada 30 min (`setInterval`).
- Se `action === "logout"`: `supabase.auth.signOut()` + `navigate('/sso/login?redirect=...')` + toast informativo.
- Erro de invocação → ignorar (fail-open).

### 7. Detecção de reuse de refresh

No `AuthContext.onAuthStateChange`, hoje já tratamos `SIGNED_OUT` inesperado. Estender:
- Guardar `lastEmailRef` em memória (do `previousSessionRef.user.email`).
- Em `SIGNED_OUT` não iniciado pelo usuário (path != `/signed-out` e não veio de `signOut()` local — usar flag `userInitiatedSignOutRef`):
  - `fetch('${HUB_BASE_URL}/api/public/security-report', ...)` — NÃO, isso exporia o client_secret. ⇒ chamar nova edge function pública `report-refresh-reuse` (verify_jwt=false) que recebe só `{ email }` e injeta o `client_secret` server-side ao postar no Hub.
  - Em seguida redirecionar para `/sso/login`.

### 8. Push de revogação em tempo real (Hub Realtime)

`src/lib/hubRevocationChannel.ts`:
- Cria segundo client Supabase com `VITE_HUB_SUPABASE_URL` + `VITE_HUB_ANON_KEY` (sem persistência: `auth: { persistSession: false }`).
- Subscribe ao canal Broadcast `session-revocations`.
- Ao receber `{ subject_hash, revoked_at }`:
  - Calcular `sha256(email.toLowerCase())` do usuário logado.
  - Se bate E `new Date(revoked_at) > login_at` (carregado de `session_context` ou guardado no estado): `signOut()` + redirect `/sso/login`.

Montado no `AuthContext` quando há sessão; desmontado no logout.

### 9. Routes / wiring

- Nenhuma rota nova. Tudo dentro de `AuthContext` + edge functions.
- `supabase/config.toml`: registrar `session-guard` (verify_jwt=true) e `report-refresh-reuse` (verify_jwt=false).

### 10. Segurança

- `client_secret` NUNCA no front. Toda chamada para `/api/public/session-status` e `/api/public/security-report` parte das edge functions (`session-guard`, `report-refresh-reuse`).
- `VITE_HUB_*` são públicos (anon key + URL), uso apenas para Realtime read-only.
- Toda interação com Hub: try/catch + timeout, fail-open por padrão.

### Arquivos a criar/editar

Novos:
- `supabase/migrations/<ts>_session_context.sql`
- `supabase/functions/session-guard/index.ts`
- `supabase/functions/report-refresh-reuse/index.ts`
- `src/lib/deviceFingerprint.ts`
- `src/lib/hubRevocationChannel.ts`
- `src/hooks/useSessionGuard.ts`

Editar:
- `supabase/functions/sso-exchange/index.ts` (aceitar `fingerprint`, gravar baseline com IP do header)
- `src/routes/sso.callback.tsx` (calcular fingerprint, enviar ao exchange)
- `src/contexts/AuthContext.tsx` (montar session-guard, hub revocation channel, detectar refresh-reuse)
- `supabase/config.toml` (registrar novas functions)
- `.env` (placeholders `VITE_HUB_SUPABASE_URL`, `VITE_HUB_ANON_KEY`)

Após aprovação, vou pedir os valores reais de `VITE_HUB_SUPABASE_URL` e `VITE_HUB_ANON_KEY` para preencher no `.env`.
