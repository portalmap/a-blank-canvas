

# Correção: Navegação para tarefas dando 404

## Problema

Ao clicar nas tarefas nos relatórios, o sistema navega para `/tasks/{id}` (plural), mas a rota definida no App.tsx é `/task/{id}` (singular). Isso causa o erro 404.

## Correção

Trocar `/tasks/` por `/task/` em 3 arquivos:

1. **`src/components/dashboards/cards/AccountReportDialog.tsx`** (linha 85)
2. **`src/components/dashboards/cards/UserProductivityDetailsDialog.tsx`** (linha 170)
3. **`src/components/dashboards/cards/ProductivityReportDialog.tsx`** (linha 75)

Em todos, alterar `navigate(\`/tasks/\${taskId}\`)` para `navigate(\`/task/\${taskId}\`)`.

## Arquivos
- 3 editados (correção de 1 linha cada)

