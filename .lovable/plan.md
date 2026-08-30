# Importar comentários das tarefas (23–30 de agosto de 2026)

## O que já foi verificado

- O CSV traz **118 comentários** distribuídos em **48 tarefas** (das 147 linhas de tarefas/subtarefas já importadas).
- **Todas as 48 tarefas existem no banco** — nenhuma referência quebrada.
- Nenhum comentário duplicado e nenhum com texto vazio.
- Hoje **não existe nenhum comentário no banco com data a partir de 23/08/2026**, então esta importação é 100% de dados novos, sem substituição.
- Dos autores citados, só **3 têm conta aqui**: Mirian Vilivas, Wendy Uda e o usuário de sistema Suporte. Amanda Tavares (45 comentários), João Pessoa (15), Juliane Levorato (14), Cadu Rios (11), Leonardo Vicari (5), Luan Roberto (4), Débora Keer (1) e um e-mail solto não têm usuário no sistema.

## O que será importado

Para cada comentário:

- Texto integral, preservando quebras de linha e links.
- Data original (`comentario_data`) como data de criação.
- Atribuição: quando houver `comentario_atribuido_a` e a pessoa existir aqui, o comentário fica atribuído a ela.
- Resolvido: quando houver `resolvido_em`, o comentário entra como resolvido nessa data, com `resolvido_por` vinculado se a pessoa existir.
- O ID original do comentário é mantido, o que garante que rodar de novo não duplica nada.

## Autoria

- Comentários de Mirian Vilivas e Wendy Uda ficam com autoria real.
- Os demais ficam com autor **Suporte** (usuário de sistema) e o nome do autor original preservado no início do texto, em negrito — ex.: `**Amanda Tavares:** Pode remover essa automação?`.
- Os 15 comentários sem autor no CSV entram como **Suporte**, sem prefixo.
- Quando o atribuído ou o resolvedor não existir aqui, a informação vira texto no comentário (`Atribuído a: Nome`), sem vínculo.

## Detalhes técnicos

- Tabela: `public.task_comments` (`id`, `task_id`, `author_id`, `content`, `created_at`, `updated_at`, `assignee_id`, `resolved_at`, `resolved_by`).
- Perfil de sistema: `Suporte` (`b7e892cf-ea9e-4d15-86d8-5243bce7034c`). Nenhum perfil novo é criado.
- Inserção em lotes com upsert por `id` (idempotente), sem alteração de schema, RLS, SSO ou funções do Hub.
- Também será gerado o registro de atividade (`task_activities`) de comentário, seguindo o mesmo padrão das importações anteriores, para os comentários aparecerem na aba Atividade.
- Nenhum código de aplicação é alterado: a tela da tarefa já lista `task_comments`.
