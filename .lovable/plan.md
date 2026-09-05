# Onde ficam o ID e a senha do Google (e o que falta fazer)

## Esclarecimento

Não falta nada no banco de segredos deste projeto. O ID do cliente e a senha do cliente do Google **não** ficam aqui: eles são guardados na conexão do Google do seu espaço de trabalho (a integração chamada "Agenda MAP"). O que fica no projeto é apenas a chave interna que liga o app a essa conexão — e ela já está salva (`GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY`).

Hoje a conexão "Agenda MAP" está usando o cliente antigo do Google:
`426507370750-98tsug2frdmojv26tj689aunfjavlf7m.apps.googleusercontent.com`.

Como você criou um projeto novo no Google Cloud, é esse valor que precisa ser trocado — por isso o erro de endereço de retorno continuava aparecendo.

## O que vou fazer

1. Abrir o cartão de configuração da integração Google do espaço de trabalho.
2. Você cola ali o **ID do cliente** e a **senha do cliente** do novo projeto do Google Cloud.
3. Confirmar que a integração segue ligada a este projeto e com acesso contínuo ("offline") habilitado.

## Antes disso, confirme no Google Cloud

- Em **URIs de redirecionamento autorizados** do novo cliente existe exatamente:

```text
https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback
```

- A **Google Calendar API** está ativada.
- `vibo86@gmail.com` está na lista de usuários de teste.

## Depois da troca

1. Abrir a Agenda em uma aba própria.
2. Clicar em **Conectar Google** e autorizar com a conta desejada.
3. Verificar em **Configurações > Integrações** se a conta aparece como "online" e se os compromissos começam a espelhar.
