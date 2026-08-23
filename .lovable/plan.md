# Comentários importados não aparecem na tarefa — causa e correção

## O que a verificação mostrou

- Os comentários **foram importados sim**: `task_comments` tem **1.839 registros** em **628 tarefas**, todos no workspace **Operacional MAP**, com datas de 01/07/2026 a 21/08/2026.
- Vínculo com tarefa está **correto**: todas as 1.839 linhas apontam para tarefas existentes; textos conferem com o título da tarefa (ex.: "Acesso completo da Rede IOL" com a conversa sobre acessos).
- Autor e permissões OK: autor é o perfil **Suporte**, e a política de leitura libera para membros do workspace (Suporte, Victor Borges, Rodrigo Braz são membros).
- 1.156 comentários marcados como resolvidos e 90 com atribuição.

## Por que a tela mostra "Nenhuma atividade registrada"

A página da tarefa (`TaskView`) exibe o painel **Atividade**, que lê a tabela `task_activities` — **não** a tabela `task_comments`. Quando alguém comenta pelo app, são criados dois registros: o comentário e a atividade `comment.created` (ou `assignment.created`) apontando para ele.

A tabela `task_activities` está **completamente vazia (0 registros)**. Como a importação gravou só os comentários, o feed não tem nada para mostrar — por isso "não parece" que a importação ocorreu.

## Correção

Gerar, via migration/SQL de dados, o registro de atividade que falta para cada comentário já importado:

- Comentário sem atribuição → atividade `comment.created` com `metadata.comment_id` e `metadata.content`.
- Comentário com atribuição → atividade `assignment.created` com `comment_id`, `content`, `assignee_id` e `assignee_name`.
- Comentário resolvido → atividade adicional `assignment.resolved` na data de resolução.
- Anexos já importados (788) → atividade `attachment.added` com nome, tipo, tamanho e URL, para aparecerem também no histórico.

Regras:

- `user_id` = autor do comentário (Suporte); `created_at` = data original do comentário/anexo, mantendo a ordem cronológica real.
- Operação **idempotente**: só insere quando ainda não existe atividade com o mesmo `metadata->>'comment_id'` (ou `file_url` para anexos), então rodar de novo não duplica.
- Nenhuma alteração de schema, RLS, código de aplicação, SSO ou funções do Hub. Nada do módulo de comentários/atividades é reescrito.

## Validação

Depois de aplicar, conferir uma tarefa com histórico conhecido (ex.: "Acesso completo da Rede IOL") e verificar que o painel Atividade lista os comentários na ordem original, com atribuições e marcações de resolvido.
