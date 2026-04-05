
# Templates de Pastas e Listas em Configurações

## Resumo

Expandir a aba "Templates" para suportar 3 tipos: **Space** (existente), **Pasta** e **Lista**, reutilizando as mesmas tabelas com um novo campo `type`.

## Abordagem

Reutilizar as tabelas existentes (`space_templates`, `space_template_folders`, `space_template_lists`, `space_template_tasks`) adicionando coluna `type` ao `space_templates`.

- **Template de Space**: Space com pastas, listas e tarefas (já existe)
- **Template de Pasta**: 1 pasta raiz + suas listas e tarefas
- **Template de Lista**: 1 lista raiz + suas tarefas

## Alterações

### 1. Migração SQL
```sql
ALTER TABLE space_templates ADD COLUMN type text NOT NULL DEFAULT 'space';
-- Valores: 'space', 'folder', 'list'
```

### 2. `src/components/settings/SpaceTemplateSettings.tsx`
- Adicionar sub-tabs: "Spaces", "Pastas", "Listas"
- Cada sub-tab filtra templates por `type` e abre o editor correto

### 3. `src/components/settings/SpaceTemplateList.tsx`
- Receber prop `type` para filtrar e exibir contagens relevantes (ex: template de lista mostra apenas tarefas, não pastas)

### 4. Criar `src/components/settings/FolderTemplateEditor.tsx`
- Nome, descrição da pasta
- Listas dentro (com status template)
- Tarefas dentro de cada lista
- Sem cor de space ou múltiplas pastas

### 5. Criar `src/components/settings/ListTemplateEditor.tsx`
- Nome, descrição, view padrão, status template da lista
- Tarefas dentro da lista

### 6. `src/hooks/useSpaceTemplates.ts`
- Filtrar queries por `type`
- Criar `useApplyFolderTemplate` (aplica pasta + listas + tarefas em Space existente)
- Criar `useApplyListTemplate` (aplica lista + tarefas em pasta ou Space)
- Mutations de criação/edição parametrizadas por tipo

### 7. Integrar nos dialogs de criação
- Ao criar pasta → opção de usar template de pasta
- Ao criar lista → opção de usar template de lista

## Arquivos
- **Migração**: 1 SQL
- **Editados**: `SpaceTemplateSettings.tsx`, `SpaceTemplateList.tsx`, `useSpaceTemplates.ts`
- **Criados**: `FolderTemplateEditor.tsx`, `ListTemplateEditor.tsx`
- **Editados depois**: Dialogs de criação de pasta/lista
