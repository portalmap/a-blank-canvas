# Central de Notificações (sino + modal de lembrete)

## O que será construído

### 1. Sino no topo direito
- Uma faixa fina no topo de todas as páginas autenticadas, alinhada à direita, ficando **acima** dos botões de cada tela (ex: "Atribuição Automática") e no ponto mais à direita possível.
- Ícone de sino com contador de não lidas (badge). Ao clicar, abre um painel com as notificações mais recentes.
- Na lista: não lidas destacadas (fundo sutil + ponto), lidas em tom neutro. Cada item mostra título, mensagem, data/hora e "há quanto tempo".
- Clicar no item: marca como lido e navega para o destino (tarefa, comentário, chat, feed, space).
- Botões: "Marcar todas como lidas" e um marcador individual de lido/não lido em cada item.

### 2. Modal central de notificações não lidas
- Abre automaticamente ao autenticar e a cada 30 minutos; não há como desativar esse intervalo.
- Lista as não lidas da mais recente para a mais antiga, com data/hora e o tempo acumulado que a notificação está sendo ignorada.
- Clicar em uma notificação: marca como lida e navega para o destino. Ao voltar/navegar para outra página, o modal reabre (a menos que o usuário tenha adiado).
- Botão **Adiar**: fecha o modal e ele só volta após 30 minutos.
- Botão **Marcar todas como lidas**: encerra as não lidas e o modal deixa de abrir até surgir nova notificação não lida — voltando então ao ciclo de 30 minutos.
- Também é possível marcar como lido apenas alguns itens, mantendo os demais pendentes.
- Sem X/cancelar que burle a regra: só "Adiar" ou marcar como lido fecham o modal.

### 3. Persistir todos os eventos
Os eventos que hoje aparecem apenas como aviso temporário passam a ser gravados como notificações reais: tarefa atribuída, comentário atribuído (tarefa e chat), tarefa atrasada, tarefa vence amanhã, novo post no feed e mudança de acesso a Space. Cada um com link para o local correto.

## Detalhes técnicos

Módulo isolado em `src/components/notifications/` + `src/hooks/`, sem alterar módulos existentes além dos pontos de montagem:

- `src/hooks/useNotifications.ts`: adicionar `useMarkNotificationAsUnread`, filtro por workspace e realtime (`postgres_changes` em `notifications` filtrado por `user_id`) invalidando as queries de lista/contagem.
- `src/components/notifications/NotificationBell.tsx`: `Popover` + `ScrollArea` com a lista, badge de contagem, ações de leitura.
- `src/components/notifications/NotificationItem.tsx`: item compartilhado entre sino e modal; ícone por `type`, data/hora formatada (`date-fns` `format` + `formatDistanceToNow`, locale pt-BR) e navegação via `link` (fallback derivado de `reference_type`/`reference_id`).
- `src/components/notifications/NotificationReminderModal.tsx`: `Dialog` sem botão de fechar (`onInteractOutside`/`onEscapeKeyDown` bloqueados), abre quando existirem não lidas e o "adiar" estiver expirado.
- `src/components/notifications/NotificationReminderProvider.tsx`: controla o agendamento — timer de 30 min, timestamp de "adiar" em `localStorage` por usuário (`notif_snooze_<userId>`), reabertura em mudança de rota (via `useLocation`) e ao autenticar.
- `src/components/TopBar.tsx`: faixa fina alinhada à direita com o sino (e o botão de tema no desktop); montada em `src/routes/_authenticated/route.tsx` acima do `<Outlet />`. `MobileHeader` recebe o sino também.
- `src/components/notifications/NotificationListener.tsx`: além do toast, faz `insert` na tabela `notifications` (com deduplicação via as chaves de `localStorage` já usadas) para os eventos de atribuição, atraso, vencimento, feed e permissão de Space.
- Sem mudança de schema: `notifications` já possui `type`, `title`, `message`, `link`, `reference_type`, `reference_id`, `is_read`, `created_at`. As políticas existentes de SELECT/UPDATE por `user_id` cobrem leitura/marcação; verificarei a política de INSERT antes de gravar eventos para outro usuário e ajustarei por migration apenas se necessário.
