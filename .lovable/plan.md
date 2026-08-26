# Disparo automático: tag "enviar aprovação" → MAP Flow envia ao Hub → Portal MAP

## Objetivo

Quando a tag **"enviar aprovação"** (id `78b84f6c-b619-40bd-94f8-c1c2a63842c0`) for ADICIONADA a uma tarefa, o MAP Flow envia `calendario.aprovacao` ao Hub com destino `portal-map`, para o Portal reabrir o post com dados atualizados.

**Não toca em:** SSO, `hub-inbox` (recebimento), fluxo legado `tarefa.listar_para_aprovacao`, tag antiga `enviar cliente`. Tudo fica intacto.

## Confirmações do dicionário

- Lista de itens: MAP Flow envia na chave **`tasks`** (o Hub traduz para `posts`). Confirmado — usarei `tasks`.
- Nome do cliente no raiz: chave **`name`** (o Hub traduz para `cliente_nome`). Confirmado — usarei `name`.
- `tasks.id` vai como `id` do item (o Hub traduz para `mapflow_task_id`, que casa o post existente no Portal).

## Arquitetura do disparo

```text
Usuário marca tag "enviar aprovação" na tarefa (TaskTagsSelector)
        ↓
useAddTaskTag (src/hooks/useTaskTags.ts) — só no onSuccess do insert
        ↓
se tag_id === 78b84f6c-...  →  supabase.functions.invoke("relay-approval-send")
        ↓
Edge Function relay-approval-send (verify_jwt=true, autenticada)
   - busca dados atuais da tarefa no banco
   - gera URLs assinadas dos anexos (bucket task-attachments, 45 dias — mesma validade que o app usa)
   - POST {HUB_RELAY_URL}/api/public/relay  (Bearer HUB_RELAY_TOKEN, timeout 20s)
   - registra em relay_diagnostico_log (direcao "enviado", sem token)
        ↓
Hub traduz e encaminha ao Portal MAP (permissão map-flow → portal-map já existe)
```

Escolhi **frontend (hook de adicionar tag) + Edge Function** em vez de trigger de banco, porque:
- garante que dispara **somente no ato de adicionar a tag** (nunca no carregamento da tela, nunca na remoção);
- reutiliza o padrão já existente no projeto (`relay-test-send` usa as mesmas envs `HUB_RELAY_URL`/`HUB_RELAY_TOKEN`);
- o segredo do Hub nunca chega ao navegador — só a Edge Function o lê.

## Mudanças

### 1. Nova Edge Function `supabase/functions/relay-approval-send/index.ts`

- `verify_jwt = true` (entrada em `supabase/config.toml`) — exige usuário autenticado.
- Input: `{ task_id, tag_id }`.
- Se `tag_id !== 78b84f6c-b619-40bd-94f8-c1c2a63842c0` → responde `{ skipped: true }` (proteção extra).
- **Deduplicação (anti duplo-disparo):** consulta `relay_diagnostico_log` por mesmo `task_id` (em `payload->>task_id`) + assunto `calendario.aprovacao` no **mesmo minuto**; se existir, retorna `{ skipped: "duplicado" }` sem chamar o Hub. Remover e readicionar a tag depois é um envio novo e intencional — passa normalmente.
- **Busca no momento do disparo:** task completa (`id, title, description, social_channel, format, due_date, workspace_id, list_id`); resolve nome do cliente: `spaces.client_name` com fallback para `spaces.name` (via `lists.space_id`) — mesma fonte que o recebimento usa; fallback final `workspaces.name`.
- **Anexos:** lê `task_attachments` da tarefa; para cada um, extrai o path e gera signed URL em `task-attachments` (45 dias, como `useTaskAttachments.ts` já faz). Se um anexo falhar, ele é pulado e os demais seguem — o envio não quebra. Sem anexos → lista vazia.
- **POST ao Hub** (`AbortSignal.timeout(20000)`):

```json
{
  "destinos": ["portal-map"],
  "assunto": "calendario.aprovacao",
  "modo": "entrega",
  "referencia_origem": "<tasks.id>",
  "payload": {
    "name": "<nome do cliente>",
    "tasks": [
      {
        "id": "<tasks.id>",
        "title": "<tasks.title>",
        "description": "<tasks.description>",
        "social_channel": "<tasks.social_channel>",
        "format": "<tasks.format>",
        "due_date": "<tasks.due_date>",
        "attachments": [{ "file_name": "...", "file_url": "<signed url>" }]
      }
    ]
  }
}
```

- **Log:** insert em `relay_diagnostico_log` com `direcao: "enviado"`, `destino: "portal-map"`, `assunto: "calendario.aprovacao"`, `modo: "entrega"`, payload e `status_code` da resposta do Hub. Token nunca é logado nem retornado.
- **Erro do Hub:** retorna `{ success: false, hub_status }` — a tarefa não sofre nenhuma alteração (a tag permanece marcada; nada inconsistente).

### 2. Frontend: gatilho em `src/hooks/useTaskTags.ts`

- No `onSuccess` de `useAddTaskTag`: busca o nome/id da tag adicionada; se for a tag "enviar aprovação" (comparação por **id**, imune a acento/caixa), chama `supabase.functions.invoke("relay-approval-send", { body: { task_id, tag_id } })`.
- Falha no envio → `toast` destrutivo "Falha ao reenviar para aprovação" (a tag continua marcada; usuário pode remover e readicionar para reenviar).
- Nada dispara em `useTaskTagRelations` (leitura) nem em `useRemoveTaskTag`.

### 3. Configuração

- Adicionar `[functions.relay-approval-send] verify_jwt = true` em `supabase/config.toml`.
- Deploy da nova função. As envs `HUB_RELAY_URL` e `HUB_RELAY_TOKEN` já existem no projeto (usadas por `relay-test-send`).

## Fora do escopo (fica como está)

- `hub-inbox` e o recebimento (`calendario.post.aprovado/reprovado`, `tarefa.listar_para_aprovacao`) — intactos.
- SSO — intacto.
- Tag antiga `enviar cliente` — mantida; limpeza é passo posterior.

## Validação

1. Deploy da função e chamada de teste com a tarefa de teste existente ("TESTE RELAY — Post carrossel").
2. Conferir `relay_diagnostico_log`: registro `enviado` com `hub_status` 200.
3. Marcar a tag na interface e confirmar: um único disparo, toast em caso de erro, e sem disparo ao apenas abrir a tarefa.
