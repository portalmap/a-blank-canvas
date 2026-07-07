## Diagnóstico

O erro "Edge Function returned a non-2xx status code" é do `supabase.functions.invoke("sso-exchange", ...)` em `src/routes/sso.callback.tsx`. Dentro da função (`supabase/functions/sso-exchange/index.ts`), a chamada `fetch(HUB_SSO_REDEEM_URL, { client_secret: SSO_CLIENT_SECRET, ... })` está voltando `!ok` → função devolve 401 → SDK do browser transforma em "non-2xx".

O `audit_log` do Hub confirma: `reason: invalid_client_secret`. Ou seja, `SSO_CLIENT_SECRET` armazenado nos secrets deste projeto (MAP Flow) **não** corresponde ao `client_secret_hash` da linha `app_slug = 'map-flow'` na tabela `sso_clients` do projeto MAP Hub. Não há bug de código nem no MAP Flow nem no Hub — é apenas dessincronia do segredo.

Nada mais no fluxo precisa mudar: `sso-exchange` já trata role, cria usuário, popula `user_roles` via `sync_hub_role_to_app_roles`, grava `session_context` e emite magiclink.

## Escopo desta correção

Só ressincronizar o segredo. Nenhuma alteração de código, RLS, migração, UI ou fluxo de sessão.

## Limite importante

A tabela `sso_clients` vive no **projeto Supabase do MAP Hub**, não neste. Deste projeto (`efqnscrnyyyjpswctahq`) eu consigo:
- ler/atualizar `SSO_CLIENT_SECRET` nos secrets do MAP Flow;
- gerar um segredo novo via `generate_secret`.

Eu **não** consigo executar o `UPDATE sso_clients ... WHERE app_slug='map-flow'` no Hub por este canal — isso precisa acontecer no SQL Editor do projeto Hub (ou por você, ou pelo agente daquele projeto).

## Opções

### Opção A — Reaproveitar o segredo atual do MAP Flow (mais rápida)
1. Você abre Project Settings → Secrets do MAP Flow, copia o valor atual de `SSO_CLIENT_SECRET`.
2. No projeto MAP Hub, roda no SQL Editor:
   ```sql
   UPDATE sso_clients
   SET client_secret_hash = encode(sha256(convert_to('<VALOR_COLADO>', 'utf8')), 'hex')
   WHERE app_slug = 'map-flow';
   ```
   (Ajustar a expressão de hash exatamente como o Hub calcula — o texto do Lovable no Hub usa `sha256(hex(secret))`; use a forma que o `sso-redeem.ts` do Hub usa. Se preferir, o agente do Hub aplica.)
3. Nenhuma mudança neste projeto. Testar "Acessar" no card MAP Flow.

### Opção B — Rotacionar o segredo dos dois lados (mais limpa)
1. Aqui no MAP Flow: eu chamo `generate_secret` para `SSO_CLIENT_SECRET` (32+ bytes) — sobrescreve o secret atual sem expor o valor no chat.
2. Você me confirma que atualizou, e no projeto MAP Hub roda o mesmo `UPDATE` acima com o valor novo (que você pode ver em Project Settings → Secrets do MAP Flow, ou pedir para o agente do Hub sincronizar).
3. Testar "Acessar".

## Verificação pós-fix

- `audit_log` do Hub: `sso_code_issued` → `sso_code_redeemed` (sem `sso_redeem_failed`).
- Console do browser no `/sso/callback`: sem erro; redirecionamento para `/`.
- Sessão Supabase persistida em `localStorage` (`sb-efqnscrnyyyjpswctahq-auth-token`).

## Detalhes técnicos (referência)

- Cliente: `src/routes/sso.callback.tsx` invoca `sso-exchange` com `{ code, fingerprint }`.
- Server: `supabase/functions/sso-exchange/index.ts` envia `{ code, client_secret: SSO_CLIENT_SECRET, app: APP_SLUG }` para `HUB_SSO_REDEEM_URL`. Falha atual está exatamente no `if (!hubResp.ok)` → retorna 401 → gera o "non-2xx" na tela.
- Secrets envolvidos neste projeto: `SSO_CLIENT_SECRET`, `HUB_SSO_REDEEM_URL`, `HUB_BASE_URL`, `APP_SLUG` (deve valer `map-flow`).

**Qual opção seguimos, A ou B?**
