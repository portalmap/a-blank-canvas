# Corrigir "accounts.google.com está bloqueado" ao conectar o Google

## O que está acontecendo

Hoje o botão "Conectar Google" abre uma janelinha pop-up vazia e só depois joga o endereço do Google dentro dela. Como a agenda está sendo aberta dentro da tela de pré-visualização (uma página dentro de outra), essa janelinha herda restrições de segurança e o Google recusa o carregamento — daí a mensagem `ERR_BLOCKED_BY_RESPONSE`.

## Como resolver

1. Trocar o fluxo de pop-up por **redirecionamento da própria página**:
   - ao clicar em "Conectar Google", o sistema guarda onde a pessoa estava e leva a página inteira para a tela de autorização do Google;
   - ao autorizar, o Google devolve para a página de retorno do MAP Flow, que conclui a conexão e traz a pessoa de volta para a Agenda com o aviso "Google Agenda conectado".
2. Quando a Agenda estiver aberta dentro da pré-visualização (página dentro de página), abrir a autorização em uma **aba nova e independente**, porque o redirecionamento interno também seria bloqueado. Nesse caso a página de retorno conclui a conexão e avisa a aba original.
3. Mensagens de erro claras: se a autorização for cancelada ou falhar, a pessoa volta para a Agenda com um aviso legível em vez de tela em branco.
4. Manter o botão "Reconectar" usando exatamente o mesmo caminho.

## Detalhes técnicos

- `src/hooks/useGoogleCalendar.ts`: remover `window.open` + `postMessage` como caminho principal. `useConnectGoogleCalendar` chama `startGoogleCalendarConnect`, salva `returnTo` em `sessionStorage` e faz `window.location.assign(authorizationUrl)`. Se `window.top !== window.self`, abrir com `window.open(url, '_blank', 'noopener')` e manter o canal `postMessage` como fallback (já implementado na rota de retorno).
- `src/routes/oauth.google-calendar.return.tsx`: passar a concluir a troca chamando `completeGoogleCalendarConnection` com o `code` quando não houver `window.opener`, e então navegar para `/agenda` (ou o `returnTo` salvo) exibindo sucesso/erro. Mantém o comportamento atual de avisar o opener quando existir.
- Nenhuma mudança em banco, nas server functions do Google ou no módulo de Configurações > Integrações.

## Teste

Abrir a Agenda em aba própria (fora da pré-visualização), clicar em "Conectar Google", autorizar e confirmar o retorno com a conta listada em Configurações > Integrações.
