# Head de Projetos e Head de Account nos Spaces

Adicionar dois responsáveis por space, no mesmo padrão do Account já existente, cada um com sua própria regra de produtividade.

## 1. Novos campos no Space

Na tabela de spaces, dois campos novos ao lado do Account:

- Head de Projetos
- Head de Account

Na página do space, o card "Account" passa a ter três seletores (Account, Head de Projetos, Head de Account), cada um com "Nenhum" como opção e a lista de membros do workspace — mesma aparência e comportamento do seletor atual.

## 2. Regra do Head de Projetos

A produtividade dele é a **média da produtividade individual da equipe** dos spaces onde ele é Head de Projetos.

- Equipe = usuários que tiveram tarefas atribuídas nesses spaces no período.
- A produtividade de cada usuário usa exatamente a regra individual já vigente (histórico de atribuição, considerando apenas a última transferência de cada usuário por tarefa, com os limiares de antecipação/atraso do workspace).
- Nota do Head = média simples das notas dos usuários da equipe.
- O relatório também devolve a lista de usuários com nota individual, para poder detalhar.

## 3. Regra do Head de Account

A produtividade dele é a **média das notas de Account** dos spaces sob a responsabilidade dele:

- Spaces onde ele é Head de Account, e
- Spaces onde ele é Head de Account mas que não têm Account definido — nesses casos a nota de Account do space é calculada do mesmo jeito (regra de Account por prazo de conclusão) e entra na média igualmente.
- Nota do Head de Account = média simples das notas por space.
- O relatório devolve também a nota space por space.

## 4. Exibição

Nenhum card novo agora. Os cálculos ficam disponíveis como funções de relatório + hooks prontos, para serem plugados nos Painéis depois, quando você definir o formato do relatório.

## Detalhes técnicos

- Migration: `ALTER TABLE public.spaces ADD COLUMN head_projetos_user_id uuid, ADD COLUMN head_account_user_id uuid` (FK para `profiles`, `ON DELETE SET NULL`, igual ao `account_user_id`). Sem mudança de RLS — as políticas de space já cobrem.
- Nova RPC `get_head_projetos_productivity_report(p_workspace_id, p_head_user_id, p_start_date, p_end_date, p_early_threshold, p_on_time_threshold)`: reaproveita a lógica de `get_productivity_stats` por usuário, filtrando tarefas cujas listas pertencem a spaces com `head_projetos_user_id = p_head_user_id`; retorna `{ users: [...], avgScore, spaces: [...] }`.
- Nova RPC `get_head_account_productivity_report(...)`: reaproveita a lógica de `get_account_productivity_report` por space, filtrando `head_account_user_id = p_head_user_id`, calculando a nota do space mesmo quando `account_user_id` é nulo; retorna `{ spaces: [...], avgScore }`.
- Ambas `security definer`, `set search_path = public`, escopadas ao workspace do chamador.
- Hooks novos `useHeadProjetosProductivity.ts` e `useHeadAccountProductivity.ts`, espelhando `useAccountProductivity.ts` (mesmo padrão de queryKey e uso de `useProductivitySettings`).
- `useSpaces.ts`: `useUpdateSpace` e `useCreateSpace` aceitam `headProjetosUserId` e `headAccountUserId` de forma opcional, sem alterar o comportamento atual.
- `SpaceDetailView.tsx`: extrai o seletor de responsável em um subcomponente local reutilizado três vezes, mantendo o módulo de produtividade intocado.
