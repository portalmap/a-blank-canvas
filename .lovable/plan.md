# Agenda: reuniões que me convidaram, eventos de outras pessoas e tarefas

Hoje a Agenda mostra só o que eu criei e o que o Google traz da minha agenda principal. Vamos ampliar em três frentes, cada uma isolada, sem mexer nos outros módulos.

## 1. Reuniões do Google em que fui convidado

- Passar a ler **todas as agendas** que a conta conectada tem acesso (a principal e as compartilhadas/convites), e não apenas a principal.
- Cada reunião importada guarda de qual agenda veio e o seu status de participação (aceito, pendente, recusado), exibido no evento.
- A criação/edição de eventos feita aqui continua indo apenas para a agenda principal — não alteramos reuniões de terceiros.
- Ao desconectar, segue a regra atual: futuro importado sai, histórico fica.

## 2. Convites feitos dentro do MAP Flow

- Convidado passa a ser sempre gravado com **e-mail + nome simples**, garantindo o casamento com o Google.
- Convite por e-mail é vinculado automaticamente ao usuário do sistema com aquele e-mail (agora e também quando ele entrar depois).
- O evento aparece na agenda de quem foi convidado, com botão de aceitar/recusar, e o lembrete também é criado para o convidado.

## 3. Tarefas na Agenda

- Uma camada de leitura mostra na Agenda as tarefas com data, nos casos: sou responsável, eu criei, eu sigo/fui mencionado, ou fui convidado/adicionado nela.
- Visual diferente dos compromissos (marcador próprio) e clique abre a tarefa. Um botão "Mostrar tarefas" liga/desliga essa camada.
- Tarefas não são copiadas para a agenda nem enviadas ao Google — é só exibição.

## Detalhes técnicos

- `googleCalendarSync.server.ts`: percorrer `calendarList`, puxar eventos de cada agenda, gravar `google_calendar_id` e `response_status` do participante; push continua no `primary`.
- Tokens de sincronização por agenda: nova coluna `sync_tokens jsonb` em `calendar_google_accounts` (mantendo `sync_token` para a principal), com fallback para janela -30/+180 dias.
- `calendar_event_guests`: normalizar e-mail no insert e resolver `user_id` via `profiles` (função security definer para vincular e-mails a usuários); nova policy de SELECT em `calendar_events` permitindo convidado por e-mail; helper `user_is_calendar_event_guest` estendido.
- Lembretes: ao inserir convidado com `user_id`, criar linha em `calendar_event_reminders` para ele.
- Novo hook `useAgendaTasks` (consulta em `tasks` + `task_assignees` + `task_followers`, respeitando RLS) e renderização nas views Mês/Semana/Dia como itens somente leitura.
