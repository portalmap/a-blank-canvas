

# Alterar expiração de signed URLs de 1h para 15 dias

## Resumo

Trocar todos os `3600` (1 hora) por `1296000` (15 dias = 15 × 24 × 3600) nas chamadas `createSignedUrl` e `createSignedUrls` em todos os arquivos do projeto.

## Alterações

### 1. `src/hooks/useTaskAttachments.ts` (linhas 28 e 41)
- `createSignedUrl(path, 3600)` → `createSignedUrl(path, 1296000)`
- `createSignedUrls(paths, 3600)` → `createSignedUrls(paths, 1296000)`

### 2. `src/hooks/useChatAttachments.ts` (linhas 25, 38, 73)
- Três ocorrências de `3600` → `1296000`

### 3. `src/hooks/useStickers.ts` (linhas 29, 70, 105)
- Três ocorrências de `3600` → `1296000`

### 4. `supabase/functions/api-gateway/index.ts` (linhas 12 e 1297)
- Duas ocorrências de `3600` → `1296000`

## Arquivos

- 4 editados: `useTaskAttachments.ts`, `useChatAttachments.ts`, `useStickers.ts`, `api-gateway/index.ts`

