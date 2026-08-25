# Enviar tarefa para aprovação via Hub ao marcar tag

## Diagnóstico corrigido

O fluxo correto não é o Portal consultar diretamente o MAP Flow como origem principal da ação.

O fluxo desejado é:

```text
Usuário marca a tag "enviar aprovação" na tarefa
        ↓
MAP Flow detecta a marcação da tag
        ↓
MAP Flow envia um envelope para o Hub
        ↓
Hub encaminha para o Portal MAP
        ↓
Portal MAP exibe o post novamente para aprovação do cliente
```

## Estado atual confirmado

- Existem duas tags no workspace Operacional MAP:
  - `enviar aprovação` — id `78b84f6c-b619-40bd-94f8-c1c2a63842c0`
  - `enviar cliente` — id `d4f8592e-66dc-4b5b-b5c2-858571a031e5`
- A `hub-inbox` atual ainda contém um fluxo de consulta para `tarefa.listar_para_aprovacao`, que filtra pela tag antiga `enviar cliente`.
- Não há automação ativa hoje para tag adicionada (`on_tag_added`).
- Não há endpoint cadastrado em `webhook_endpoints`; portanto, o dispatcher genérico de webhooks não está sendo usado para enviar isso ao Portal.
- Já existe exemplo de envio MAP Flow → Hub → Portal em `relay-test-send`, usando `HUB_RELAY_URL`, `HUB_RELAY_TOKEN`, `destinos: ["portal-map"]` e assunto enviado ao Hub.

## Mudança proposta

Criar um fluxo específico de saída para aprovação, acionado quando a tag `enviar aprovação` for adicionada à tarefa.

### 1. Backend: função de envio para o Hub

Criar uma Edge Function dedicada, por exemplo `relay-approval-send`, que:

- Recebe `task_id` e `tag_id`.
- Valida que a tag adicionada é exatamente `enviar aprovação`.
- Busca os dados completos da tarefa:
  - `tasks.id`
  - título
  - descrição
  - cliente/space
  - lista
  - workspace
  - `external_post_ref`
  - `social_channel`
  - `format`
  - prazo/data
  - anexos em `task_attachments`
- Gera URLs assinadas para os anexos no bucket `task-attachments`.
- Monta o envelope para o Hub com destino `portal-map`.
- Envia para o Hub usando `HUB_RELAY_URL` e `HUB_RELAY_TOKEN`.
- Registra log em `relay_diagnostico_log` ou estrutura equivalente já existente, sem expor segredo.

Envelope sugerido:

```json
{
  "destinos": ["portal-map"],
  "assunto": "calendario.post.enviar_aprovacao",
  "modo": "entrega",
  "referencia_origem": "<tasks.id>",
  "payload": {
    "task_id": "<tasks.id>",
    "external_post_ref": "<tasks.external_post_ref>",
    "cliente_nome": "<spaces.client_name ou spaces.name>",
    "titulo": "<tasks.title>",
    "descricao": "<tasks.description>",
    "social_channel": "<tasks.social_channel>",
    "format": "<tasks.format>",
    "due_date": "<tasks.due_date>",
    "attachments": []
  }
}
```

### 2. Frontend: disparar ao marcar a tag

Ajustar o fluxo em `useTaskTags.ts`:

- Quando uma tag for adicionada, além das automações atuais, verificar se o nome da tag é `enviar aprovação`.
- Se for, chamar a Edge Function `relay-approval-send`.
- Não disparar no carregamento da tela, só no ato de adicionar a tag.
- Não disparar quando a tag for removida.

### 3. Idempotência

Evitar reenvio duplicado por acidente:

- Se a mesma tarefa receber a tag novamente após remoção e adição, considerar isso um novo envio intencional.
- Se houver clique duplo/retry no mesmo momento, deduplicar usando janela curta ou registro em `hub_inbox_processed`/log equivalente com `task_id + assunto + minuto`.

### 4. Compatibilidade com o fluxo antigo

Manter `tarefa.listar_para_aprovacao` por enquanto para não quebrar o Portal caso ele ainda consulte esse assunto.

Ajustar a tag do fluxo antigo para `enviar aprovação`, assim os dois caminhos ficam coerentes durante a transição:

- novo caminho ativo: MAP Flow envia ao Hub quando marca a tag;
- caminho legado: Portal/Hub ainda consegue consultar tarefas marcadas, se necessário.

### 5. Banco de dados

Não precisa migration estrutural.

Usar `run_sql` apenas se for necessário consolidar tags:

- Se a tag `enviar aprovação` já existe, ela deve ser usada como referência oficial.
- Não apagar `enviar cliente` automaticamente sem revisar se há tarefas ainda marcadas nela.
- Opcionalmente migrar relações antigas de `enviar cliente` para `enviar aprovação`, preservando `task_tag_relations`.

## Validação

1. Marcar a tag `enviar aprovação` em uma tarefa de teste.
2. Confirmar que a chamada ao Hub foi feita com `destinos: ["portal-map"]`.
3. Confirmar log de saída no banco.
4. Confirmar que os anexos saem como URLs assinadas.
5. Confirmar que o Portal MAP recebe o assunto `calendario.post.enviar_aprovacao` e consegue exibir o post para aprovação.
