

# Adicionar área descritiva editável no Space

## O que será feito

Adicionar um card editável de descrição detalhada logo acima do dashboard de gráficos (TaskStatsDashboard) na página do Space. O campo `description` da tabela `spaces` já existe no banco — será reutilizado.

## Alteração

**Arquivo: `src/pages/SpaceDetailView.tsx`**

1. Adicionar estado local para controle de edição (`isEditingDescription`, `editedDescription`)
2. Inserir um `Card` entre o header (título + botões) e o `TaskStatsDashboard`, contendo:
   - **Modo visualização**: exibe a descrição com texto formatado (ou placeholder "Clique para adicionar uma descrição...") + ícone de edição
   - **Modo edição**: `Textarea` com botões Salvar/Cancelar
3. Ao salvar, chamar `supabase.from('spaces').update({ description }).eq('id', spaceId)` e invalidar a query do space
4. Remover a linha duplicada de descrição que já existe abaixo do título (linha 103-105), já que a nova área descritiva a substitui

## Resultado

- Card com a descrição detalhada do Space, editável inline por qualquer membro
- Posicionado logo acima dos gráficos de Visão Geral
- Usa o campo `description` já existente no banco — sem migração necessária

