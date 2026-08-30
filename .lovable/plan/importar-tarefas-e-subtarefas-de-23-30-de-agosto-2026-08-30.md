# Importar tarefas e subtarefas de 23–30 de agosto

Trazer para o banco atual as 147 linhas do CSV enviado (98 tarefas + 49 subtarefas), todas do workspace **Operacional MAP** (o único existente).

## O que já foi verificado

- O banco tem hoje 1.009 tarefas, criadas entre 01/07 e 21/08/2026. **Nenhuma tarefa do banco tem data de criação dentro do período do CSV**, então a importação é de dados novos — não há substituição.
- 33 das 36 listas do CSV já existem, com pasta e space corretos. **Faltam 3 listas**: `Tech | Pintepisos`, `Informações | PsicoMed` e `Informações | Vanessa Marques Beauty` (os spaces existem; 1 tarefa concluída em cada).
- No CSV, o campo `tarefa_pai` traz o **título** da tarefa pai, não o ID. As 49 subtarefas apontam para 49 posts que **não** estão no CSV. Amostragem no banco: parte desses pais existe (ex.: os posts de setembro do Atacadão da Suburbana e do Monvizo), parte **não** existe (ex.: `POST 01 SETEMBRO TINTAS PALMARES` na lista Designer/Edição de Vídeo | Tintas Palmares).
- Status usados: Aguardando (56), Em Progresso (34), Concluído (25), Instagram (21), A Fazer (5), Env. Aprovação (3), Temas Enviados (2), Contrato Criado (1). `Contrato Criado` não existe hoje em nenhuma lista.
- Responsável principal está vazio em todas as linhas; os nomes aparecem em `responsaveis`/`seguidores`. Dos 13 nomes, só **3 existem** aqui: Victor Borges, Mirian Vilivas e Wendy Uda. Os demais (Amanda Tavares, Cadu Rios, Cintia, Débora Keer, Emanuela Caetano, Javier Hernandez, João Pessoa, Juliane Levorato, Leonardo Vicari, Luan Roberto e dois e-mails soltos) não têm usuário no sistema.
- Etiquetas: só 1 linha tem tag (`tecnologia`), que já existe no workspace.

## O que será feito

1. **Criar as 3 listas faltantes** dentro da pasta `Tarefas & Demandas | <cliente>` do space correspondente, visão `list`.
2. **Criar os status que faltarem** em cada lista de destino, com a categoria vinda do CSV (`not_started` / `active` / `in_progress` / `done`), reaproveitando os status já existentes com o mesmo nome na mesma lista.
3. **Importar as 98 tarefas** preservando o `tarefa_id` original (mesmo UUID), com título, descrição, status, prioridade, datas de início/entrega, conclusão, criação/atualização, marco, tempo estimado/gasto e arquivamento.
4. **Importar as 49 subtarefas** resolvendo o pai por título dentro da mesma lista. Quando o pai não existir no banco, a subtarefa entra como **tarefa normal na mesma lista** (sem pai), para nenhum registro ser perdido — o relatório final lista quais caíram nesse caso.
5. **Responsáveis e seguidores**: apenas Victor Borges, Mirian Vilivas e Wendy Uda são vinculados (`task_assignees` / `task_followers`). Os outros nomes ficam sem vínculo.
6. **Etiqueta**: vincular `tecnologia` à única tarefa que a tem.
7. `created_by_user_id` (obrigatório) recebe o usuário global `portal@assessoriamap.com.br`, já que nenhum dos autores do CSV existe aqui.

## Detalhes técnicos

- Tudo em uma migration SQL única e transacional gerada a partir do CSV; nenhum código do app muda.
- Ordem de inserção: listas → status → tarefas (pais antes de filhos) → responsáveis/seguidores → etiquetas.
- `ON CONFLICT (id) DO NOTHING` nas tarefas, para a migration ser idempotente caso rode de novo.
- Textos com acentos, aspas e quebras de linha escapados com dollar-quoting.
- Verificação final: 147 tarefas novas, contagem de subtarefas com pai válido, nenhuma tarefa com status de outra lista, e a lista dos pais não encontrados.
