

# Remover componente manual de Seguidores das páginas de Space, Pasta e Lista

## Problema

O componente "Seguidores do Space/Pasta/Lista" (que permite adicionar seguidores manualmente) está duplicando funcionalidade com o botão "Seguir Automaticamente", que já suporta múltiplos usuários. Isso gera confusão visual.

## O que será feito

Remover o `EntityFollowersManager` das 3 páginas de nível superior (Space, Pasta, Lista), mantendo apenas o `QuickAutomationButtons` que já cumpre a função. O componente **permanece nas Tarefas**, onde faz sentido gerenciar seguidores individuais manualmente.

## Alterações

### 1. `src/pages/SpaceDetailView.tsx`
- Remover import de `EntityFollowersManager`
- Remover o bloco `<EntityFollowersManager>` (linhas 129-133)

### 2. `src/pages/FolderDetailView.tsx`
- Remover import de `EntityFollowersManager`
- Remover o bloco `<EntityFollowersManager>` (linhas 108-112)

### 3. `src/pages/ListDetailView.tsx`
- Remover import de `EntityFollowersManager`
- Remover o bloco `<EntityFollowersManager>` (linhas 298-302)

### Não alterados
- `TaskFollowersManager` e `TaskDetailDrawer` — seguidores manuais continuam disponíveis no nível de tarefa
- `EntityFollowersManager` — componente mantido no projeto (usado pela tarefa)
- `QuickAutomationButtons` — permanece em todas as páginas

## Resultado
- 3 arquivos editados
- Interface mais limpa sem duplicidade de funcionalidade

