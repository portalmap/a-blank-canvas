

# Duplicar Template de Automações

## Resumo

Adicionar opção "Duplicar" no menu de contexto do template na tela "Modelos de Automação". Ao duplicar, copia o template inteiro (pastas, listas, tarefas) e todas as automações associadas, remapeando os IDs internos corretamente.

## Alterações

### 1. `src/hooks/useSpaceTemplates.ts`
- Criar hook `useDuplicateSpaceTemplate` que:
  1. Busca o template completo (pastas, listas, tarefas) via `useSpaceTemplate`
  2. Cria novo template com nome "CLONE - {nome}"
  3. Insere pastas, listas e tarefas com novos IDs, mantendo mapeamento old→new
  4. Busca automações do template original (`space_template_automations`)
  5. Insere automações no novo template, remapeando `folder_ref_id` e `list_ref_id` usando o mapeamento old→new
  6. Todas as automações duplicadas ficam desativadas (`enabled: false`)

### 2. `src/components/settings/AutomationTemplateList.tsx`
- Importar `useDuplicateSpaceTemplate` e ícone `Copy`
- Adicionar prop `onDuplicate` no `TemplateRow`
- Adicionar item "Duplicar" no `DropdownMenu` (entre "Editar Automações" e "Aplicar em Spaces")
- Chamar mutation de duplicação ao clicar

## Resultado
- Menu do template mostra 3 opções: Editar Automações, Duplicar, Aplicar em Spaces
- Ao duplicar, cria cópia completa com automações remapeadas e desativadas
- 2 arquivos editados

