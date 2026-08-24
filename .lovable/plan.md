# Receber o nome do cliente e resolver para o código interno

O Social Flow (via Hub) envia o **nome do cliente** em texto. O MAP Flow precisa transformar esse nome no **código interno** (UUID do Space do cliente e da lista de destino) sem mudar nada na forma de trabalhar: nenhuma tela nova, nenhuma coluna nova, nenhuma renomeação de Space, pasta ou lista.

## Situação atual (verificada no banco)

- Existe **um único workspace**: "Operacional MAP".
- Cada cliente é um **Space** com o padrão `MAP | <Cliente>` (ex.: `MAP | Accerth`, `MAP | Zomata Seguros`) — 26 spaces hoje.
- Dentro de cada Space: pasta `Tarefas & Demandas | <Cliente>` e lista `Plan. de Criativos | <Cliente>`.
- O recebimento atual de `calendario.publicar` procura o cliente em `workspaces.name` e depois uma pasta chamada exatamente "Tarefas & Demandas" e lista "Plan. de Criativos". Como os nomes reais têm o sufixo `| Cliente` e o cliente é Space (não workspace), essa resolução não encontra o destino.

## O que muda

Trocar a etapa de identificação do cliente por uma resolução em três passos, tolerante ao texto que chega:

1. **Nome → Space**: compara o nome recebido com os Spaces do workspace, ignorando maiúsculas, acentos, pontuação, espaços extras e o prefixo `MAP |`. "accerth", "Accerth", "MAP | Accerth" e "MAP  |  Accérth" chegam todos no mesmo Space.
2. **Space → pasta**: dentro do Space, a pasta cujo nome começa com "Tarefas & Demandas" (o sufixo `| Cliente` é ignorado).
3. **Pasta → lista**: a lista cujo nome começa com "Plan. de Criativos". É aí que os posts entram.

Depois disso, o fluxo já existente continua igual: idempotência por `external_post_ref`, status derivado do canal, anexos, e resposta com os códigos.

## Erros claros, nada criado por engano

Se o nome não casar com nenhum Space, ou casar com mais de um, ou faltar a pasta/lista esperada, a requisição é recusada com um erro explícito informando o nome recebido e os nomes disponíveis. O MAP Flow **não cria** Space, pasta nem lista automaticamente.

## Resposta ao Social Flow

A resposta passa a devolver o código resolvido, para o Social Flow poder guardar o par:

- `cliente`: `{ nome_recebido, space_id, space_name }`
- `workspace_id`, `list_id`, `list_name`
- `resultados`: por post, `external_post_ref` + `task_id` + `criada`/`ja_existia`

## Detalhes técnicos

- Arquivo único alterado: `supabase/functions/hub-inbox/index.ts`, apenas dentro de `handleCalendarioPublicar` e seus helpers (`resolverListaDestino`). Os assuntos `diagnostico.ping` e `tarefa.listar_para_aprovacao` ficam intocados.
- Nova função `resolverCliente(admin, nomeRecebido)`: lê `spaces` filtrando `workspace_id`, normaliza (NFD sem diacríticos, minúsculo, pontuação → espaço, remove prefixo `map`), e retorna `{ space_id, space_name, workspace_id }` ou erro `cliente_nao_encontrado` / `cliente_ambiguo`.
- `resolverListaDestino` passa a receber `space_id` e usar `startsWith` normalizado para pasta ("tarefas demandas") e lista ("plan de criativos"), em vez de igualdade exata contra o workspace inteiro.
- `resolverAutor` passa a usar o `created_by_user_id` do workspace do Space, com fallback para o `global_owner` (comportamento atual).
- Sem migration, sem mudança de RLS/grants, sem alteração de tela.
- Validação: chamada de teste ao endpoint com `cliente_chave: "Accerth"` conferindo que a tarefa cai em `Plan. de Criativos | Accerth`, e um segundo envio do mesmo `external_post_ref` retornando `ja_existia`.
