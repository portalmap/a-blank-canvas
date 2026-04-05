

# Editar nome do template de automação

## Resumo

Adicionar opção "Renomear" no menu de contexto (⋯) de cada template na lista de Modelos de Automação. Ao clicar, abre um dialog simples com input para o novo nome.

## Alterações

### `src/components/settings/AutomationTemplateList.tsx`
- Adicionar estado para controlar o dialog de renomear (`renamingTemplate: {id, name} | null`)
- Adicionar item "Renomear" no `DropdownMenu` (antes de "Editar Automações")
- Adicionar um `Dialog` com input de texto e botão salvar
- Usar mutation do Supabase para `update` na tabela `space_templates` (apenas o campo `name`)
- Invalidar query `space-templates` após sucesso

## Resultado
- 1 arquivo editado
- Menu passa a ter: Renomear, Editar Automações, Duplicar, Aplicar em Spaces

