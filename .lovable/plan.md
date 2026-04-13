

# Correção: Não quebrar palavras no meio

## Problema

O `break-all` quebra palavras em qualquer caractere, cortando palavras no meio e prejudicando a leitura/gramática. O correto é usar apenas `break-words` (equivalente a `overflow-wrap: break-word`), que só quebra uma palavra quando ela sozinha não cabe na linha.

## Correção

### Editar `src/components/chat/ChatMessageItem.tsx` — linha 148

Remover `break-all` da classe do parágrafo:

- De: `"whitespace-pre-wrap break-words break-all overflow-hidden"`
- Para: `"whitespace-pre-wrap break-words overflow-hidden"`

## Arquivo

- 1 editado: `ChatMessageItem.tsx`

