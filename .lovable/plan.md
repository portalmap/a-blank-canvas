

# Mostrar seguidores reais no diálogo "Seguir Automaticamente"

## Problema

O diálogo "Seguir Automaticamente" mostra apenas seguidores criados via automação (buscando na tabela `automations`). Mirian e Amanda foram adicionadas diretamente na tabela `space_followers`, por isso não aparecem na seção "Seguidores atuais".

## Solução

Alterar o `QuickAutomationButtons` para, quando o `actionType` for `auto_add_follower`, buscar e exibir também os seguidores reais da entidade (Space/Folder/List), além dos que vieram de automações.

## Alterações

### `src/components/automations/QuickAutomationButtons.tsx`

1. Importar os hooks de seguidores existentes (`useSpaceFollowers`, `useFolderFollowers`, `useListFollowers`)
2. Buscar seguidores reais com base no `scopeType` quando o diálogo abre com `auto_add_follower`
3. Na seção "Seguidores atuais", exibir 2 grupos:
   - **Seguidores diretos** (da tabela `space_followers`/`folder_followers`/`list_followers`) — com botão de remover que usa os hooks `useRemoveSpaceFollower` etc.
   - **Seguidores via automação** (já existente) — com botão de remover automação
4. Permitir adicionar novos seguidores diretos (não apenas via automação) usando os hooks `useAddSpaceFollower` etc.

Resultado: o diálogo mostra todos os seguidores independente de como foram adicionados, e permite gerenciá-los de forma unificada.

## Arquivos
- 1 arquivo editado: `src/components/automations/QuickAutomationButtons.tsx`

