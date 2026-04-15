

# Alterar validade das URLs assinadas de 15 para 45 dias

## O que muda

Todos os links temporários de arquivos (anexos de tarefas, anexos do chat, figurinhas) passam de 15 dias para 45 dias de validade.

45 dias = 3.888.000 segundos.

## Arquivos

Trocar `1296000` por `3888000` em:

1. **`src/hooks/useTaskAttachments.ts`** — 2 ocorrências (linhas 28 e 41)
2. **`src/hooks/useChatAttachments.ts`** — 3 ocorrências (linhas 25, 38 e 73)
3. **`src/hooks/useStickers.ts`** — 3 ocorrências (linhas 29, 70 e 105)
4. **`supabase/functions/api-gateway/index.ts`** — 2 ocorrências (linhas 12 e 1297)

Nenhuma outra alteração. Nenhum componente visual ou lógica de negócio é afetado.

