

# Filtro de Datas no Card de Produtividade (Space/Pasta/Lista)

## Resumo

Adicionar o componente `DateRangeFilter` já existente ao `ScopeProductivityCard`, com período padrão "Mês Atual". As datas selecionadas serão passadas tanto para o `useProductivityStats` quanto para o `useProductivityDetailsReport`.

## Alteração

### Editar `src/components/dashboard/ScopeProductivityCard.tsx`

1. Importar `DateRangeFilter` de `@/components/filters/DateRangeFilter` e `useCallback` do React
2. Adicionar estado `startDate` e `endDate`, inicializados com o mês atual (`startOfMonth(new Date())` e `new Date()`)
3. Criar callback `handleDateRangeChange` para atualizar os estados
4. Renderizar o `DateRangeFilter` no header do card (entre o título e os controles de Transferidas/Relatório), com `defaultPeriod="current-month"`
5. Passar `startDate` e `endDate` para ambos os hooks (`useProductivityStats` e `useProductivityDetailsReport`)

## Arquivos

- 1 editado: `src/components/dashboard/ScopeProductivityCard.tsx`

