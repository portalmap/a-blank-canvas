# Aplicar automações de templates de Pasta e Lista em massa

Hoje só o template de Space tem a ação "Aplicar automações em Spaces". Os templates de Pasta e de Lista ganham a mesma capacidade: um template de pasta aplica suas automações em pastas existentes; um template de lista aplica em listas existentes.

## O que muda para você

- No menu de cada template de Pasta aparece "Aplicar automações em Pastas".
- No menu de cada template de Lista aparece "Aplicar automações em Listas".
- Ao clicar, abre uma janela com a árvore de locais (Space > Pasta > Lista), com busca e opção de marcar/desmarcar tudo. No template de pasta só as pastas podem ser marcadas; no de lista, só as listas.
- A janela mostra quantas automações habilitadas o template tem e a estimativa do total que será criado.
- Se o destino já tiver automações vindas desse template, elas são **substituídas** (as antigas equivalentes são removidas e recriadas com a configuração atual do template), evitando duplicações.
- No fim, um resumo: destinos processados, automações criadas/substituídas e eventuais erros.

## Detalhes técnicos

1. **Novo diálogo genérico** `ApplyTemplateAutomationsToScopeDialog.tsx` (baseado no `ApplyTemplateAutomationsDialog.tsx` atual), recebendo `templateId` e `targetType: 'folder' | 'list'`. Reutiliza `LocationTree` (spaces/folders/lists do workspace, spaces arquivados filtrados), com seleção restrita ao `targetType`, busca e "selecionar todos".
2. **Novos hooks** em `src/hooks/useSpaceTemplates.ts`:
   - `useApplyTemplateAutomationsToFolders` e `useApplyTemplateAutomationsToLists` (ou um único hook parametrizado por `targetType`).
   - Para cada destino: lê as automações habilitadas do template (`space_template_automations`), mapeia referências de pasta/lista do template para o destino real e mapeia status por nome (mesma estratégia do fluxo de Spaces, reaproveitando `remapAutomation` e o mapa de status por lista).
   - No caso de pasta: as listas internas reais são usadas para resolver automações de escopo lista do template; no caso de lista, o escopo é a própria lista.
3. **Sobrescrita**: antes de inserir, apagar as automações existentes no escopo destino que correspondam às do template (mesmo `name` + `trigger_type` + `action_type` no mesmo `scope_type`/`scope_id`), e então inserir as novas. O resultado conta `automationsCreated` e `automationsReplaced`.
4. **Menu**: em `SpaceTemplateList.tsx`, liberar o item de aplicar automações também para `type === 'folder'` e `type === 'list'`, com rótulo e diálogo correspondentes.
5. Invalidação de `['automations']` no sucesso e toasts de resultado, como no fluxo atual. Nenhuma mudança de banco de dados é necessária.
