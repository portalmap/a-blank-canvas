# Campo do cliente no Space + recebimento pelo nome

O Social Flow (via Hub) envia o **nome do cliente** em texto. O MAP Flow precisa transformar esse nome no **código interno** (ID do Space e da lista de destino) sem mudar a forma de trabalhar: nenhuma tela nova, nenhuma renomeação de Space, pasta ou lista.

## Situação atual (verificada no banco)

- Existe **um único workspace**: "Operacional MAP".
- Cada cliente é um **Space** com o padrão `MAP | <Cliente>` (ex.: `MAP | Accerth`, `MAP | Zomata Seguros`) — 26 spaces hoje.
- Dentro de cada Space: pasta `Tarefas & Demandas | <Cliente>` e lista `Plan. de Criativos | <Cliente>`.
- A tabela `spaces` tem hoje: `name`, `description`, `color`, `status_source`, `status_template_id`, `archived_at`, `account_user_id`. **Não existe** nenhum campo com o nome do cliente separado — só o `name` visual com o prefixo `MAP |`.

## 1. Campo novo: `spaces.client_name`

Uma coluna nova, opcional, que passa a ser a **chave oficial de recebimento**:

| Campo | O que guarda | Tipo | Obrigatório |
|---|---|---|---|
| `client_name` | Nome do cliente como o Social Flow o envia (ex.: `Accerth`) | texto | opcional |

- Preenchida automaticamente na migration para os 26 spaces existentes, a partir do `name` sem o prefixo `MAP | ` (`MAP \| Accerth` → `Accerth`).
- Índice único sobre a versão normalizada (minúsculo, sem acento) por workspace, para nunca haver dois spaces disputando o mesmo nome de cliente.
- Nada visual muda: `spaces.name` continua exatamente como está e a interface segue usando ele.

## 2. Recebimento: nome → ID

O assunto `calendario.publicar` passa a resolver em três passos:

1. **Nome → Space**: casa o nome recebido com `spaces.client_name` (comparação sem maiúsculas, acentos, pontuação ou espaços extras). Como reserva, se nenhum `client_name` casar, tenta o `spaces.name` ignorando o prefixo `MAP |` — assim um space criado sem o campo preenchido ainda funciona.
2. **Space → pasta**: a pasta do Space cujo nome começa com "Tarefas & Demandas" (o sufixo `| Cliente` é ignorado).
3. **Pasta → lista**: a lista cujo nome começa com "Plan. de Criativos". É aí que os posts entram.

Depois disso o fluxo existente segue igual: idempotência por `external_post_ref`, status derivado do canal, anexos e resposta com os códigos.

## 3. Erros claros, nada criado por engano

Se o nome não casar com nenhum Space, casar com mais de um, ou faltar a pasta/lista esperada, a requisição é recusada com erro explícito informando o nome recebido e os nomes disponíveis. O MAP Flow **não cria** Space, pasta nem lista automaticamente.

## 4. Resposta ao Social Flow

- `cliente`: `{ nome_recebido, client_name, space_id, space_name }`
- `workspace_id`, `list_id`, `list_name`
- `resultados`: por post, `external_post_ref` + `task_id` + `criada`/`ja_existia`

## Detalhes técnicos

- Migration: `ALTER TABLE public.spaces ADD COLUMN client_name text;` + `UPDATE` de backfill removendo o prefixo `MAP | ` + `CREATE UNIQUE INDEX ... ON public.spaces (workspace_id, lower(unaccent-equivalente(client_name))) WHERE client_name IS NOT NULL` (normalização feita com `lower(translate(...))` imutável, sem depender de extensão). Sem mudança de RLS/grants — políticas de `spaces` já cobrem a coluna nova.
- Código: apenas `supabase/functions/hub-inbox/index.ts`, dentro de `handleCalendarioPublicar` e `resolverListaDestino`. Os assuntos `diagnostico.ping` e `tarefa.listar_para_aprovacao` ficam intocados.
- Nova função `resolverCliente(admin, nomeRecebido)`: lê `spaces` (id, name, client_name, workspace_id), normaliza e retorna o space ou erro `cliente_nao_encontrado` / `cliente_ambiguo`.
- `resolverListaDestino` passa a receber `space_id` e a usar comparação por prefixo normalizado para pasta e lista.
- `src/integrations/supabase/types.ts` é regenerado após a migration.
- Validação: envio de teste com `cliente_chave: "Accerth"` conferindo que a tarefa cai em `Plan. de Criativos | Accerth`, e reenvio do mesmo `external_post_ref` retornando `ja_existia`.

## Fora do escopo

Campo de cliente editável na interface do Space (dá para adicionar depois, no diálogo de edição do Space) e exibição de formato/rede social na tarefa.
