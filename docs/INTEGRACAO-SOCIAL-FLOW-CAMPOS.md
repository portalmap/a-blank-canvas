# Integração Social Flow → MAP Flow — Mapa de campos

Documento de referência dos dados que trafegam quando o Social Flow finaliza a geração de conteúdo e envia os posts (calendário) para o MAP Flow tratar.

O **nome do cliente/empresa** é representado localmente por `workspaces.name`: cada cliente é um workspace no MAP Flow. O Social Flow envia o nome do cliente e o MAP Flow resolve o workspace correspondente por esse nome.

## Entrada (por post recebido)

| Nome local | O que é | Tipo | Obrig. |
|---|---|---|---|
| `workspaces.name` | Nome do cliente/empresa; identifica em qual workspace a tarefa entra | texto | obrigatório |
| `tasks.title` | Título do post; vira o nome da tarefa | texto | obrigatório |
| `tasks.description` | Descrição/legenda do post | texto | opcional |
| `tasks.format` | Formato do conteúdo (carrossel, reels, story, feed) | texto | opcional |
| `tasks.social_channel` | Rede social de destino (instagram, linkedin, tiktok) | texto | opcional |
| `tasks.external_post_ref` | ID do post no Social Flow, usado para não duplicar em reenvio | texto | recomendado |
| `tasks.due_date` | Data prevista de publicação do post | data | opcional |
| `tasks.list_id` | Lista (calendário) onde a tarefa é criada | UUID | obrigatório |
| `tasks.status_id` | Status inicial da tarefa | UUID | opcional (usa o padrão da lista) |
| `tasks.priority` | Prioridade da tarefa | texto | opcional |
| `task_attachments` (`file_name`, `file_path`, `file_type`) | Arquivos/criativos do post; lista de itens repetidos | lista | opcional |
| `task_tags` / `task_tag_relations` | Marcações extras (ex.: campanha, etapa) | lista | opcional |

## Saída (resposta ao Social Flow)

| Nome local | O que é | Tipo | Obrig. |
|---|---|---|---|
| `tasks.id` | Código interno da tarefa criada | UUID | obrigatório |
| `tasks.external_post_ref` | Eco do ID do post, para o Social Flow casar o par | texto | obrigatório |
| `workspaces.id` / `workspaces.name` | Workspace (cliente) onde a tarefa entrou | UUID / texto | opcional |
| não é campo de banco, é gerado | Indicador `created` vs `already_exists` (idempotência) | booleano/texto | opcional |
| `lists.name`, `spaces.name` | Onde a tarefa caiu (contexto para o Social Flow) | texto | opcional |

## Observações

- **Resolução do cliente**: o nome recebido é buscado em `workspaces.name`, com comparação sem diferenciar maiúsculas/minúsculas nem acentos. Se nenhum workspace corresponder, o post é rejeitado com erro claro — o MAP Flow não cria workspace novo automaticamente.
- **Idempotência**: garantida pelo índice único parcial em (`workspace_id`, `external_post_ref`) na tabela `tasks`. Reenvio do mesmo post no mesmo workspace não gera tarefa duplicada.
- **Anexos**: ao serem lidos, são devolvidos como URL assinada (`https://...`), nunca como caminho interno de bucket.

## Fora do escopo deste documento

Criação do endpoint de recebimento, exibição de formato/rede social na interface e qualquer migration de banco.
