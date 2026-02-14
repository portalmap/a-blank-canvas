

# Mostrar Usuarios Atribuidos nas Automacoes Existentes

## Problema

O dialog de "Atribuicao Automatica" e "Seguir Automaticamente" (QuickAutomationButtons) nao mostra quem ja esta atribuido por automacoes existentes naquele escopo. O usuario precisa ir ate a lista de automacoes para verificar, dificultando a organizacao.

## Solucao

Adicionar uma secao no dialog que lista os usuarios ja atribuidos por automacoes existentes para aquele escopo e tipo de acao, antes do seletor de novos usuarios.

## Alteracao

### `src/components/automations/QuickAutomationButtons.tsx`

1. Importar `useAutomationsByScope` de `@/hooks/useAutomations`
2. Importar `Avatar`, `AvatarImage`, `AvatarFallback` e `Badge` dos componentes UI
3. Importar `Trash2` do lucide-react e `useDeleteAutomation` do hook
4. Buscar automacoes existentes para o escopo atual usando `useAutomationsByScope(scopeType, scopeId)`
5. Filtrar automacoes pelo `actionType` selecionado (auto_assign_user ou auto_add_follower)
6. Extrair os `user_ids` (ou `user_id` legado) do `action_config` de cada automacao
7. Cruzar com a lista de `members` para obter nomes e avatares
8. Exibir uma lista visual dos usuarios ja atribuidos acima do seletor, com:
   - Avatar e nome de cada usuario
   - Botao de remover (X ou lixeira) que deleta a automacao correspondente
   - Mensagem "Nenhum usuario atribuido ainda" quando vazio
9. Separar visualmente a secao de "Atribuidos" da secao de "Adicionar novos"

Layout do dialog ficara:

```
Atribuicao Automatica
Descricao...

-- Usuarios atribuidos --
[Avatar] Joao Silva        [X]
[Avatar] Maria Santos      [X]

-- Adicionar novos --
[Seletor de usuarios multi-select]

[Cancelar]  [Criar Automacao]
```

### Detalhes tecnicos

- Usar `useAutomationsByScope(scopeType, scopeId)` para buscar automacoes ativas do escopo
- Filtrar por `automation.action_type === actionType` e `automation.trigger === 'on_task_created'`
- Para cada automacao filtrada, extrair usuarios: `actionConfig.user_ids || [actionConfig.user_id]`
- Usar `useDeleteAutomation` para permitir remover automacoes existentes diretamente do dialog
- Invalidar queries apos deletar para atualizar a lista em tempo real
- Nenhuma alteracao no banco de dados necessaria

