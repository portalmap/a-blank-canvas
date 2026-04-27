## Problema

A `BulkActionsBar` usa `fixed bottom-4 left-1/2` e fica sobreposta à última linha da lista de tarefas, atrapalhando a visualização e o clique nos itens finais.

## Solução

Combinar duas correções complementares para resolver definitivamente, sem afetar outras funcionalidades:

### 1. Padding inferior dinâmico na lista (correção principal)
Quando houver tarefas selecionadas, adicionar um `padding-bottom` extra (~80px) ao container da `TaskListView` (e demais views afetadas, como Kanban/Sprint, se aplicável). Isso garante que a última linha sempre tenha espaço para rolar acima da barra — mesmo se o usuário não mover a barra.

- Arquivo: `src/components/views/TaskListView.tsx` (e equivalentes onde a barra aparece)
- Receber prop opcional `hasBulkSelection: boolean` ou aplicar via `pb-24` condicional já no `ListDetailView.tsx` que renderiza a barra.

### 2. Tornar a barra arrastável (move horizontal/vertical)
Adicionar uma "alça" (handle, ícone `GripVertical`) à esquerda da barra que permita arrastar livremente para qualquer posição da tela usando mouse/touch.

- Arquivo: `src/components/tasks/BulkActionsBar.tsx`
- Implementação leve com `useState` para `position {x, y}` + listeners `mousemove`/`mouseup` (sem dependências externas).
- Posição inicial: centralizada em baixo (comportamento atual).
- Limites: clamp dentro da `window` para não sumir da tela.
- Persistir a posição em `sessionStorage` para não resetar a cada seleção dentro da mesma sessão.
- Cursor `grab` na alça e `grabbing` durante o arrasto.

### 3. Detalhe visual
- Adicionar `shadow-xl` e leve `backdrop-blur` para melhorar a leitura quando sobrepor conteúdo.
- Manter o botão `X` para fechar a seleção.

## Pontos técnicos

- Não há mudanças no banco de dados.
- Nenhuma regra de negócio (status, responsáveis, datas, exclusão em massa) é alterada.
- Mudanças isoladas em 2 arquivos (`BulkActionsBar.tsx` e `ListDetailView.tsx`), sem impacto em automações, produtividade, chat ou feed.

## Resultado esperado

- A última linha sempre fica visível/clicável (graças ao padding extra).
- Caso o usuário queira ainda mais espaço, basta arrastar a barra para outro canto da tela.
- A posição escolhida é lembrada durante a sessão.