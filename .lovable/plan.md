# Templates de Pastas e Listas em Configurações

## Resumo

Expandir a aba "Templates" em Configurações para suportar 3 tipos de templates: **Space** (existente), **Pasta** e **Lista**. Cada tipo permite criar modelos reutilizáveis com sua estrutura interna.

## Estrutura dos tipos

- **Template de Space**: Space completo com pastas, listas e tarefas (já existe)
- **Template de Pasta**: Uma pasta com listas e tarefas dentro
- **Template de Lista**: Uma lista com tarefas dentro

## Abordagem técnica

Reutilizar as mesmas tabelas existentes (`space_templates`, `space_template_folders`, `space_template_lists`, `space_template_tasks`) adicionando um campo `type` ao `space_templates` para distinguir os 3 tipos.

### 1. Migração de banco de dados

Adicionar coluna `type` à tabela `space_templates`:

```sql
ALTER TABLE space_templates 
  ADD COLUMN type text NOT NULL DEFAULT 'space';
-- Valores: 'space', 'folder', 'list'
```

Para templates do tipo **folder**: cria-se 1 registro em `space_template_folders` (a pasta raiz) + suas listas e tarefas.  
Para templates do tipo **list**: cria-se 1 registro em `space_template_lists` (a lista raiz) + suas tarefas (sem pastas).

### 2. Reorganizar a UI da aba Templates

**`src/components/settings/SpaceTemplateSettings.tsx`**  
- Adicionar sub-tabs ou seções separadas: "Spaces", "Pastas", "Listas"
- Cada seção mostra apenas os templates do respectivo tipo
- Botão "Criar Template" abre seletor de tipo ou cada seção tem seu próprio botão

### 3. Criar editor para template de Pasta

**`src/components/settings/FolderTemplateEditor.tsx`**  
- Similar ao SpaceTemplateEditor mas simplificado:
  - Nome da pasta, descrição
  - Listas dentro da pasta (com status template)
  - Tarefas dentro de cada lista
  - Sem a parte de "cor do space" ou múltiplas pastas

### 4. Criar editor para template de Lista

**`src/components/settings/ListTemplateEditor.tsx`**  
- Ainda mais simples:
  - Nome da lista, descrição, view padrão, status template
  - Tarefas dentro da lista
  - Sem pastas

### 5. Atualizar hooks

**`src/hooks/useSpaceTemplates.ts`**  
- Adicionar filtro por `type` nos queries existentes
- Criar hooks `useFolderTemplates`, `useListTemplates` (ou parametrizar o existente)
- Criar mutations `useCreateFolderTemplate`, `useCreateListTemplate`
- Criar funções de aplicação: `useApplyFolderTemplate` (cria pasta + listas + tarefas em um Space existente) e `useApplyListTemplate` (cria lista + tarefas em uma pasta ou space existente)

### 6. Integrar aplicação de templates

Quando o usuário cria uma nova pasta ou lista manualmente, oferecer opção de usar template (similar ao que já existe no `CreateSpaceDialog`):
- Ao criar pasta em um Space → opção de usar template de pasta
- Ao criar lista em uma pasta/space → opção de usar template de lista

## Arquivos

- **Migração**: 1 SQL (adicionar coluna `type`)
- **Editados**: `SpaceTemplateSettings.tsx`, `SpaceTemplateList.tsx`, `useSpaceTemplates.ts`
- **Criados**: `FolderTemplateEditor.tsx`, `ListTemplateEditor.tsx`
- **Editados depois**: Dialogs de criação de pasta/lista para oferecer opção de template
