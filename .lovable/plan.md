
# Pastas dentro de Wikis + Mover Documentos

## Resumo

Adicionar suporte a pastas dentro da secao Wikis do sidebar, com opcao de criar pastas pelo menu de 3 pontinhos. Tambem adicionar funcionalidade de "Mover" documentos para qualquer pasta (incluindo pastas wiki).

## Alteracoes no banco de dados

### Adicionar coluna `is_wiki` a `document_folders`

Para distinguir pastas normais de pastas wiki, adicionar uma flag na tabela:

```sql
ALTER TABLE document_folders ADD COLUMN is_wiki boolean DEFAULT false;
```

Isso permite filtrar pastas que pertencem a secao Wiki separadamente.

## Alteracoes no codigo

### 1. Atualizar `DocsHubSidebar.tsx` -- Menu de 3 pontinhos no Wiki

Na secao Wikis, adicionar um botao de 3 pontinhos com opcoes:
- **Nova Pasta** -- cria pasta dentro da secao Wiki (`is_wiki = true`)
- **Novo Documento Wiki** -- cria documento wiki

Dentro do collapsible de Wikis, renderizar:
- Pastas wiki (usando `DocFolderTreeItem`) com documentos wiki dentro
- Documentos wiki soltos (sem `folder_id`)

Novas props necessarias:
- `onCreateWikiFolder` -- callback para criar pasta wiki
- `onCreateWikiDoc` -- callback para criar documento wiki
- `onMoveDoc` -- callback para mover documento

### 2. Atualizar `DocTreeItem.tsx` -- Opcao "Mover"

Adicionar item "Mover para..." no menu de 3 pontinhos de cada documento. Ao clicar, abre um dialog para selecionar a pasta destino.

Nova prop:
- `onMove?: (doc: Document) => void`

### 3. Criar `MoveDocumentDialog.tsx`

Novo componente dialog que:
- Lista todas as pastas disponiveis (normais e wiki)
- Permite selecionar uma pasta destino
- Opcao "Sem pasta" para remover o documento de qualquer pasta
- Ao confirmar, atualiza o `folder_id` do documento
- Se mover para pasta wiki, marca o documento como `is_wiki = true`
- Se mover para pasta normal, marca como `is_wiki = false`

### 4. Atualizar `useDocuments.ts`

- Adicionar mutation `moveDocument` que atualiza `folder_id` (e opcionalmente `is_wiki`)
- Atualizar `useDocumentFolders` para incluir `is_wiki` no `createFolder`
- Adicionar parametro `is_wiki` ao `createFolder` mutation

### 5. Atualizar `Documents.tsx`

- Adicionar estado para o dialog de mover documento
- Adicionar handlers: `handleMoveDoc`, `handleCreateWikiFolder`, `handleCreateWikiDoc`
- Passar novas props para `DocsHubSidebar`
- Renderizar `MoveDocumentDialog`

### 6. Atualizar `DocFolderTreeItem.tsx`

- Passar prop `onMoveDoc` para os `DocTreeItem` filhos
- Permitir que documentos dentro de pastas tambem possam ser movidos

## Resultado visual esperado

```text
Sidebar Wikis:
  v  Wikis                    20  [...]  <-- menu: Nova Pasta, Novo Wiki
     > Cultura MAP            [...]      <-- pasta wiki expansivel
       > Doc dentro da pasta
     > Boas Praticas          [...]
       > Doc 1
       > Doc 2
     Wiki Solto 1                        <-- wiki sem pasta
     Wiki Solto 2

Menu do documento (3 pontinhos):
  - Abrir
  - Favoritar
  - Mover para...    <-- NOVO
  - Arquivar
  - Excluir

Dialog "Mover para...":
  [x] Sem pasta (raiz)
  [ ] Cultura MAP (Wiki)
  [ ] Boas Praticas (Wiki)
  [ ] Pasta Normal 1
  [ ] Pasta Normal 2
  [Cancelar] [Mover]
```

## Detalhes tecnicos

- Reutilizar `DocFolderTreeItem` dentro da secao Wikis para renderizar pastas wiki
- O `MoveDocumentDialog` usa `Select` ou lista de radio buttons com todas as pastas
- Ao mover documento para pasta wiki, automaticamente setar `is_wiki = true`
- Ao mover documento para pasta normal, setar `is_wiki = false`
- Pastas wiki sao filtradas por `is_wiki = true` no sidebar
