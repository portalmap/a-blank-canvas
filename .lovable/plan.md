## Diagnóstico

Hoje, com 0 workspaces, o `WorkspaceRequiredGuard` renderiza:
> "Nenhum workspace disponível. Contate o administrador."

Isso bloqueia inclusive um `administrador_global` (via `user_roles.role IN ('global_owner','owner','admin')`) que deveria conseguir entrar e criar o primeiro workspace.

## Correção

Em `src/components/WorkspaceRequiredGuard.tsx`, quando `workspaces.length === 0`:

1. Consultar `user_roles` do usuário logado (a mesma checagem que o `WorkspaceContext` já faz para permissão global).
2. Se `hasGlobalPermission` (`global_owner` / `owner` / `admin`):
   - Redirecionar para `/workspaces` (a página existente `WorkspaceOverview` já permite criar/gerenciar workspaces). Usar `useNavigate` do `@/lib/router-compat` com `replace: true`.
   - Enquanto o redirect não acontece, renderizar spinner (não a mensagem de bloqueio).
3. Se não tem permissão global: manter a mensagem atual "Nenhum workspace disponível. Contate o administrador."

Também exportar/expor a checagem via `useState` local no guard (buscar uma vez após confirmar `workspaces.length === 0`); não vale a pena mover para o `WorkspaceContext` porque só o guard precisa.

## Alternativa considerada e descartada

Auto-criar um workspace "Meu workspace" no primeiro acesso do admin — evita fricção mas cria dado sem intenção; melhor levar à tela de gestão.

## Fora do escopo

- Fluxo do SSO/Hub.
- Regras de RLS ou migrações.
- Comportamento de usuários com role de workspace (member/guest) — continua igual.

## Verificação

- Login SSO com usuário `administrador_global` sem workspace → cai em `/workspaces` sem ver a mensagem de bloqueio; consegue criar o primeiro workspace e o `WorkspaceRequiredGuard` deixa passar depois.
- Usuário comum sem workspace → continua vendo a mensagem "Nenhum workspace disponível…".
- Usuário com 1+ workspaces → comportamento inalterado (auto-seleção / diálogo de seleção).
