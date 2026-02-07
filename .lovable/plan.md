
# Correção: Excluir automações ao deletar Space

## Problema

A tabela `automations` usa um campo polimórfico `scope_id` que referencia Spaces, Folders ou Lists, mas **nao possui foreign key** para essas tabelas. Apenas tem FK para `workspaces` (com CASCADE).

Quando um Space e excluido:
- Folders sao deletados (CASCADE via `folders_space_id_fkey`)
- Lists sao deletadas (CASCADE via `lists_space_id_fkey`)
- Automacoes **permanecem orfas** porque nao ha vinculo de CASCADE

## Solucao

Criar **triggers de banco de dados** que limpam automaticamente as automacoes quando um Space, Folder ou List e excluido.

## Detalhes Tecnicos

### Migracao SQL

Criar uma funcao e tres triggers:

```sql
-- Funcao que deleta automacoes vinculadas ao registro excluido
CREATE OR REPLACE FUNCTION delete_related_automations()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM automations
  WHERE scope_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela spaces
CREATE TRIGGER trigger_delete_space_automations
  BEFORE DELETE ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();

-- Trigger na tabela folders
CREATE TRIGGER trigger_delete_folder_automations
  BEFORE DELETE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();

-- Trigger na tabela lists
CREATE TRIGGER trigger_delete_list_automations
  BEFORE DELETE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION delete_related_automations();
```

### Por que triggers em vez de FK?

O campo `scope_id` e **polimorfico** -- pode apontar para `spaces`, `folders` ou `lists` dependendo do `scope_type`. Nao e possivel criar uma FK normal para multiplas tabelas. Triggers resolvem isso de forma limpa.

### Fluxo ao excluir um Space

1. Trigger no Space: deleta automacoes com `scope_id = space_id`
2. CASCADE deleta Folders do Space
3. Trigger em cada Folder: deleta automacoes com `scope_id = folder_id`
4. CASCADE deleta Lists do Space
5. Trigger em cada List: deleta automacoes com `scope_id = list_id`

### Alteracoes

- **1 migracao SQL**: criar funcao + 3 triggers
- **0 arquivos de codigo modificados**: a logica e toda no banco de dados
- O codigo do frontend (`useDeleteSpace`, `useAutomations`) nao precisa de nenhuma alteracao
