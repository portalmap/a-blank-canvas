# Agenda: compromissos do Google que não chegam

## O que está acontecendo (confirmado nos dados)

A sua conta Google está conectada e "online", a última sincronização foi às 16:20 (horário de Brasília) e não registrou erro. Mesmo assim:

- Existem exatamente 249 compromissos importados do Google na sua agenda — o Google entrega 250 por "página", e a sincronização nunca passa da primeira página.
- O "marcador" de sincronização (que permite continuar de onde parou e depois só buscar novidades) está vazio, apesar de várias sincronizações concluídas. Ou seja, toda sincronização recomeça do zero, traz os mesmos 250 primeiros itens e para.
- A busca nas outras agendas que você enxerga no Google (agendas compartilhadas, agendas de equipe) nunca é executada, porque o tempo limite de 25 segundos já estourou na primeira página da agenda principal.

Motivo técnico: cada compromisso é gravado um a um (consulta + gravação individual, mais uma gravação por convidado). Uma página de 250 itens leva cerca de 2 minutos, muito além do limite de 25 s por chamada. O laço processa a página inteira, mas ao terminar vê que o tempo acabou, não pede a próxima página, não visita as demais agendas e não salva o marcador.

Resultado: qualquer compromisso que caia fora dos primeiros 250 itens da agenda principal (ou em qualquer outra agenda) nunca aparece aqui.

## O que será feito

1. **Sincronização em etapas, que continua de onde parou**
   - Cada chamada trabalha por até ~20 s e devolve "ainda tem mais". O ponto exato (qual agenda e qual página) fica salvo, e a próxima chamada continua dali em vez de recomeçar.
   - A Agenda chama de novo automaticamente até acabar, mostrando "Sincronizando… X compromissos" e atualizando a tela a cada rodada.
   - Ao terminar cada agenda, o marcador do Google é salvo; a partir daí as sincronizações seguintes só buscam alterações e levam poucos segundos.

2. **Gravação em lote (muito mais rápida)**
   - Em vez de 2–3 idas ao banco por compromisso, cada página de 250 itens passa a ser: 1 consulta dos que já existem + 1 gravação em lote dos novos + atualização só dos que mudaram. Uma página cai de ~2 min para poucos segundos.
   - Respostas dos convidados (Sim/Não/Talvez) continuam sendo espelhadas, também em lote.

3. **Todas as agendas visíveis no Google**
   - Agenda principal + agendas compartilhadas/de equipe passam a ser percorridas de fato, cada uma com o seu marcador.
   - Convites recebidos aparecem normalmente (já vêm na agenda principal do Google).

4. **Correção dos dados já importados**
   - Os 248 compromissos antigos sem identificação da agenda de origem serão marcados como "principal", para que edições feitas aqui continuem indo ao lugar certo no Google.

5. **Verificação final**
   - Rodar a sincronização completa na sua conta, conferir que o marcador ficou salvo para cada agenda e que o total passou dos 249.
   - Você confere na Agenda um compromisso que hoje falta; se ainda faltar algum, o próximo passo é olhar em qual agenda do Google ele está.

## Detalhes técnicos

- `src/lib/googleCalendarSync.server.ts` (só o módulo de sincronização do Google é alterado):
  - Cursor de progresso persistido em `calendar_google_accounts` (nova coluna `sync_cursor jsonb` com `{ calendarIndex, pageToken, calendarIds, windowFrom, windowTo }`); `sync_tokens` continua guardando o `nextSyncToken` por agenda.
  - Pull por página: `select id, google_event_id, google_etag ... in (ids)` → `insert` em lote dos novos → `update` apenas dos etags diferentes; convidados espelhados com um `select` por página + updates agrupados.
  - Orçamento de tempo checado entre páginas; retorno `{ connected, pushed, pulled, removed, more, progress }`. Sem cursor pendente e sem `syncToken` → usa a janela padrão (−30 d / +180 d); com `syncToken` → incremental; `410` → zera token e reinicia a agenda.
  - Tarefas do Google rodam só quando o pull das agendas terminou (`more = false`).
- `src/hooks/useGoogleCalendar.ts` (`useSyncGoogleCalendar`): repete a chamada enquanto `more === true` (com limite de segurança de rodadas), invalidando `agenda-events` a cada rodada; expõe progresso para o `GoogleAgendaButton`.
- `src/components/agenda/GoogleAgendaButton.tsx`: texto "Sincronizando… N" durante as rodadas.
- Migração: `ALTER TABLE calendar_google_accounts ADD COLUMN sync_cursor jsonb NOT NULL DEFAULT '{}'`; `UPDATE calendar_events SET google_calendar_id = 'primary' WHERE source = 'google' AND google_event_id IS NOT NULL AND google_calendar_id IS NULL`.
- Nenhuma alteração em tarefas, spaces, chat ou notificações.
