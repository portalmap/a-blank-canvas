

# Filtro de Data Global no Dashboard

## Resumo

Adicionar um seletor de período de análise visível no header do dashboard (fora do popover de filtros) e passar essas datas para todos os cards de produtividade e ranking.

## Alterações

### 1. `src/pages/DashboardView.tsx`
- Adicionar estado `dateRange: { startDate: Date | null; endDate: Date | null }`
- Substituir o botão "Filtros" inativo por um componente `DateRangeFilter` (já existe em `src/components/filters/DateRangeFilter.tsx`) ou criar um seletor de período inline no header com presets (7 dias, 30 dias, 3 meses, personalizado)
- Exibir o período selecionado de forma visível no header (ex: "01/03/2026 — 05/04/2026")
- Passar `dateRange` como prop ao `DashboardEditor`

### 2. `src/components/dashboards/DashboardEditor.tsx`
- Receber prop `dateRange: { startDate?: Date; endDate?: Date }`
- Passar `startDate` e `endDate` aos wrappers `ProductivityCardWrapper` e `ProductivityRankingCardWrapper`
- Os wrappers repassam para `useProductivityStats` e `useProductivityRanking` (ambos já aceitam `startDate` e `endDate`)

### 3. `src/hooks/useProductivityStats.ts`
- Verificar se já filtra por `startDate`/`endDate` na query — se não, adicionar `.gte('completed_at', startDate)` e `.lte('completed_at', endDate)`

### 4. `src/hooks/useProductivityRanking.ts`
- Mesmo ajuste: garantir que `startDate`/`endDate` filtram as tarefas consultadas

## Resultado
- Período de análise visível e acessível no header do dashboard
- Todos os cards de produtividade e ranking filtram por esse período
- 4 arquivos editados

