# Limpeza completa dos módulos Webhooks e API

## Verificação feita (é seguro remover)

- Banco: `api_tokens` 0 registros, `webhook_endpoints` 0, `webhook_deliveries` 0, `webhook_inbox` 0 — nunca foram usados.
- Nenhum job agendado (a extensão pg_cron não está instalada) e nenhum trigger/função do banco chama essas functions.
- `useWebhookTrigger` não é importado por nenhum componente.
- A integração real com Hub/Portal MAP passa por `hub-inbox` + `relay-approval` e por `hub_inbox_processed` — nada disso depende de webhooks ou tokens de API. Esse módulo fica intacto.

Conclusão: a remoção total não altera nenhum funcionamento atual do sistema.

## O que será removido

**UI (Configurações)**
- Abas "Webhooks" e "API" em `src/page-views/Settings.tsx` (triggers, conteúdos e imports).
- Pastas `src/components/settings/webhooks/` e `src/components/settings/api/`.

**Hooks**
- `src/hooks/useWebhooks.ts`, `src/hooks/useApiTokens.ts`, `src/hooks/useWebhookTrigger.ts`.

**Edge functions (código + deploy)**
- `webhook-enqueue`, `webhooks-dispatcher`, `webhooks-inbound`, `api-gateway`, `api-tasks`.
- Remoção das entradas correspondentes em `supabase/config.toml`.

**Banco (migration)**
- `drop table` de `webhook_deliveries`, `webhook_inbox`, `webhook_endpoints`, `api_tokens` (nesta ordem, respeitando as FKs).

**Documentação**
- Ajuste em `docs/INTEGRATIONS.md` marcando a camada API/Webhook como descontinuada, mantendo a documentação do fluxo Hub/Portal atual.

## O que NÃO será tocado

`hub-inbox`, `relay-approval`, `relay_diagnostico_log`, `hub_inbox_processed`, SSO (`sso-exchange`, `session-guard`), notificações e todo o resto de Configurações.

## Critério de aceitação

Configurações abre sem as abas Webhooks e API, o app compila sem imports órfãos, e o recebimento/envio Hub↔Portal continua funcionando.
