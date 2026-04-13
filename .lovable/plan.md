
# Ajuste proposto: limitar a largura visual da mensagem a ~110 caracteres

## Diagnóstico

Sim, essa é uma boa direção.

O problema não é o texto “não saber quebrar”. O problema é que a área da mensagem ainda está deixando o conteúdo se espalhar demais na horizontal. Então, em vez de depender só da largura do chat e do sidebar, podemos dar um limite fixo para o bloco da mensagem.

Assim, a lógica fica:
- a mensagem nunca tenta ocupar uma linha “infinita”
- se houver espaço de sobra, ela para em uma largura confortável
- se o sidebar ou a thread apertarem a área, ela continua respeitando o espaço menor
- o texto desce inteiro para a linha de baixo, sem cortar palavra no meio

Importante: isso não deve limitar a quantidade de texto salva, nem cortar conteúdo. É só um limite visual de largura.

## O que vou implementar

### 1. `src/components/chat/ChatMessageItem.tsx`
Aplicar um limite visual ao conteúdo textual da mensagem usando algo como:

- `w-full`
- `max-w-[110ch]`
- `min-w-0`

A ideia é colocar esse limite no bloco que contém:
- texto
- anexos
- reações
- indicador de thread
- status de atribuição

Sem mexer:
- nos botões de hover
- na caixa de escrever mensagem
- nos botões já funcionando no header/composer

### 2. Manter a quebra correta das palavras
No texto da mensagem, manter a estratégia de:
- preservar espaços e quebras naturais
- quebrar linha sem partir palavra comum ao meio
- nunca voltar para `break-all`

Ou seja: o texto desce inteiro para a próxima linha quando não couber.

### 3. Validar também no painel lateral de thread
Como a thread reduz ainda mais a largura disponível, o mesmo limite precisa funcionar lá também.

Se necessário, o ajuste estrutural já existente em:
- `src/components/chat/ChatRoom.tsx`
- `src/components/chat/ThreadPanel.tsx`

será mantido, mas sem alterar layout de botões nem input.

## Resultado esperado

Depois disso:
- com o sidebar aberto, a mensagem para de se esticar demais
- com a thread aberta, ela continua quebrando corretamente
- palavras comuns permanecem inteiras
- mensagens longas ficam mais legíveis
- nada é truncado nem “apagado”; só muda a largura visual do bloco

## Observação importante

“110 caracteres” aqui será tratado como largura visual aproximada (`110ch`), não como contagem exata de letras. Isso é melhor porque:
- não altera o texto salvo
- não injeta quebra artificial dentro da mensagem
- funciona de forma responsiva conforme o espaço real disponível

## Arquivos envolvidos

- `src/components/chat/ChatMessageItem.tsx`
- possível ajuste fino em `src/components/chat/ChatRoom.tsx`
- possível ajuste fino em `src/components/chat/ThreadPanel.tsx`

## Detalhe técnico

A implementação ideal não é “quebrar a string a cada 110 caracteres”, porque isso pode:
- separar frases em lugares ruins
- quebrar links, nomes ou sequências especiais
- criar um comportamento artificial

O melhor é limitar a largura visual do bloco da mensagem com `max-w-[110ch]`, deixando o navegador descer o texto naturalmente quando faltar espaço.
