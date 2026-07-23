
# Plano: Documento de referência da camada administrativa

Objetivo único: gerar `docs/PADROES-TELAS-ADMIN-MAPFLOW.md` com base em investigação do código atual. Nenhuma alteração de código será feita.

## Investigação a realizar

Antes de escrever o documento, ler estes arquivos para extrair trechos reais (5-15 linhas):

**Proteção de rota e papéis**
- `src/components/AdminRoute.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/components/WorkspaceRequiredGuard.tsx`
- `src/hooks/useUserRole.ts`
- `src/hooks/useAppRole.ts`
- `src/routes/_authenticated/route.tsx`
- `src/routes/_authenticated/settings.tsx` (exemplo de rota protegida por admin)
- `src/contexts/AuthContext.tsx`, `src/contexts/WorkspaceContext.tsx`

**Telas administrativas existentes**
- `src/page-views/Settings.tsx` (já em contexto)
- `src/components/settings/*` (UserManagement, WorkspaceSettings, etc.)
- `src/page-views/ArchivedSpaces.tsx`, `src/page-views/Automations.tsx`
- Estrutura de rotas em `src/routes/_authenticated/`
- Shell: `src/components/AppSidebar.tsx`, `src/components/MobileHeader.tsx`

**Leitura de dados server-only (ponto crítico)**
- Edge Functions relevantes: `supabase/functions/get-user-emails/index.ts`, `reset-user-password/index.ts`, `add-user-with-invite/index.ts`, `update-user-email/index.ts`, `migrate-helper/index.ts`
- Consumo no front: `src/hooks/useAllProfiles.ts`, `src/hooks/useWorkspaceMembers.ts`, componentes em `src/components/settings/UserManagement.tsx`
- Padrão de invocação: `supabase.functions.invoke(...)` (visto em `AuthContext` e `useSessionGuard`)
- Confirmar que TanStack `createServerFn` **não** é usado para admin (padrão do projeto é Edge Function)
- `src/integrations/supabase/client.server.ts` e `auth-middleware.ts` — existem mas checar se são efetivamente usados

**Componentes de UI**
- `components.json` (shadcn new-york, lucide) — já em contexto
- `src/components/ui/*` — listar componentes de tabela/dialog/toast disponíveis
- Uso real de tabela: procurar em `src/components/settings/UserManagement.tsx`, `src/components/dashboards/DashboardsTable.tsx`, `src/components/documents/DocsHub/DocsHubTable.tsx`
- Toast: `sonner` (visto em AuthContext)
- Estados vazio/loading/erro: padrões em hooks com react-query

**Convenções**
- Nomenclatura: `page-views/` para páginas, `routes/` para roteamento, `hooks/use*`, `components/<dominio>/`
- Idioma: PT-BR em UI (visto em Settings.tsx), inglês em código
- Datas: procurar `src/lib/dateUtils.ts` e uso de `date-fns` no `package.json`

## Estrutura do arquivo `docs/PADROES-TELAS-ADMIN-MAPFLOW.md`

1. **Proteção de rota**
   - Camadas: `_authenticated/route.tsx` (autenticação) → `WorkspaceRequiredGuard` → `AdminRoute` (papel)
   - Papéis globais (`user_roles`: `global_owner`, `owner`, `admin`) e de workspace (`workspace_members.role`: `admin`, `member`, `limited_member`, `guest`)
   - Hook `useUserRole` como fonte única; hook `useAppRole` para papel Hub (role_slug)
   - Exemplo: `src/routes/_authenticated/settings.tsx` embrulhado em `<AdminRoute>`

2. **Telas administrativas existentes**
   - `Settings` (perfil, workspace, usuários, status, tags, templates, automações, produtividade, notificações, webhooks, API) via Tabs
   - `ArchivedSpaces`, `Automations`
   - Shell: `_authenticated/route.tsx` com `SidebarProvider` + `AppSidebar` + `MobileHeader`
   - Registro de rota nova: criar arquivo em `src/routes/_authenticated/<nome>.tsx` com `createFileRoute` + wrapper `<AdminRoute>`; router gera `routeTree.gen.ts`

3. **Leitura de dados server-only** (seção principal)
   - Padrão: Supabase Edge Function com `SUPABASE_SERVICE_ROLE_KEY`, chamada via `supabase.functions.invoke('<nome>', { body })`
   - Autorização: função valida JWT do chamador e checa papel via `has_role` ou consulta a `user_roles`
   - Exemplo completo: `get-user-emails` (server) + consumo em `UserManagement` / hook correspondente
   - `createServerFn` do TanStack: não é o padrão adotado para admin neste projeto (declarar explicitamente)

4. **Componentes de UI**
   - shadcn/ui new-york + lucide-react + sonner (toast) + `@tanstack/react-query`
   - Tabela: padrão usado em `UserManagement` / `DocsHubTable` / `DashboardsTable` (documentar qual)
   - Estados: `isLoading` do react-query → skeleton/spinner; erro → toast; vazio → mensagem inline

5. **Convenções**
   - Arquivos: `page-views/Xxx.tsx`, `routes/_authenticated/xxx.tsx`, `hooks/useXxx.ts`, `components/<dominio>/Xxx.tsx`
   - Idioma: rótulos em português; nomes de código em inglês
   - Datas: `date-fns` com locale pt-BR (confirmar em `src/lib/dateUtils.ts`)

## Detalhes técnicos

- Cada seção incluirá 1-2 trechos de código curtos (5-15 linhas) com caminho do arquivo
- Onde algo não existir (ex.: breadcrumb global), escrever "não existe"
- Nenhuma sugestão de melhoria; apenas descrição do estado atual
- Entrega: mensagem final apenas confirmando criação do arquivo e listando os 5 títulos de seção
