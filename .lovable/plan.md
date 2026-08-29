# Diagnóstico — nomes de campo no envio de `calendario.aprovacao` (nada alterado)

## Correção da premissa

O envio **não** usa nomes canônicos. O código atual de `src/lib/relay-approval.server.ts` monta o payload com os nomes **locais** do MAP Flow. Uma busca por `cliente_nome`, `cliente_chave`, `posts`, `titulo`, `descricao`, `canal`, `data_publicacao`, `formato` e `tarefa_id` nesse arquivo (e no wrapper `relay-approval.functions.ts`) retorna **zero** ocorrências.

Payload que está no código hoje:

```text
payload: {
  name: <nome do cliente>,
  tasks: [
    {
      id, title, description, social_channel, format, due_date, attachments
    }
  ]
}
```

Envelope: `destinos: ["portal-map"]`, `assunto: "calendario.aprovacao"`, `modo: "entrega"`, `referencia_origem: <tasks.id>`.

## 1. Por que nomes locais aqui

Foi decisão deliberada e documentada. O plano aprovado desse disparo (`.lovable/plan/disparo-automático-tag-enviar-aprovação-map-flow-envia-ao-hu-2026-08-26.md`) registra na seção "Confirmações do dicionário":

- lista de itens vai na chave `tasks` — **o Hub traduz para `posts`**;
- nome do cliente vai em `name` — **o Hub traduz para `cliente_nome`**;
- `tasks.id` vai como `id` — **o Hub traduz para `mapflow_task_id`**, que é o campo que casa o post existente no Portal.

Ou seja: a tradução para o vocabulário canônico é responsabilidade do **Hub**, não do remetente. O MAP Flow fala o próprio dialeto em todos os pontos — envio, recebimento e resposta.

## 2. Deliberado, cópia ou engano

Deliberado. Os nomes locais foram escolhidos após conferir o dicionário de tradução do Hub para o par `map-flow → portal-map`, e o plano lista explicitamente cada equivalência antes da implementação. Não é cópia de outro trecho nem engano.

## 3. O que existe no código explicando

No `relay-approval.server.ts` há comentários sobre o gatilho, o segredo do Hub, deduplicação, resolução do nome do cliente e TTL da URL assinada — mas **nenhum** comentário registrando "aqui usamos nomes locais porque o Hub traduz". Essa justificativa está apenas no arquivo de plano arquivado citado acima.

## Ponto que continua divergente (não é o que a pergunta descreve)

A única inconsistência real de nomes nesse fluxo é nos **anexos**:

- envio ativo (`calendario.aprovacao`): `file_url` + `file_name`;
- resposta de consulta (`tarefa.listar_para_aprovacao`): `url` + `title`.

Nada foi alterado — apenas diagnóstico.
