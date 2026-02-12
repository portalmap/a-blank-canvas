
# Forcar Selecao de Workspace ao Entrar (para todos os usuarios)

## Problema

Quando um usuario (especialmente o convidado) nao tem um workspace padrao definido, ele entra no sistema sem workspace ativo. Sem workspace ativo, o `useUserRole` nao consegue detectar o role real (retorna `isGuest: false`), e os modulos ficam todos visiveis ate que o usuario selecione um workspace manualmente.

## Solucao

Criar um componente interceptor que, quando nao ha workspace ativo, exibe um dialog/tela de selecao de workspace obrigatorio **para todos os usuarios**. Isso beneficia todos (nao so guests), pois o sistema ja depende de um workspace ativo para funcionar corretamente.

## Alteracoes

### 1. Criar `src/components/WorkspaceRequiredGuard.tsx`

Um componente que envolve o conteudo principal do app. Quando `activeWorkspace` for `null` e o usuario estiver autenticado:

- Busca a lista de workspaces do usuario
- Se tiver **apenas 1 workspace**, seleciona automaticamente (sem perguntar)
- Se tiver **mais de 1**, exibe um dialog modal obrigatorio pedindo para escolher
- O dialog tambem oferece a opcao de "Definir como padrao" para que na proxima vez ja entre direto

Layout do dialog:
- Titulo: "Selecione um Workspace"
- Lista de workspaces como cards clicaveis
- Checkbox opcional: "Definir como padrao para proximas vezes"
- Sem botao de fechar (obrigatorio escolher)

### 2. Integrar no `src/App.tsx`

Envolver o conteudo das rotas protegidas com o `WorkspaceRequiredGuard`, logo apos o `ProtectedRoute`. Assim, qualquer usuario autenticado sem workspace ativo sera interceptado antes de ver a interface.

```text
<ProtectedRoute>
  <WorkspaceRequiredGuard>
    <SidebarProvider>
      ...conteudo normal...
    </SidebarProvider>
  </WorkspaceRequiredGuard>
</ProtectedRoute>
```

### 3. Ajustar `src/contexts/WorkspaceContext.tsx`

Adicionar um flag `isLoadingDefault` que indica se o sistema ainda esta tentando carregar o workspace padrao do perfil. Isso evita que o guard exiba o dialog antes de o auto-load ter chance de rodar.

O fluxo sera:
1. Usuario faz login
2. `WorkspaceContext` tenta carregar workspace padrao do perfil
3. Se encontrar, seleciona automaticamente -> guard nao aparece
4. Se nao encontrar, `isLoadingDefault` vira false -> guard exibe dialog

### 4. Nenhuma alteracao no banco de dados

A funcionalidade de `default_workspace_id` no `profiles` ja existe. Sera reutilizada para salvar a preferencia quando o usuario marcar "Definir como padrao".

## Detalhes tecnicos

Componente `WorkspaceRequiredGuard`:
```text
- Usa useWorkspace() para checar activeWorkspace
- Usa useWorkspaces() para listar workspaces disponiveis
- Usa useSetDefaultWorkspace() para salvar preferencia
- Se workspaces.length === 1, chama setActiveWorkspace automaticamente
- Se workspaces.length > 1, renderiza Dialog com preventClose
- Ao selecionar, chama setActiveWorkspace(workspace)
- Se checkbox "padrao" marcado, tambem chama setDefaultWorkspace.mutate(workspace.id)
```

Flag no WorkspaceContext:
```text
- Novo estado: isLoadingDefault (inicia true, vira false apos loadDefaultWorkspace completar)
- Expor no contexto para o guard saber quando esperar
- Guard so mostra dialog quando isLoadingDefault === false E activeWorkspace === null
```
