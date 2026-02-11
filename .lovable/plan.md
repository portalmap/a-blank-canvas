

# Melhorar Caixa de Mensagem do Chat

## Resumo

Fazer o textarea do chat expandir automaticamente conforme o usuario digita, ate um limite maximo de altura, e exibir barra de rolagem quando ultrapassar esse limite.

## Alteracoes

### `src/components/chat/ChatInput.tsx`

1. Adicionar logica de auto-resize no textarea:
   - No `onChange`, ajustar `style.height` do textarea com base no `scrollHeight`
   - Definir `min-height: 44px` (1 linha) e `max-height: 200px` (~8 linhas)
   - Quando o conteudo ultrapassar 200px, ativar `overflow-y: auto` (barra de rolagem)
   - Ao enviar mensagem (limpar conteudo), resetar a altura para o minimo

2. Remover `rows={1}` e usar controle via `style.height` direto no elemento

### Detalhes tecnicos

- Usar `useEffect` ou callback no `onChange` para recalcular altura:
  ```
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };
  ```
- Adicionar `overflow-y: hidden` quando menor que max, `overflow-y: auto` quando atingir max
- No `handleSubmit`, apos limpar conteudo, resetar `textareaRef.current.style.height = '44px'`

