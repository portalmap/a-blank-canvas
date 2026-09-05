# Corrigir "Erro 400: redirect_uri_mismatch" ao conectar o Google Agenda

## O que está acontecendo

A página do Google abriu, mas ele recusou a autorização porque o endereço de retorno usado pelo App User Connector não está cadastrado no aplicativo Google. Como você vai criar um novo projeto no Google Cloud, o passo a passo abaixo configura tudo do zero.

## Passo a passo para criar o projeto no Google Cloud

1. Acesse https://console.cloud.google.com/ com uma conta Google (pode ser a `vibo86@gmail.com` ou outra que você queira usar como administrador).
2. No topo da tela, clique no seletor de projeto e depois em **Novo projeto**.
3. Dê um nome ao projeto (ex.: `MAP Flow Integrações`) e confirme.
4. Aguarde a criação e, se necessário, selecione o projeto novo no seletor.

## Configurar a tela de consentimento OAuth

1. No menu lateral, vá em **APIs e serviços > Tela de consentimento OAuth**.
2. Escolha **Externo** (para permitir qualquer conta Google, inclusive a de teste) e clique em **Criar**.
3. Preencha os campos obrigatórios:
   - **Nome do app**: `MAP Flow`
   - **E-mail de suporte do usuário**: seu e-mail administrativo
   - **Logo** (opcional): logo da MAP
   - **E-mail de contato do desenvolvedor**: seu e-mail
4. Em **Escopos**, clique em **Adicionar ou remover escopos** e selecione:
   - `.../auth/calendar`
   - `.../auth/calendar.events`
   - `.../auth/userinfo.email`
   - `openid`
5. Em **Usuários de teste**, adicione `vibo86@gmail.com` (e quaisquer outros e-mails que você for usar durante os testes).
6. Revise e clique em **Voltar ao painel**. A tela ficará em modo "Em teste" até você publicá-la, mas já funciona para os usuários de teste.

## Criar as credenciais OAuth

1. Vá em **APIs e serviços > Credenciais**.
2. Clique em **Criar credenciais > ID do cliente OAuth**.
3. Tipo de aplicativo: **Aplicativo da Web**.
4. **Nome**: `MAP Flow Web`.
5. Em **Origens JavaScript autorizadas**, adicione:

```text
https://connector-gateway.lovable.dev
```

6. Em **URIs de redirecionamento autorizados**, adicione exatamente:

```text
https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback
```

7. Clique em **Criar**.
8. Anote o **ID do cliente** e a **Chave secreta do cliente** (você vai colar esses valores no Lovable/Supabase).

## Ativar a API do Google Agenda

1. No menu lateral, vá em **APIs e serviços > Biblioteca**.
2. Pesquise por **Google Calendar API**.
3. Clique no resultado e depois em **Ativar**.

## Inserir as credenciais no Lovable

1. No Lovable, vá em **Project Settings > Secrets** (ou equivalente).
2. Adicione/atualize os segredos:
   - `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY` = ID do cliente do Google
   - `GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_SECRET` = Chave secreta do cliente do Google
3. Se o Supabase for gerenciado separadamente, adicione os mesmos valores nas variáveis de ambiente do Supabase (Edge Functions/server functions precisam ler `process.env`).

## Verificação depois do ajuste

1. Aguarde alguns minutos para o Google propagar as alterações.
2. Abra a Agenda em uma aba própria (fora do iframe de preview).
3. Clique em **Conectar Google**, escolha `vibo86@gmail.com` e autorize.
4. Confirme que a conta aparece em **Configurações > Integrações** como "online" e que os compromissos começam a espelhar.

## Se o erro persistir

Se, após cadastrar tudo corretamente, o Google continuar recusando, o passo seguinte é comparar caractere por caractere o redirect URI enviado pelo MAP Flow com o cadastrado. A diferença costuma ser uma barra final, http/https ou um parâmetro a mais. Nesse caso eu verifico o lado do app e ajusto o que for necessário.
