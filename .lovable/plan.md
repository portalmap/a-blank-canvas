# Sobreposição de compromissos como no Google Agenda

## Hoje

Quando dois compromissos se cruzam no mesmo horário, a coluna do dia é dividida em partes iguais. Com 3 ou 4 compromissos juntos, cada bloco fica muito estreito e o título vira uma tira ilegível.

## Como o Google faz (visto nos prints)

- Os blocos não se dividem em fatias iguais: eles ficam **escalonados**, um levemente sobre o outro.
- O compromisso que começa antes fica atrás e continua visível pela borda esquerda; o que começa depois entra por cima, deslocado para a direita e um pouco mais largo do que a divisão exata.
- Quem começa mais tarde fica na frente (mais "alto"), sempre com uma borda clara separando os blocos.
- Compromissos curtos e sobrepostos mostram só o título; o horário aparece quando cabe.

## Como vai ficar aqui

- Sobreposição escalonada: cada compromissou ocupa mais largura do que a fatia exata e avança sobre o vizinho, com pequena margem lateral e sombra leve para dar profundidade.
- O primeiro da esquerda mantém uma faixa visível, então dá para ver que existem 2, 3 ou mais compromissos ao mesmo tempo.
- Ordem de empilhamento por horário de início (mais tarde na frente); ao passar o mouse ou clicar, o bloco vem para frente por inteiro.
- Título sempre legível: horário só aparece quando o bloco tem altura suficiente.
- Quando há mais de 4 compromissos cruzados no mesmo intervalo, os 3 primeiros aparecem escalonados e o restante vira um marcador "+N" que abre a lista daquele intervalo.
- Blocos com duração muito curta ganham altura mínima e não somem atrás dos outros.
- Vale para a visão Semana e a visão Dia (mesma grade). Mês, dados, Google e convites não mudam.

## Detalhes técnicos

- Alterar apenas `src/components/agenda/AgendaWeekView.tsx`.
- Em `layoutDay`, manter o agrupamento por interseção, mas trocar o cálculo de `left`/`width`:
  - `left = index * (100 / total) * FATOR_DESLOCAMENTO`, `width = (100 / total) + EXTRA` (limitado a 100 - left), com `FATOR_DESLOCAMENTO ~0.8` e `EXTRA` proporcional para gerar a sobreposição.
  - `zIndex = 10 + index` para o empilhamento; `:hover`/`:focus` sobe para o topo.
- Contar sobreposições reais por intervalo para decidir o corte em 3 colunas + indicador "+N"; o clique no indicador abre um popover com os compromissos do intervalo.
- Cores continuam vindas de `event.color`; bordas, sombra e texto por tokens do design system (sem cor fixa).
- Sem mudança em `useAgenda`, banco de dados ou sincronização com o Google.

## Verificação

1. Abrir Agenda > Semana num dia com 2, 3 e 4 compromissos cruzados e conferir o escalonamento.
2. Conferir que o bloco de trás continua visível e que o da frente é clicável por inteiro.
3. Conferir o indicador "+N" quando houver mais de 4 cruzados.
4. Repetir na visão Dia e no celular (rolagem horizontal).
