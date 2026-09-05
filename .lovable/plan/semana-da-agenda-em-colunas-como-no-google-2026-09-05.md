# Semana da Agenda em colunas, como no Google

## Hoje

A visão "Semana" mostra uma lista de dias empilhados, um bloco embaixo do outro. Não há colunas nem faixa de horários.

## Como vai ficar

Uma grade igual à do Google Agenda:

- Cabeçalho com os 7 dias (SEG, TER, ..., DOM) e o número do dia; o dia de hoje destacado em círculo.
- Coluna de horas à esquerda (00:00 a 23:00) e uma coluna por dia.
- Cada compromisso aparece como um bloco colorido posicionado no horário certo, com altura proporcional à duração, mostrando título e horário.
- Compromissos que se sobrepõem dividem a largura da coluna, lado a lado.
- Faixa fixa no topo da grade para os compromissos de "dia inteiro".
- Linha vermelha marcando a hora atual no dia de hoje.
- Rolagem vertical na grade, já posicionada por volta das 07:00 ao abrir.
- Clicar num espaço vazio cria um compromisso naquele dia e hora; clicar num bloco abre o compromisso.
- A visão "Dia" usa a mesma grade, com uma única coluna.
- No celular a grade rola na horizontal, com colunas de largura mínima, mantendo a coluna de horas visível.

A visão "Mês" continua igual, e nada muda na parte de dados, Google ou convites.

## Detalhes técnicos

- Novo componente `src/components/agenda/AgendaWeekView.tsx` (grade de horários reutilizada por semana e dia), mantendo `AgendaListView.tsx` sem uso na Agenda ou removido do fluxo.
- `src/page-views/Agenda.tsx`: nas visões `week` e `day`, renderizar `AgendaWeekView` com `days`, `events`, `onSelectEvent`, `onSelectSlot(date)`.
- Posicionamento por CSS absoluto dentro de cada coluna: `top = (minutos desde 00:00) * pxPorMinuto`, `height = duração * pxPorMinuto` (48px/hora), altura mínima de ~22px.
- Cálculo de sobreposição: agrupar eventos que se cruzam no tempo e dividir largura/offset por coluna dentro do grupo.
- Cores vindas de `event.color`; textos e bordas via tokens do design system (sem cores fixas).
- Sem mudança de banco, de hooks (`useAgenda`) ou da sincronização com o Google.

## Verificação

1. Abrir Agenda > Semana: grade com 7 colunas e blocos nos horários corretos.
2. Conferir sobreposição lado a lado e a linha da hora atual.
3. Clicar em espaço vazio (cria) e em um bloco (abre) funcionando.
4. Alternar para Dia e Mês e conferir a navegação anterior/hoje/próximo.
