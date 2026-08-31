# Corrigir responsáveis do Space que não aparecem após salvar

## Diagnóstico (confirmado)

Não é realtime. O salvamento funciona: no banco, o space "MAP | Accerth" já tem `account_user_id`, `head_projetos_user_id` e `head_account_user_id` gravados.

O problema é o cache da tela:
- A tela de detalhes do space lê os dados via `useSpace(spaceId)`, cuja chave de cache é `['space', spaceId]`.
- Após o update, `useUpdateSpace` invalida apenas `['spaces', workspace_id]` (a lista da sidebar).
- Resultado: aparece "Space atualizado com sucesso!", mas o card continua mostrando "Nenhum" até um recarregamento manual da página.

## Correção

Em `src/hooks/useSpaces.ts`, no `onSuccess` do `useUpdateSpace`:
- Continuar invalidando `['spaces', workspace_id]`.
- Invalidar também `['space', data.id]` para que o detalhe do space seja atualizado.
- Escrever o registro retornado direto no cache (`setQueryData(['space', data.id], data)`) para refletir a mudança de imediato, sem esperar o refetch.

Aplicar o mesmo par de invalidações nas mutações que também alteram um space específico (arquivar/restaurar/criar), mantendo cada módulo intocado no restante.

## Fora de escopo

Sem mudanças em banco, RLS, realtime ou no layout do card de Responsáveis.

## Critério de aceitação

Ao selecionar Account, Head de Projetos ou Head de Account, o nome escolhido permanece visível no seletor imediatamente após o toast de sucesso, sem recarregar a página.
