
# Corrigir Visualizacao de Pastas de Documentos

## Diagnostico

Investiguei o banco de dados, as politicas RLS, os tipos e o codigo. Tudo esta configurado corretamente:
- As 4 pastas existem no banco com `workspace_id` preenchido
- As politicas RLS baseadas em workspace estao ativas
- O hook `useDocumentFolders` filtra por `workspace_id`

O problema mais provavel e que voce esta testando no site **publicado** (mapflow.lovable.app), onde a migracao do banco ainda nao foi aplicada. As alteracoes de banco so afetam o ambiente de teste ate que voce publique.

## Alteracoes para garantir consistencia

### 1. Atualizar interface `DocumentFolder` em `src/hooks/useDocuments.ts`

Adicionar o campo `workspace_id` que esta faltando na interface TypeScript:

```text
export interface DocumentFolder {
  id: string;
  name: string;
  user_id: string;
  workspace_id: string | null;   // <-- ADICIONAR
  parent_folder_id: string | null;
  color: string;
  is_wiki: boolean;
  created_at: string;
  updated_at: string;
}
```

### 2. Publicar o projeto

Apos a alteracao, publique o projeto para que a migracao do banco (que atualizou as politicas RLS de `user_id` para `workspace_id`) seja aplicada no ambiente de producao.

## Resumo

A correcao principal e pequena (adicionar `workspace_id` na interface) e a publicacao e necessaria para sincronizar o banco de producao.
