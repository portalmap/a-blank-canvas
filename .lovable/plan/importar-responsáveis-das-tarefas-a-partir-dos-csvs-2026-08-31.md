# Importar responsáveis das tarefas a partir dos CSVs

Sim: os CSVs de tarefas têm responsáveis. A coluna é `responsaveis` (a coluna `responsavel_principal` está vazia em 100% das linhas), com múltiplos nomes separados por ` | `.

O que os arquivos trazem:
- `tarefas-julho-agosto-2026-v2.csv`: 1.009 tarefas, 718 com responsável.
- `tarefas-subtarefas-23-a-30-agosto-2026.csv`: 147 subtarefas, 81 com responsável.
- 29 valores distintos de nome (alguns são e-mails soltos), sendo os maiores: Cadu Rios (137), Juliane Levorato (108), Felipe Assencio (98), Yndiara Costa (64), Leonardo Vicari (62).

Situação atual no banco: das 1.156 tarefas importadas, apenas 77 têm responsável vinculado — ou seja, os responsáveis do CSV não foram importados.

## O que propomos fazer

1. Casar cada nome do CSV com um usuário existente (por nome completo e por e-mail).
2. Criar os vínculos de responsável nas tarefas correspondentes (usando o `tarefa_id` do CSV como referência), sem duplicar os que já existem.
3. Entregar um relatório dos nomes que **não** têm usuário cadastrado, para você decidir: criar o usuário, apontar para outra pessoa, ou deixar sem responsável.

Hoje só existem 10 usuários cadastrados (Amanda Tavares, Cadu Rios, Debora Keer, João Pessoa, Leonardo Vicari, Mirian Vilivas, Rodrigo Braz, Suporte, Victor Borges, Wendy Uda). Nomes como Juliane Levorato, Felipe Assencio, Yndiara Costa, Luiz Santoro, Luan Roberto, Javier Hernandez, Fábio Sousa, Cintia e Maria Clara não têm conta — essas tarefas ficariam sem responsável até você definir o que fazer.

## Detalhes técnicos

- Importação via SQL (migration) com uma tabela temporária de mapeamento nome → `profiles.id`.
- Inserção em `public.task_assignees` com `ON CONFLICT DO NOTHING`; sem alterar status, datas ou histórico de produtividade.
- Não haverá geração de `task_assignee_history` retroativo (para não distorcer a produtividade), a menos que você peça.
- Nenhuma mudança de código de frontend.
