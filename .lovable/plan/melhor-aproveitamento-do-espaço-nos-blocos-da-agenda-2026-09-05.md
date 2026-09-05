# Melhor aproveitamento do espaço nos blocos da agenda

## O que muda

- Sai o ícone que aparece antes do título dentro dos blocos de compromisso na Semana e no Dia. O título passa a começar na borda esquerda do bloco.
- O título ganha até duas linhas quando o bloco tem altura para isso (hoje corta em uma linha só), como no Google.
- Margens e espaçamentos internos ficam menores, para sobrar mais área de texto em blocos estreitos.
- Blocos sobrepostos ficam mais largos: em vez de fatias estreitas com folga, cada bloco avança mais sobre o vizinho, deixando à esquerda apenas uma faixa fina do bloco de trás — igual ao exemplo enviado.
- O último bloco de cada grupo vai até a borda direita da coluna, aproveitando toda a largura.
- O horário só aparece quando o bloco é alto o suficiente; em blocos baixos o espaço é todo do título.
- O marcador "+N" (quando há muitos compromissos no mesmo horário) continua funcionando e passa a ficar mais discreto para não cobrir títulos.

Mês, dados, Google, convites e os demais módulos não mudam.

## Detalhes técnicos

- Alteração restrita a `src/components/agenda/AgendaWeekView.tsx`.
- Remover `AgendaItemIcon` do render dos blocos (o ícone segue em uso no Mês e na lista).
- Aumentar o fator de sobreposição e remover o recuo lateral de 4px; largura do bloco calculada até 100% da coluna.
- Título com `line-clamp-2` quando `height >= ~34px`, `truncate` abaixo disso; padding horizontal reduzido para `px-1`.
- Horário exibido apenas quando `height > ~44px`.
- Nenhuma mudança em hooks, banco, sincronização ou tipos.

## Verificação

1. Semana com vários compromissos no mesmo horário: títulos legíveis, blocos largos e escalonados.
2. Blocos curtos (15–30 min) mostram só o título, sem corte estranho.
3. Dia com muita sobreposição: "+N" abre a lista e não cobre os títulos.
