# Sincronização do perfil vindo do SSO do MAP Hub

Objetivo: ao voltar do Hub, além de criar a sessão, o MAP Flow passa a gravar nome, e-mail e uma **cópia local da foto** do usuário — sem nunca bloquear o login se algo falhar.

## O que muda

1. **Banco (migration)** — a tabela `profiles` ganha:
   - `hub_user_id text unique` (identificador do usuário no Hub)
   - `avatar_path text` (o caminho recebido do Hub, usado para comparar entre logins)
   - `avatar_url` já existe (passa a guardar a URL da cópia local)
   - Bucket de storage `avatars` (público para leitura, escrita só pelo backend), criado só se ainda não existir.

2. **Edge function `sso-exchange`** (único ponto onde o `client_secret` é usado; nada disso vai para o navegador):
   - Após o resgate do código no Hub, o upsert do perfil passa a gravar também `hub_user_id`, e o `nome` do Hub é aceito tanto em `name` quanto em `nome`.
   - **Nunca sobrescreve com vazio**: só inclui no upsert os campos que vieram preenchidos.
   - **Foto**: se for o primeiro login ou se `avatar_path` mudou em relação ao salvo:
     - baixa a imagem de `avatar_url` (URL assinada, temporária) via `fetch`;
     - envia para o bucket `avatars` em `<id_local>/avatar.<ext>` com `upsert: true` (extensão derivada do content-type);
     - grava no perfil a URL pública da cópia local em `avatar_url` e salva `avatar_path` para comparação futura.
   - Se o download ou o upload falhar: apenas `console.error`, mantém a foto anterior e o login continua.
   - Toda a sincronização de perfil/foto é não-fatal: nenhuma falha impede a emissão do token de sessão.

3. **Front-end**: nenhuma mudança de fluxo. O callback continua recebendo apenas `email` + `token_hash` — a resposta crua do Hub nunca é exposta.

## Detalhes técnicos

- Ordem no handler: redeem no Hub → resolver/criar usuário → upsert de perfil (campos preenchidos + `hub_user_id`) → sync de papel (já existe) → sincronização de avatar (bloco try/catch isolado, com update final só de `avatar_url`/`avatar_path`) → `generateLink` → `session_context`.
- A comparação usa `avatar_path`; quando o Hub não manda `avatar_path`, cai para hash/compare do próprio `avatar_url` sem extensão de assinatura.
- Limite de tamanho no download (ex.: 5 MB) e validação de `content-type` `image/*` antes de subir ao storage.
- `hub_user_id` recebe índice único parcial (ignora nulos) para não conflitar com perfis antigos.
