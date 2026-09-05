# Conexão com o Google travando em "Concluindo a conexão..."

## O que está acontecendo

Ao voltar do Google, a tela de retorno faz duas coisas de uma vez: troca o código de autorização **e** espera a sincronização completa da agenda terminar antes de sair da tela. Como a sincronização pode varrer muitas páginas de eventos, a tela fica parada no texto "Concluindo a conexão com o Google...".

Além disso, o Google corta o vínculo entre a aba nova e a tela da Agenda que a abriu. Por isso a Agenda original nunca recebe o aviso de conclusão e continua esperando, e a aba de retorno acaba tentando concluir sozinha.

Ao apertar F5, o código de autorização já foi usado uma vez, então dá erro — mesmo quando a conexão já havia sido salva com sucesso.

## O que será feito

1. **Concluir a conexão em segundos**: a etapa de retorno passa a apenas salvar a conexão e voltar para a Agenda. A sincronização deixa de bloquear essa tela.
2. **Sincronizar depois, na Agenda**: assim que a Agenda abre já conectada, ela busca os compromissos e mostra "Sincronizando" só enquanto isso durar, com aviso claro em caso de falha.
3. **Aviso à aba original mesmo sem vínculo**: além do aviso direto, a tela de retorno passa a registrar a conclusão em um canal compartilhado do navegador, então a Agenda percebe a conexão e sai do estado "Conectando..." sozinha.
4. **F5 sem erro**: se a página de retorno for recarregada, ela verifica se a conta já está conectada; se estiver, mostra sucesso e volta para a Agenda em vez de exibir erro. Se não estiver, mostra a mensagem real com opção de tentar de novo.
5. **Sincronização com limite**: a busca de eventos passa a ter janela de tempo e tempo máximo definidos, para nunca ficar rodando indefinidamente.

## Detalhes técnicos

- `src/lib/google-calendar.functions.ts`: `completeGoogleCalendarConnection` deixa de chamar `syncUserGoogleCalendar`; retorna `{ ok: true, alreadyConnected }`. `syncMyGoogleCalendar` continua sendo o único ponto de sincronização.
- `src/routes/oauth.google-calendar.return.tsx`: mantém o guarda de execução única; sempre notifica o abridor (quando existir) e também publica a conclusão via `BroadcastChannel`/`localStorage` na mesma origem; em caso de código ausente/reutilizado, consulta `getMyGoogleCalendarStatus` antes de decidir erro; sempre navega de volta ao `returnTo`.
- `src/hooks/useGoogleCalendar.ts`: `waitForOAuthTabCompletion` escuta `postMessage` **e** o canal compartilhado (aba sem `window.opener` por COOP do Google), com tempo limite; após concluir, invalida `google-calendar-status`/`agenda-events` e dispara a sincronização.
- `src/lib/googleCalendarSync.server.ts`: adicionar `timeMax` (janela padrão: 30 dias atrás a 180 dias à frente) e limite de tempo total, mantendo o guarda de páginas existente; em erro, gravar `status: 'offline'` e `last_error`.
- `src/components/agenda/GoogleAgendaButton.tsx`: sincronização automática única por carregamento continua, mas com estado de erro visível e sem reentrada.
- Mudanças restritas ao módulo Agenda/Google Calendar; nenhum outro módulo é alterado e não há mudança de banco.
