# Corrigir a sincronização automática dos status

## O que foi verificado no banco

Hoje 43 listas estão marcadas como "Sincronizado" mas **perderam o vínculo** com o modelo:

| Modelo | Listas sincronizadas | Etapas ligadas ao modelo |
| --- | --- | --- |
| Básico | 7 | 28 de 29 |
| Tech | 12 | 60 de 60 |
| Plan. Social Media | 15 | 75 de 75 |
| Design/Edição de Vídeo | 15 | **0 de 78** |
| Tráfego Pago | 18 | **0 de 80** |
| Plan. de Criativos | 13 | **0 de 156** |

Sem vínculo, o sistema não sabe qual etapa da lista corresponde a qual etapa do modelo. Consequências já visíveis nos dados:

- Nas 15 listas de "Design/Edição de Vídeo" existe a etapa "A Fazer" **duplicada** (30 etapas para 15 listas). O mesmo em "Tráfego Pago" (36 "A Fazer" para 18 listas).
- Em "Plan. de Criativos" há uma etapa "A Fazer" (com 3 tarefas) que não existe mais no modelo e nunca foi removida.
- Quando o nome de uma etapa é alterado no modelo, o sistema cria uma etapa nova na lista e **mantém a antiga**, então a tarefa continua mostrando a versão antiga — exatamente o sintoma relatado.

Causa: as versões antigas do editor de modelos salvavam apagando e recriando os itens do modelo; ao apagar o item, o vínculo guardado na etapa da lista foi zerado automaticamente. A sincronização atual só consegue "adivinhar" pelo nome, e falha justamente quando o nome muda.

Além disso, a sincronização só é executada quando alguém salva o modelo pela tela de modelos. Não é executada quando um local passa a usar o modelo por outro caminho, nem quando os itens do modelo são alterados de outra forma.

## Correção proposta

### 1. Reparar os vínculos existentes (migração de dados)
- Religar cada etapa de lista/pasta/space sincronizado ao item correspondente do modelo, casando pelo nome (ignorando maiúsculas e acentos).
- Eliminar as duplicidades: quando duas etapas da mesma lista correspondem ao mesmo item do modelo, manter a mais antiga, transferir as tarefas da duplicada para ela e apagar a duplicada.
- Etapas que não existem mais no modelo: se tiverem tarefas, são mantidas no fim da ordem como etapa extra (nada de tarefa desaparecer); se estiverem vazias, são removidas.
- Depois do reparo, propagar nome, cor, categoria e posição do modelo para todas as etapas vinculadas.

### 2. Deixar a sincronização realmente automática
- Passar a sincronizar sozinho sempre que um item do modelo for criado ou alterado (nome, cor, posição, categoria, padrão), independentemente da tela usada.
- Sincronizar também quando um local (lista, pasta ou space) passa a usar o modelo, ou troca de modelo — assim ele já nasce vinculado e alinhado.
- Manter o fluxo atual de exclusão de etapa com tarefas (pergunta para onde transferir antes de excluir).

### 3. Tornar a sincronização à prova de duplicidade
- Ao propagar, além de atualizar as etapas vinculadas, colapsar automaticamente vínculos duplicados e nunca criar uma segunda etapa para um item que já existe no local.
- Depois de sincronizar, as telas de tarefa/Kanban recarregam as etapas para o usuário ver a mudança sem recarregar a página.

## Verificação

1. Renomear e reposicionar uma etapa do modelo "Plan. de Criativos" e conferir, em uma tarefa de uma lista sincronizada, que o novo nome e a nova ordem aparecem imediatamente e que **não** existe mais a versão antiga na lista de opções.
2. Conferir que "A Fazer" aparece uma única vez nas listas de "Design/Edição de Vídeo" e "Tráfego Pago".
3. Conferir que as contagens de tarefas por etapa continuam somando o mesmo total antes e depois do reparo.

## Detalhes técnicos

- Migração de dados + reescrita de `public.resync_template_statuses` (dedupe por `template_item_id`, reparo de vínculo por nome normalizado, tratamento de órfãs com tarefas).
- Trigger `AFTER INSERT OR UPDATE` em `public.status_template_items` chamando o resync do respectivo `template_id`; trigger em `lists`/`folders`/`spaces` quando `status_source`/`status_template_id` muda para `template`.
- `src/hooks/useStatusTemplates.ts`: manter a chamada explícita ao resync (ordem: atualizar itens → resync com mapa de realocação → apagar itens removidos) e as invalidações de cache de `statuses`, `statuses-for-scope`, `tasks`.
