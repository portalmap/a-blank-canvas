# Limpar todos os compromissos da Agenda

## Situação atual

Há 261 compromissos salvos na Agenda, todos na conta victorborges@assessoriamap.com.br:

- 199 vindos do Google
- 62 criados aqui dentro

## O que vou fazer

1. Apagar os 261 compromissos dessa conta (junto com convidados e lembretes ligados a eles).
2. Zerar a marca de sincronização da conta Google, para que a próxima sincronização traga os compromissos do zero, sem duplicar.
3. Nada é apagado no Google — a limpeza é só aqui no MAP Flow.

Depois disso a Agenda abre vazia e você pode conectar/sincronizar novamente.

## Detalhes técnicos

- `DELETE FROM public.calendar_events WHERE user_id = <id de victorborges>` — `calendar_event_guests` e `calendar_event_reminders` têm FK para o evento e são removidos em cascata; se não houver `ON DELETE CASCADE`, apago os filhos antes.
- `UPDATE public.calendar_google_accounts SET sync_token = NULL, last_synced_at = NULL WHERE user_id = <id>`.
- Execução via ferramenta de dados (sem migration, sem mudança de esquema) e sem alterações de código.

## Atenção

A exclusão é definitiva: não há como recuperar os 62 compromissos criados localmente. Os 199 do Google voltam ao sincronizar.
