# Importar comentários das tarefas (julho/agosto 2026)

## Verificação já feita

- O CSV traz **1.839 comentários** distribuídos em **628 tarefas**.
- **Todas as 1.009 tarefas** citadas no arquivo existem no banco (conjunto de IDs idêntico ao já importado). Nenhuma tarefa faltando.
- Nenhum comentário duplicado e nenhum com texto vazio.

## O que será importado

Para cada linha com comentário:

- Texto do comentário, preservando quebras de linha e links.
- Data original do comentário (`Comentário em`) como data de criação.
- Marcação de resolvido: quando houver `Resolvido em`, o comentário entra como resolvido nessa data.
- ID original do comentário é mantido, o que garante que rodar de novo não duplica nada.

## Autoria

- Todos os comentários ficam com autor **Suporte** (usuário de sistema).
- O nome do autor original é preservado no início do texto, em negrito — ex.: `**Amanda Tavares:** enviado aprovação 06-07`.
- Os 142 comentários sem autor no CSV entram como **Suporte**, sem prefixo de nome.
- O campo "Atribuído a" e "Resolvido por" referenciam pessoas que em grande parte não têm conta aqui: quem existe (Victor Borges, Rodrigo Braz, Wendy Uda) é vinculado de verdade; os demais ficam sem vínculo, e a informação segue visível no texto quando relevante ("Atribuído a: Nome").

## Detalhes técnicos

- Tabela: `public.task_comments` (`id`, `task_id`, `author_id`, `content`, `created_at`, `updated_at`, `assignee_id`, `resolved_at`, `resolved_by`).
- Autor de sistema: perfil `Suporte` (`b7e892cf-ea9e-4d15-86d8-5243bce7034c`). Nenhum perfil novo é criado.
- Datas no formato `DD/MM/AAAA HH:MM` convertidas para timestamptz no fuso de São Paulo (UTC-3).
- Inserção em lotes via script de importação com upsert por `id`, semelhante ao usado na importação das tarefas; sem alteração de schema e sem mexer em RLS, SSO ou funções do Hub.
- Nada de código de aplicação é alterado: a tela de tarefa já lista `task_comments`.
