
# Restringir Acesso do Convidado (Guest)

## Resumo

O convidado (guest) passara a ver apenas as tarefas atribuidas a ele, podendo edita-las e comentar. Na sidebar, vera somente "Inicio" e "Tudo". Todos os demais modulos (Chat, Equipes, Documentos, Paineis, Automacoes), a arvore de Workspace/Spaces e Configuracoes ficarao ocultos.

## Alteracoes

### 1. `src/hooks/useUserRole.ts` - Retornar o role do workspace

Atualmente o hook so retorna `isAdmin` e `role: 'admin' | 'member'`. Precisamos retornar o role real do workspace (`admin`, `member`, `limited_member`, `guest`) para que o frontend possa diferenciar o convidado.

- Adicionar campo `workspaceRole` ao retorno
- Apos consultar `workspace_members`, guardar o role real (ex: `guest`, `limited_member`)
- Adicionar propriedade `isGuest` como atalho booleano

### 2. `src/components/AppSidebar.tsx` - Ocultar modulos para guest

- Importar `isGuest` do `useUserRole`
- Quando `isGuest === true`:
  - Esconder todos os itens de `modulesNavItems` (Chat, Equipes, Documentos, Paineis, Automacoes)
  - Esconder a secao "Principal" inteira (arvore de workspace/spaces)
  - Esconder o botao de Configuracoes (ja esta oculto para nao-admin, mas reforcar)
- Manter visivel: "Inicio", "Tudo", troca de tema e "Sair"

### 3. `src/hooks/useFilteredAllTasks.ts` - Forcar modo "assigned" para guest

- Detectar se o usuario e guest (consultar `workspace_members.role`)
- Para guests, ignorar o `viewMode` passado e sempre buscar apenas tarefas atribuidas ao usuario (mesmo comportamento do modo `assigned`)

### 4. `src/pages/EverythingView.tsx` - Forcar viewMode para guest

- Quando o usuario for guest, fixar `viewMode` em `'assigned'` e ocultar o seletor de viewMode
- Ocultar o texto sobre "Todas as tarefas do workspace" e mostrar "Suas tarefas atribuidas"

### 5. `src/App.tsx` - Proteger rotas para guest

- Criar um componente `GuestBlockedRoute` (ou reutilizar logica no `AdminRoute`)
- Envolver as rotas `/chat`, `/teams`, `/documents`, `/dashboards`, `/automations`, `/settings`, `/space/*`, `/folder/*`, `/list/*`, `/workspaces` com protecao que redireciona guests para `/`
- Rotas permitidas para guest: `/` (Home), `/everything`, `/task/:taskId`

### 6. `src/components/MobileHeader.tsx` - Ajustar header mobile

- Verificar se o header mobile tambem respeita a mesma logica de ocultacao de itens para guest

## Detalhes tecnicos

Alteracao principal no `useUserRole`:
```text
// Apos consultar workspace_members
const workspaceRole = membership?.role || 'member';
return {
  isAdmin: false,
  isGlobalOwner: false,
  isOwner: false,
  isGuest: workspaceRole === 'guest',
  role: workspaceRole,
  workspaceRole,
};
```

Novo componente de protecao de rota:
```text
// GuestBlockedRoute - redireciona guests para /
const GuestBlockedRoute = ({ children }) => {
  const { data: userRole, isLoading } = useUserRole();
  if (isLoading) return <Loader />;
  if (userRole?.isGuest) return <Navigate to="/" />;
  return children;
};
```

Na sidebar, a logica de filtragem:
```text
const isGuest = userRole?.isGuest ?? false;

// Modulos: se guest, nao mostrar nenhum
const filteredModulesNavItems = isGuest
  ? []
  : modulesNavItems.filter(item => {
      if (item.url === '/automations') return isAdmin;
      return true;
    });

// Secao "Principal" (workspace tree): ocultar para guest
{!isGuest && (
  <SidebarGroup>
    <SidebarGroupLabel>Principal</SidebarGroupLabel>
    ...
  </SidebarGroup>
)}
```

Nao ha necessidade de alterar RLS no banco de dados, pois as policies atuais ja permitem que o guest veja tarefas do workspace e crie/edite comentarios em tarefas acessiveis. A filtragem sera feita no frontend, exibindo apenas as tarefas atribuidas.
