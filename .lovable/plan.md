# Corrigir "Erro 400: redirect_uri_mismatch" ao conectar o Google Agenda

## O que está acontecendo

Dessa vez a página do Google abriu normalmente (o bloqueio anterior foi resolvido). O erro agora vem do próprio Google: o endereço de retorno usado na autorização não está cadastrado no aplicativo Google que estamos usando. Enquanto esse endereço não estiver na lista de retornos autorizados, o Google recusa qualquer tentativa de login.

Isso não é um problema de código do MAP Flow — é um ajuste de cadastro no painel do Google Cloud do aplicativo Google.

## Como resolver

1. No painel do Google Cloud, abrir as credenciais do aplicativo (OAuth Client ID, tipo "Aplicativo da Web") que está sendo usado na conexão do Google Agenda.
2. Em "URIs de redirecionamento autorizados", adicionar exatamente:

```text
https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback
```

3. Em "Origens JavaScript autorizadas", adicionar:

```text
https://connector-gateway.lovable.dev
```

4. Salvar e aguardar alguns minutos (o Google leva um tempo para propagar).
5. Confirmar que a conta de teste (`vibo86@gmail.com`) está na lista de usuários de teste, caso a tela de consentimento ainda esteja em modo "Em teste".
6. Confirmar que a API do Google Agenda está ativada no mesmo projeto do Google Cloud.

## Verificação depois do ajuste

Abrir a Agenda em uma aba própria, clicar em "Conectar Google", autorizar com a conta desejada e confirmar que ela aparece em Configurações > Integrações como "online", com os compromissos espelhados.

## Se o erro persistir

Se, após o cadastro do endereço acima, o Google continuar recusando, o passo seguinte é verificar no MAP Flow qual endereço de retorno está sendo enviado na autorização e compará-lo, caractere por caractere, com o que está cadastrado no Google — a diferença costuma ser uma barra final ou http/https. Nesse caso eu faço essa checagem e ajusto o que for necessário no lado do app.
