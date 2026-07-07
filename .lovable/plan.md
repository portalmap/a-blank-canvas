## Diagnóstico

Segredo sincronizado com sucesso — Hub redeem passou. Novo erro vem do último passo do `sso.callback.tsx`:

```ts
supabase.auth.verifyOtp({
  email: data.email,
  token: data.token_hash,   // ← errado
  type: "magiclink",
});
```

`sso-exchange` devolve `linkData.properties.hashed_token` da API `admin.generateLink({ type: "magiclink" })`. Esse valor precisa ser verificado com o parâmetro **`token_hash`**, não `token`.

- `token_hash` → o hash opaco retornado por `generateLink` (o que temos).
- `token` → o OTP de 6 dígitos (`properties.email_otp`), que não estamos passando.

Ao mandar `token: <hashed_token>`, o GoTrue re-hasheia o valor e nunca acha correspondência → resposta "Token has expired or is invalid". Como magiclinks recém-gerados também são de uso único e curta duração, StrictMode/refetch pioram, mas a causa raiz é o parâmetro errado. Confirma-se pelo fato de o secret sync ter resolvido o 401 anterior e o próximo erro ser exatamente esse.

## Correção

Trocar a chamada em `src/routes/sso.callback.tsx`:

```ts
const { error: verifyErr } = await supabase.auth.verifyOtp({
  type: "magiclink",
  token_hash: data.token_hash,
});
```

- Remover `email` e `token` — `verifyOtp` com `token_hash` não os requer.
- Manter tudo o mais igual (fingerprint, redirect, session_context).

Nenhuma mudança no `sso-exchange`, migração, RLS, ou fluxo do Hub.

## Verificação

- Clicar "Acessar" no Hub → `/sso/callback?code=...` → spinner → redireciona para `/`.
- `audit_log` do Hub: `sso_code_issued` → `sso_code_redeemed`.
- Sessão Supabase gravada em `localStorage` (`sb-efqnscrnyyyjpswctahq-auth-token`).
- Sem "Token has expired or is invalid".

## Fora do escopo desta correção

- Rate-limit/hardening do `sso-exchange`.
- Retry idempotente do callback (StrictMode).
- Alterações no fluxo do MAP Hub.
