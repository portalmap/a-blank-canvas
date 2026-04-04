

# Corrigir aba Automações: mostrar apenas automações, não o template completo

## Problema

Ao clicar "Editar Automações" na aba de Automações das Configurações, abre o `SpaceTemplateEditor` completo (com estrutura de pastas, listas, tarefas, cores, etc.) — exatamente igual à aba Templates. O usuário quer ver **apenas** as automações do template, com opções de criar, editar, ativar/desativar, duplicar, excluir e aplicar em Spaces.

## Solução

### `src/components/settings/AutomationTemplateSettings.tsx`
- Substituir o `SpaceTemplateEditor` por uma tela dedicada que mostra apenas:
  - Botão voltar + nome do template
  - O componente `TemplateAutomationsSection` (já existe e gerencia automações individualmente)
  - Botão "Aplicar em Spaces" para aplicação em massa
- Buscar folders/lists do template via `useSpaceTemplate(templateId)` para passar ao `TemplateAutomationsSection` (necessário para exibir o escopo das automações)

### `src/components/settings/AutomationTemplateList.tsx`
- Sem alteração funcional — já está correto (lista templates com automações e permite editar/aplicar)

## Resultado
A aba Automações fica independente e focada: lista os templates que têm automações, ao clicar "Editar" mostra apenas a gestão de automações (sem a estrutura completa do template), e permite aplicar em Spaces.

