# Produtividade — transferidas incluídas por padrão

## Contexto (já verificado no banco — sem alteração necessária)
- Quem transfere em dia já é protegido: a classificação usa `unassigned_at` (data da transferência) como referência, não a data de conclusão da tarefa.
- Quem conclui com atraso já é penalizado: a tarefa é classificada pelo `completed_at` na conta de quem concluiu.

## O que falta: ligar a chave por padrão
Hoje os relatórios só contam transferências quando o usuário ativa o toggle "incluir transferidas". Vamos inverter o padrão para **ativo**.

## Mudanças

### Hooks (default `includeTransferred = true`)
1. `src/hooks/useProductivityStats.ts` — default da opção para `true`.
2. `src/hooks/useProductivityRanking.ts` — default para `true`.
3. `src/hooks/useProductivityDetailsReport.ts` — default para `true`.
4. `src/hooks/useUserProductivityDetails.ts` — tratar `includeTransferred` ausente como `true`.

### Componentes (estado inicial do toggle = ligado)
5. `src/components/dashboard/ScopeProductivityCard.tsx` — `useState(false)` → `useState(true)`.
6. `src/components/dashboards/DashboardEditor.tsx` — dois `useState(false)` → `useState(true)` (linhas ~269 e ~348).
7. `src/components/dashboards/cards/ProductivityRankingCard.tsx` — default da prop `includeTransferred = false` → `true`.
8. `src/components/dashboards/cards/UserProductivityDetailsDialog.tsx` — default da prop → `true`.
9. `src/components/dashboards/cards/ProductivityCard.tsx` — `includeTransferred ?? false` → `?? true`.

Os toggles continuam existindo — o usuário ainda pode desligar manualmente em cada card.

## Sem mudança no banco
Nenhuma migration necessária; as RPCs (`get_productivity_ranking`, `get_productivity_stats`, etc.) já aceitam e processam `p_include_transferred`.

## Validação
- Abrir o dashboard de produtividade e o ranking, confirmar que transferidas aparecem por padrão (colunas "transferidas" e contadores "concluídas + transferidas").
- Confirmar que desligar o toggle volta ao comportamento antigo.
