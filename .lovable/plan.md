

# Diagnóstico e Correção

## Investigação

Após análise detalhada:

1. **A coluna `source_id` na tabela `task_followers` é do tipo `uuid`**, mas os triggers usam `::text` ao inserir valores nela. Embora em teoria o PostgreSQL possa converter texto de volta para UUID, isso pode causar problemas dependendo do contexto de execução do trigger.

2. **Atualmente não há seguidores em nenhuma tabela** (space_followers, folder_followers, list_followers, task_followers estão todas vazias). Isso significa que o trigger `propagate_followers_to_new_task` executa nas criações de tarefas, mas os SELECTs retornam 0 linhas — então nenhum INSERT com tipo errado é tentado na prática.

3. **O erro pode já ter sido resolvido** em alguma outra alteração, ou pode ter sido transitório. A listagem de tarefas está funcionando (retorna 200).

## Solução proposta

Sim, a correção dos `::text` é a melhor e mais segura solução — mesmo que o erro atual possa ter outra causa, os casts estão tecnicamente incorretos e **vão** causar problemas quando alguém adicionar seguidores em Space/Pasta/Lista.

A migração será simples: recriar as 7 funções de trigger removendo `::text` de todas as referências a `source_id`. Isso:

- **Não altera nenhum arquivo de frontend**
- **Não altera nenhuma estrutura de tabela**
- **Não afeta nenhuma funcionalidade existente**
- Apenas corrige o tipo de dado passado internamente nos triggers

## Alternativa

Se preferir, posso primeiro **testar criando uma tarefa no preview** para confirmar se o erro ainda ocorre antes de aplicar a correção.

