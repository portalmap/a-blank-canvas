# Módulo Agenda (com integração Google)

Novo módulo independente, dentro da categoria **Trabalho** da barra lateral, mais uma aba **Integrações** em Configurações.

## 1. Agenda (uso local, sem depender do Google)

- Nova página `/agenda` no menu Trabalho (ícone de calendário).
- Cada pessoa vê apenas a sua própria agenda.
- Visões: Mês, Semana e Dia, com botão "Hoje" e navegação.
- Criar/editar/excluir compromisso: título, descrição, local, dia/hora de início e fim, opção "dia inteiro", cor e lembrete (15 min / 1 h / 1 dia antes).
- Convidados:
  - Pessoas do sistema: busca por nome, aparecem como convidados e recebem notificação no sino/ticker já existente, podendo aceitar ou recusar.
  - E-mails externos (qualquer domínio): entram como convidados e recebem um convite por e-mail com os dados do compromisso e um anexo de calendário (.ics) que funciona em Google, Outlook e Apple.
- Lembretes disparam notificação dentro do sistema, no mesmo padrão das notificações atuais.
- O módulo não altera tarefas, spaces ou chat: tabelas e telas próprias.

## 2. Integração com o Google Agenda (espelho nos dois sentidos)

- Botão discreto no canto superior direito da Agenda:
  - Quem não integrou vê "Conectar Google" (texto pequeno, sem destaque).
  - Quem já integrou vê apenas "Reconectar". Sem opção de desconectar aqui.
- Cada pessoa conecta a sua própria conta Google, com consentimento próprio.
- Espelho nos dois sentidos:
  - Compromisso criado/editado/excluído aqui vira evento no Google (com os convidados, então o próprio Google envia os convites).
  - Eventos criados ou alterados no Google aparecem e se atualizam aqui.
- Atualização automática em segundo plano: uma rotina roda de poucos em poucos minutos e sincroniza as contas conectadas, sem a pessoa precisar abrir a tela. Também há sincronização ao abrir a agenda e um botão de atualizar.
- Conflitos: a versão mais recente ganha; o vínculo é feito por identificador do evento, para não duplicar.

## 3. Configurações > Integrações (só proprietário/admin global)

- Nova aba **Integrações** com cards das ferramentas (começando pelo Google Agenda; o card fica pronto para receber outras).
- Ao clicar no card Google: lista de todos os usuários com conta conectada, mostrando e-mail Google, status **online** (conexão válida) ou **offline** (precisa reconectar), data da última sincronização e último erro, se houver.
- Nessa tela existe o botão **Desconectar** por usuário.
- A aba não aparece para quem não é proprietário/admin global.

## 4. O que preciso de você

- **Envio de e-mail para convidados externos**: hoje o sistema não tem serviço de envio próprio. Vou pedir a chave de um serviço de envio (Resend) e você precisa ter um domínio verificado (ex.: `agenda@assessoriamap.com.br`). Enquanto isso não existir, o convite fica registrado e reenviável, sem sair o e-mail.
- **Cliente OAuth do Google**: ainda não existe um configurado neste workspace. Vou abrir o cartão de configuração para você criar/autorizar o cliente Google (é uma vez só, depois cada usuário conecta a própria conta).

## Detalhes técnicos

- Tabelas novas (Supabase, todas com RLS por usuário): `calendar_events`, `calendar_event_guests`, `calendar_event_reminders`, `calendar_google_accounts` (status, e-mail Google, sync token, último erro), `app_user_connections` (chave de conexão criptografada, acesso só service_role).
- Integração via App User Connector `google_calendar` (per-user OAuth pelo gateway da Lovable), scopes `calendar` + `calendar.events` + `userinfo.email`. Chave de conexão guardada cifrada com `APP_USER_CONNECTION_KEY_SECRET`.
- Server functions em `src/lib/agenda.functions.ts` e `src/lib/google-calendar.functions.ts` (TanStack `createServerFn` com `requireSupabaseAuth`); helpers server-only em `*.server.ts`.
- Sync incremental com `syncToken` do Google (`events.list`), push de saída em `events.insert/patch/delete`; rotina em segundo plano via `pg_cron` chamando uma rota `src/routes/api/public/agenda/sync.ts` protegida por segredo compartilhado.
- Notificações reutilizam a tabela `notifications` existente (novos `type`: `calendar_invite`, `calendar_reminder`), sem alterar o módulo de notificações.
- Rotas: `src/routes/_authenticated/agenda.tsx`; UI em `src/page-views/Agenda.tsx` + `src/components/agenda/*`; aba em `src/page-views/Settings.tsx` + `src/components/settings/integrations/*`.
- Envio de e-mail externo em `src/lib/agenda-email.server.ts` (Resend + anexo .ics gerado no servidor).

## Ordem de execução

1. Banco de dados (tabelas, RLS, grants) e módulo Agenda local completo com notificações.
2. Convites por e-mail externo (após a chave do Resend).
3. Conexão Google por usuário + espelho nos dois sentidos + rotina automática.
4. Configurações > Integrações com o card Google e o desconectar.
