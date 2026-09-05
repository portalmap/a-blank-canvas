# Google Agenda: "Failed to exchange token" vem do próprio Google

## O que foi verificado

- O conector do espaço de trabalho ("Agenda MAP") já está usando o **novo** cliente do Google (`841308646314-...gnv69`), atualizado hoje às 16:32 UTC. A tela de autorização do Google abre com esse cliente e o endereço de retorno correto (`connector-gateway.lovable.dev/.../callback`).
- Depois que você confirma no Google, o gateway da Lovable tenta trocar o código pelo token **junto ao Google** e o Google recusa. Por isso o retorno chega à Agenda já com `success=false&error=Failed to exchange token` (registrado 3 vezes hoje: 16:34, 16:46 e 16:47).
- O MAP Flow não chega a participar dessa etapa: o erro acontece antes de qualquer código nosso rodar. As correções feitas na última rodada (troca na aba original, regras da Agenda) continuam válidas e não são a causa.

## Causa mais provável

O **segredo do cliente (client secret)** salvo no conector não corresponde ao cliente `841308646314-...`. Cenários comuns:

1. Foi colado o segredo do cliente antigo (`426507370750-...`) junto com o ID novo.
2. O segredo foi copiado com espaço/quebra de linha no início ou fim.
3. Um novo segredo foi gerado no Google depois da cópia (o Google só mostra o valor uma vez; segredos antigos podem estar desativados).
4. O cliente foi criado como "App para computador" em vez de "Aplicativo da Web" (menos provável, pois a tela de autorização abriu).

## O que fazer (sem alterar código)

1. No Google Cloud: **APIs e serviços > Credenciais > cliente `841308646314-...`**
   - Confirmar tipo = **Aplicativo da Web**.
   - Em "Segredos do cliente": se houver dúvida, clicar em **Adicionar segredo**, copiar o valor novo na hora, e **desativar** o segredo anterior.
   - Confirmar URI de redirecionamento exatamente: `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`
2. Na Lovable: **Workspace > Conectores > Google Calendar > Agenda MAP > Editar**
   - Colar novamente o **ID do cliente** e o **segredo novo**, sem espaços extras, e salvar.
3. Abrir a Agenda em uma aba própria (fora do editor), clicar em **Conectar Google** e escolher a conta de teste que você está usando.
4. Se ainda falhar, verificar em **Tela de consentimento OAuth > Público-alvo** se o e-mail da conta de teste está listado como usuário de teste (app em modo "Teste").

## Se o erro persistir após os passos acima

Aí sim passa a ser investigação do lado do gateway (a mensagem exata do Google fica registrada lá, não no MAP Flow). Nesse caso o próximo passo é acionar o suporte da Lovable com o horário da tentativa e o `client_id`, pois o projeto não tem como ver essa resposta.

## Detalhes técnicos

- Evidência: logs do servidor mostram `GET /oauth/google-calendar/return?connector_id=google_calendar&error=Failed+to+exchange+token&success=false` — o gateway já devolve o erro pronto; nenhuma chamada a `completeGoogleCalendarConnection` foi feita (não há código para trocar).
- `authorizeAppUserOAuth` retornou 200 com o `client_id` novo, `code_challenge` PKCE e escopos `userinfo.email`, `userinfo.profile`, `calendar`, `calendar.events`.
- Nenhuma alteração de código, banco ou segredos do projeto é necessária neste plano.
