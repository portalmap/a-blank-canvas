

# Modelos de Automação em Configurações + Remoção de Convites/Convidados

## Resumo

Criar uma aba "Automações" em Configurações para gerenciar modelos de automação independentes (similar aos Modelos de Status). Remover as abas "Convites" e "Convidados".

## O que já existe

O sistema já tem automações de template vinculadas a Space Templates (`space_template_automations`), com lógica de mapeamento por nome de pastas/listas (`createFolderMap`/`createListMap`) e aplicação em massa (`useApplyTemplateAutomationsToSpaces`). A nova aba reutilizará essa mesma infraestrutura.

## Alterações

### 1. Atualizar `src/pages/Settings.tsx`
- Remover as abas "Convites" (`invites`) e "Convidados" (`guests`)
- Remover imports de `UserInviteForm` e `GuestPermissionsManager`
- Adicionar aba "Automações" com novo componente `AutomationTemplateSettings`
- Grid de 9 colunas (era 11)

### 2. Criar `src/components/settings/AutomationTemplateSettings.tsx`
Componente principal da aba, estrutura idêntica ao `StatusSettings.tsx`:
- Seletor de workspace
- Card "Modelos de Automação" com lista + botão criar
- Card "Aplicar Modelo em Spaces" para aplicação em massa

### 3. Criar `src/components/settings/AutomationTemplateList.tsx`
Lista de templates de automação (padrão igual ao `StatusTemplateList`):
- Busca na tabela `space_template_automations` agrupada por `template_id`
- Usa os Space Templates existentes como "modelos de automação"
- Pesquisa, editar, duplicar, excluir, aplicar em spaces
- Ação "Aplicar em Spaces" abre o `ApplyTemplateAutomationsDialog` já existente

### 4. Reutilizar componentes existentes
- `ApplyTemplateAutomationsDialog` — já faz exatamente o que o usuário quer (mapeia por nome, aplica em múltiplos spaces)
- `TemplateAutomationsSection` — já gerencia automações individuais dentro de um template
- `TemplateAutomationDialog` — já permite criar/editar automações no template

### Fluxo do usuário
```text
Configurações → Aba Automações
  ├── Selecionar Workspace
  ├── Ver lista de Space Templates que possuem automações
  ├── Editar automações de cada template (abre editor existente)
  ├── Aplicar automações em Spaces destino
  │   ├── Seleciona spaces (filtrados pelo padrão de nome)
  │   ├── Sistema mapeia pastas/listas por nome
  │   └── Cria automações reais no space destino
  └── Criar novo modelo (redireciona ao editor de template)
```

### Lógica de mapeamento (já implementada)
Quando o usuário aplica automações em um space destino:
1. Busca pastas/listas do template
2. Busca pastas/listas reais do space destino
3. Mapeia por **nome** (`startsWith`) — funciona porque a estrutura é padronizada, variando apenas o nome do cliente
4. Remapeia `scope_id`, `target_list_id` e demais referências
5. Cria automações reais na tabela `automations`

## Arquivos
- **Editado**: `src/pages/Settings.tsx` (remover 2 abas, adicionar 1)
- **Criado**: `src/components/settings/AutomationTemplateSettings.tsx`
- **Criado**: `src/components/settings/AutomationTemplateList.tsx`
- Sem migração de banco necessária — reutiliza tabelas existentes

