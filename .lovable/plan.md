# Presença em reuniões do Google Meet (relatório para administradores)

Objetivo: em reuniões com link do Google Meet, registrar quem participou, hora de entrada, hora de saída, cada retorno (várias entradas/saídas) e o tempo total dentro da reunião. Visível apenas para administradores.

## O que o Google entrega

O Google fornece o histórico de participação por sessão: cada participante gera um ou mais trechos "entrou às / saiu às", com duração. Isso permite exatamente o que você pediu, incluindo quem saiu e voltou.

Dois pontos importantes:
- Os dados só existem **depois** que a reunião termina (o Google leva alguns minutos para consolidar).
- O acesso vem pela conta Google que **criou** a reunião. Reuniões criadas por contas fora do MAP Flow (ou por quem não conectou o Google aqui) não terão relatório.
- É necessário **reautorizar** o Google uma vez, porque essa leitura pede uma permissão nova além da agenda.

Além de entrada, saída, retornos e tempo total, o Google também informa (e vamos guardar): nome/e-mail do participante, se entrou por telefone ou por link anônimo, e o número de sessões separadas. Não há informação confiável de câmera/microfone ligados, então isso fica de fora.

## Como vai funcionar no sistema

1. **Módulo novo e isolado: "Presença em reuniões"**, sem alterar Agenda, sincronização, convites ou tarefas além de guardar o link do Meet.
2. Na sincronização da agenda passamos a guardar o link/identificador do Meet do evento (campo novo, nada mais muda).
3. Um processo de coleta busca a participação das reuniões já encerradas nas últimas 48h e grava cada trecho de entrada/saída.
4. Coleta também sob demanda: botão "Atualizar presença" na tela do relatório, para reuniões recém-encerradas.
5. **Tela de relatório (só administradores)**: lista de reuniões com Meet, e ao abrir uma reunião mostra por pessoa — primeira entrada, última saída, número de entradas, tempo total, e a linha do tempo de cada trecho. Com filtro por período e exportação em CSV.
6. Convidados que não apareceram ficam marcados como ausentes, comparando a lista de convidados do evento com quem realmente entrou.

## Detalhes técnicos

- Migration: `calendar_events.google_meet_code` / `hangout_link`; tabelas `meeting_attendance_participants` (evento, pessoa identificada por e-mail, total de segundos, nº de sessões) e `meeting_attendance_sessions` (join_time, leave_time, duração). RLS: SELECT apenas para `is_app_admin` / `is_global_owner` / admin do workspace; escrita só via service role. GRANTs para `authenticated` (select) e `service_role` (all).
- Coleta via Google Meet API v2 (`conferenceRecords.list` filtrando por `space.meeting_code`, depois `participants` e `participantSessions`), usando o token OAuth do organizador já armazenado em `calendar_google_accounts`. Escopo adicional `meetings.space.readonly` → tela de reconexão indica "reautorizar para relatórios de presença".
- Server functions novas em `src/lib/meetingAttendance.functions.ts` + helper `meetingAttendance.server.ts`; nada é adicionado a `googleCalendarSync.server.ts` além da gravação do link do Meet.
- Idempotência por `(conference_record, participant_session_id)`, com upsert — reexecutar a coleta não duplica.
- Rota `src/routes/api/public/meet-attendance-sync.ts` protegida por secret, para agendamento periódico (pg_cron ou chamada externa), mantendo o módulo independente.
- UI: `src/page-views/MeetingAttendance.tsx` + componentes em `src/components/attendance/`, entrada em Configurações (visível só a administradores).

## Limitações a assumir

- Reuniões que ainda não terminaram não têm relatório final (mostramos "em andamento / aguardando dados").
- Participantes anônimos aparecem sem e-mail, identificados pelo nome exibido.
- Se o plano Google Workspace da conta organizadora não incluir esse histórico, a coleta retorna vazio e a tela informa isso claramente.
