# Ajuste do card "Responsáveis" no Space

## Objetivo
Melhorar o layout e a hierarquia visual do card de responsáveis na tela de detalhes do space, deixando as três funções (Account, Head de Projetos, Head de Account) lado a lado e dando ao card um aspecto "recuado" para não competir visualmente com os cards de conteúdo principais.

## O que será alterado
- `src/page-views/SpaceDetailView.tsx`

## Mudanças
1. **Layout horizontal dos seletores**
   - Os três campos (Account, Head de Projetos, Head de Account) passam a ser exibidos em uma linha, lado a lado.
   - Em telas menores, os campos devem empilhar automaticamente (grid responsivo).
   - Cada coluna mantém o rótulo, a descrição auxiliar e o `<Select>`.

2. **Visual recuado do card**
   - O card de responsáveis passa a usar aparência recuada: fundo `bg-muted` (ou similar do sistema), sem borda destacada e sem sombra, para parecer uma camada inferior da interface.
   - O cabeçalho do card permanece com título e descrição, mas com destaque reduzido.

3. **Preservação de funcionalidade**
   - Mantém os valores atuais vindos de `currentSpace.account_user_id`, `head_projetos_user_id` e `head_account_user_id`.
   - Mantém a lógica de atualização via `useUpdateSpace`.
   - Mantém a listagem de membros do workspace nos `<SelectItem>`.

## Critérios de aceitação
- Os três seletores aparecem lado a lado em desktop.
- O card tem aparência recuada, sem destaque de borda/sombra.
- A seleção e atualização de cada responsável continuam funcionando normalmente.
