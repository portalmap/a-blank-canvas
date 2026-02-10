
# Reorganizar sidebar de documentos com pastas expansiveis

## Resumo

Transformar o sidebar de documentos para exibir uma arvore hierarquica de pastas e documentos, com setas de expansao para navegar a estrutura. "Todos os Docs", "Criados por mim" e "Favoritos" ficam como filtros. "Wikis" e "Arquivados" ficam como categorias fixas. Abaixo deles, aparece a arvore de pastas e documentos soltos.

## Alteracoes no banco de dados

### Adicionar `workspace_id` a `document_folders`

A tabela `document_folders` existe mas nao tem `workspace_id`. Precisa dessa coluna para filtrar pastas por workspace, igual a tabela `documents`.

```sql
ALTER TABLE document_folders ADD COLUMN workspace_id uuid REFERENCES workspaces(id);
```

Tambem atualizar a RLS para considerar o workspace.

## Alteracoes no codigo

### 1. Novo componente: `DocFolderTreeItem.tsx`

Criar `src/components/documents/DocsHub/DocFolderTreeItem.tsx`:

- Recebe uma pasta e a lista de documentos/subpastas
- Usa `Collapsible` para expandir/recolher
- Exibe icone de pasta + seta de expansao (`ChevronRight` rotacionando)
- Dentro do collapsible, renderiza documentos filhos e subpastas recursivamente
- Menu de contexto (3 pontos) com opcoes: Renomear, Novo Documento dentro, Excluir
- Botao `+` ao passar o mouse para criar documento dentro da pasta

### 2. Novo componente: `DocTreeItem.tsx`

Criar `src/components/documents/DocsHub/DocTreeItem.tsx`:

- Renderiza um documento individual na arvore
- Exibe emoji + titulo
- Clicavel para abrir o documento
- Menu de contexto (3 pontos): Abrir, Favoritar, Arquivar, Excluir

### 3. Atualizar `DocsHubSidebar.tsx`

Reestruturar completamente:

**Secao de filtros (topo):**
- Todos os Docs (filtro)
- Criados por mim (filtro)
- Favoritos (filtro)

**Secao de categorias:**
- Wikis -- expansivel, mostra documentos marcados como wiki
- Arquivados -- expansivel, mostra documentos arquivados

**Secao de pastas e documentos (arvore):**
- Separador visual
- Titulo "Documentos" com botao `+` para criar pasta ou documento
- Renderizar pastas raiz (sem parent) usando `DocFolderTreeItem`
- Renderizar documentos soltos (sem folder_id, nao wiki, nao arquivado) usando `DocTreeItem`

**Props adicionais necessarias:**
- `documents: Document[]` -- todos os documentos para montar a arvore
- `folders: DocumentFolder[]` -- todas as pastas
- Callbacks: `onCreateFolder`, `onCreateDocInFolder`, `onDeleteFolder`, `onRenameFolder`

### 4. Atualizar `useDocuments.ts`

- Adicionar `workspace_id` ao `useDocumentFolders` para filtrar por workspace
- Adicionar `workspace_id` ao `createFolder` mutation

### 5. Atualizar `Documents.tsx`

- Importar e usar `useDocumentFolders`
- Passar documentos e pastas para o sidebar
- Adicionar handlers para criar/renomear/excluir pastas
- Atualizar `CreateDocDialog` para aceitar `folder_id` opcional
- Adicionar dialog para criar pasta (nome + emoji opcional)

### 6. Atualizar `CreateDocDialog.tsx`

- Aceitar prop `folderId` opcional
- Quando tiver `folderId`, passar no submit

## Resultado visual esperado

```text
Sidebar:
  [filtro] Todos os Docs
  [filtro] Criados por mim
  [filtro] Favoritos
  ─────────────────
  > Wikis                    (expansivel - mostra docs wiki)
  > Arquivados               (expansivel - mostra docs arquivados)
  ─────────────────
  Documentos            [+]  (titulo + botao criar)
  > Cultura MAP         ...  (pasta - expansivel)
    > Desafios G4 SKILLS
    > Entrei para MAP e agora?
      > PLAYBOOK DE FOTO     (subdocumento)
  > Boas Praticas MAP   ...
    > Knowledge Article 1
    > Knowledge Article 2
  > Playbooks Processos ...
    > Playbook de Onboarding
    > Playbook de Check-in
  Documento Solto 1          (doc sem pasta)
  Documento Solto 2
```

## Detalhes tecnicos

- Reutilizar o padrao `Collapsible` ja usado no sidebar do workspace (SpaceTreeItem)
- `ChevronRight` com `rotate-90` quando aberto
- Pastas suportam hierarquia via `parent_folder_id`
- Documentos vinculados a pastas via `folder_id`
- A secao "Recentes" sera removida pois a arvore ja mostra todos os docs
- Nenhum dado existente sera perdido -- o `folder_id` dos documentos atuais e `null`, entao aparecerao como "soltos"
