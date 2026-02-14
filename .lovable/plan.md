

# Permitir Atribuir Usuario ao Editar Comentario

## Problema

Atualmente, ao editar um comentario do tipo `comment.created` (comentario simples sem atribuicao), o seletor de atribuicao nao aparece. Ele so aparece quando o comentario ja era do tipo `assignment.created`. Isso impede que o usuario atribua alguem a um comentario que foi criado sem atribuicao.

## Solucao

Mostrar o `CommentAssigneeSelector` para todos os tipos de comentarios editaveis (`comment.created`, `comment.edited`, `assignment.created`), nao apenas para `assignment.created`.

## Alteracao

### `src/components/tasks/TaskActivityItem.tsx`

1. **Linha 295**: Remover a condicao `activity.activity_type === 'assignment.created'` que restringe o seletor de atribuicao apenas para comentarios ja atribuidos. O seletor passara a aparecer para qualquer comentario editavel.

2. **Metodo `handleSaveEdit`**: Ja suporta `newAssigneeId` como null ou com valor, entao nao precisa de alteracao na logica de salvamento. Quando o usuario adicionar um atribuido a um comentario simples, a atividade sera atualizada com os dados do atribuido.

3. **Metodo `handleStartEdit`**: Ajustar para inicializar `editAssignee` como null para comentarios sem atribuicao (ja faz isso no else da linha 151), nenhuma alteracao necessaria.

### Resultado

- Comentarios criados SEM atribuicao: ao editar, aparecera o seletor "Atribuir a:" permitindo adicionar uma atribuicao
- Comentarios criados COM atribuicao: comportamento mantido, continua aparecendo o seletor com o usuario atual pre-selecionado
- Apenas o autor do comentario pode editar (regra mantida via `canEdit`)

