# Remover linha horizontal da faixa superior

## Objetivo
Eliminar a linha horizontal (borda inferior) que separa a faixa fina superior do conteúdo da página, conforme indicado na imagem.

## O que será alterado
- `src/components/TopBar.tsx`
- `src/components/MobileHeader.tsx`

## Mudanças
1. **TopBar (desktop)**
   - Remover a classe `border-b` da `<div>` da TopBar, mantendo o fundo, altura, padding e alinhamento dos ícones.

2. **MobileHeader (mobile)**
   - Remover a classe `border-b` do `<header>` mobile, para manter consistência visual entre os modos.

## Critérios de aceitação
- A linha horizontal abaixo da faixa superior não aparece mais no desktop.
- A linha horizontal abaixo do cabeçalho mobile também desaparece.
- Os ícones (tema e notificações) continuam alinhados à direita.
- Nenhum outro elemento visual é afetado.
