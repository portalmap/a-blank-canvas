# Sobreposição com larguras decrescentes, como no Google

## O que muda

- Hoje o último bloco de um grupo sobreposto vai até a borda direita e ocupa toda a largura restante. Isso deixa o grupo desequilibrado.
- Passa a valer uma escala de larguras: o bloco do fundo (que começa antes) ocupa 80% da largura da coluna; o seguinte 70%, depois 60%, 50%, e assim por diante, com um piso mínimo para não ficar ilegível.
- Cada bloco continua deslocado para a direita em relação ao anterior, deixando uma faixa fina do bloco de trás visível à esquerda — quem começa depois fica na frente.
- O texto (título) fica alinhado ao topo do bloco, para que apareça mesmo quando o bloco é baixo ou coberto parcialmente.
- O horário continua aparecendo somente quando o bloco tem altura suficiente.
- O marcador "+N" segue igual, para quando há mais compromissos cruzados do que colunas visíveis.

Mês, dados, Google, convites e os demais módulos não mudam.

## Detalhes técnicos

- Alteração restrita a `src/components/agenda/AgendaWeekView.tsx`.
- Em `layoutDay`, trocar o cálculo atual (`width = 100 - left`) por uma escala decrescente:
  - `width(i) = max(MIN_WIDTH, 80 - i * 10)` (em %), com `MIN_WIDTH ~40`.
  - `left(i)` derivado por deslocamento acumulado de forma que `left + width <= 100`, mantendo faixa visível do bloco anterior (passo ≈ `(100 - width(último)) / (total - 1)`, limitado por `STRIP`).
  - `zIndex = 10 + index` mantido; hover/foco continua trazendo o bloco à frente.
- No render do bloco: conteúdo com `items-start`/`justify-start` (texto no topo), mantendo `line-clamp-2` acima de ~34px e `truncate` abaixo.
- Nenhuma mudança em hooks, banco, sincronização ou tipos.

## Verificação

1. Semana com 2, 3 e 4 compromissos cruzados: larguras decrescentes e faixas do bloco de trás visíveis.
2. Blocos curtos: título visível no topo, sem corte estranho.
3. Visão Dia com muita sobreposição: "+N" funcionando e títulos legíveis.
