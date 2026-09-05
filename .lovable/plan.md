# Trocar o cliente do Google usado pela Agenda

## O que eu verifiquei agora

A integração do Google deste espaço de trabalho ("Agenda MAP", já ligada a este projeto, com acesso contínuo habilitado) continua guardando o cliente antigo:

```text
426507370750-98tsug2frdmojv26tj689aunfjavlf7m.apps.googleusercontent.com
```

A última alteração dela foi em 04/09 — ou seja, as mudanças que você fez no Google Cloud (novo projeto, endereço de retorno, API ativada) não chegaram até aqui. Enquanto esse valor não for atualizado, o Google continuará recusando com "solicitação inválida / redirect_uri_mismatch".

Isso não tem relação com publicar o app: essa configuração é externa ao código.

## O que vou fazer

1. Abrir o cartão de configuração da integração Google do espaço de trabalho.
2. Você cola nele o **ID do cliente** e a **senha do cliente** do novo projeto do Google Cloud (ou confirma o cliente correto, se preferir manter um já existente).
3. Confirmar que a integração segue ligada a este projeto e com acesso contínuo ("offline") ativo.

## Confirme antes, no Google Cloud

- Nos **URIs de redirecionamento autorizados** do cliente novo existe exatamente:

```text
https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback
```

- A **Google Calendar API** está ativada nesse mesmo projeto do Google Cloud.
- `vibo86@gmail.com` está na lista de usuários de teste.

## Depois da troca

1. Abrir a Agenda em uma aba própria.
2. Clicar em **Conectar Google** e autorizar.
3. Conferir em **Configurações > Integrações** se a conta aparece como "online" e se os compromissos começam a espelhar.
