## Objetivo

Trazer o projeto `portalmap/a-blank-canvas` (Vite + React Router DOM + Tailwind v3 + Supabase) para este projeto Lovable, que roda em TanStack Start + Tailwind v4 + Supabase já conectado.

## Escopo encontrado no GitHub

- 21 páginas, 247 componentes, 77 dependências npm, 45 arquivos usam `react-router-dom`
- 2 contexts (`AuthContext`, `WorkspaceContext`) + 4 guards (`ProtectedRoute`, `AdminRoute`, `GuestRoute`, `WorkspaceRequiredGuard`)
- 132 migrations Supabase, 12 edge functions
- Design system em HSL (`hsl(var(--token))`) no `tailwind.config.ts` + `src/index.css`

## Pré-requisito (você faz antes do plano rodar)

**Trocar a conexão do Supabase** deste projeto para o Supabase original (onde estão as 132 migrations e os dados). Caminho: painel **Cloud** → desconectar o Supabase atual (`efqnscrnyyyjpswctahq`, vazio) → conectar o Supabase original do `a-blank-canvas`.

Sem esse passo o app vai abrir mas com banco vazio.

## Etapas

### 1. Importar o código do GitHub
- Clonar `portalmap/a-blank-canvas`
- Copiar para este projeto, preservando estrutura:
  - `src/components/` (247 arquivos), `src/contexts/`, `src/hooks/`, `src/lib/`, `src/assets/`
  - `src/integrations/supabase/types.ts` (regenerado depois pelo Supabase)
  - `supabase/migrations/` (132 arquivos) e `supabase/functions/` (12 funções)
- **NÃO** copiar: `src/App.tsx`, `src/main.tsx`, `src/pages/`, `index.html`, `tailwind.config.ts`, `postcss.config.js`, `vite.config.ts`, `package.json` (esses são incompatíveis com o stack atual)

### 2. Reconciliar dependências
Instalar as 77 deps do repo original (`@tiptap/*`, `@hello-pangea/dnd`, `@emoji-mart/*`, `next-themes`, `recharts`, `date-fns`, todos os `@radix-ui/*`, `react-hook-form`, `zod`, etc.) **exceto** `react-router-dom` e `react-router`.

### 3. Reescrever todas as 21 rotas em `src/routes/`

| Rota original | Arquivo TanStack |
|---|---|
| `/` | `_authenticated/index.tsx` (HomePage) |
| `/auth`, `/auth/reset-password` | `auth.tsx`, `auth.reset-password.tsx` (públicas) |
| `/accept-invite/:token` | `accept-invite.$token.tsx` (pública) |
| `/workspaces`, `/spaces`, `/everything`, `/chat`, `/teams`, `/documents`, `/dashboards`, `/archived-spaces`, `/automations`, `/settings` | `_authenticated/<nome>.tsx` |
| `/space/:spaceId`, `/folder/:folderId`, `/list/:listId`, `/task/:taskId`, `/documents/:id`, `/dashboards/:id` | `_authenticated/space.$spaceId.tsx` etc. |
| `*` (404) | `__root.tsx` notFoundComponent |

- Layout `src/routes/_authenticated/route.tsx` faz o gate `ssr:false` + `supabase.auth.getUser()` (substitui `ProtectedRoute`).
- Guards `AdminRoute`, `GuestBlockedRoute`, `WorkspaceRequiredGuard` viram componentes wrapper invocados dentro do `component:` de cada rota que os exige (mantém a mesma lógica de papel/workspace; não viram `beforeLoad` para preservar o comportamento client-side existente).

### 4. Converter `react-router-dom` → `@tanstack/react-router` (45 arquivos)
Substituições mecânicas em cada arquivo afetado:
- `import { Link, useNavigate, useParams, useLocation, Outlet, Navigate } from "react-router-dom"` → `from "@tanstack/react-router"`
- `<Link to={`/space/${id}`}>` → `<Link to="/space/$spaceId" params={{ spaceId: id }}>` (obrigatório no TanStack)
- `useParams<{spaceId:string}>()` → `Route.useParams()` em cada arquivo de rota; componentes filhos recebem por prop
- `useNavigate()` segue compatível; `navigate("/x")` mantém, `navigate(-1)` vira `router.history.back()`
- Remover `<BrowserRouter>`, `<Routes>`, `<Route>` (substituídos pelo router gerado)

### 5. Migrar Tailwind v3 → v4
- Reescrever `src/styles.css`: substituir `@tailwind base/components/utilities` por `@import "tailwindcss"`, mover todos os tokens HSL para `@theme inline` (mantendo `hsl(var(--token))` para shadcn compatibility)
- Apagar `tailwind.config.ts` e `postcss.config.js`
- Manter `--background`, `--primary`, `--sidebar-*`, `--status-*`, `--priority-*` e todos os outros tokens no `:root` e `.dark` exatamente como estão
- Adicionar `@custom-variant dark (&:where(.dark, .dark *))` para o `next-themes`

### 6. Wirings TanStack Start
- `src/routes/__root.tsx`: instalar `QueryClientProvider`, `ThemeProvider` (next-themes), `TooltipProvider`, `AuthProvider`, `WorkspaceProvider`, `SidebarProvider`, `Toaster`, `Sonner`, `NotificationListener`, `MobileHeader`, `AppSidebar` (a árvore que estava no antigo `App.tsx`)
- `_authenticated/route.tsx`: gate de auth + redirect para `/auth`
- `src/start.ts`: confirmar `attachSupabaseAuth` no `functionMiddleware` (apesar de quase nenhum `createServerFn` no escopo, é precaução)
- `src/routes/__root.tsx` head: link `<link rel="stylesheet">` se houver Google Fonts (não há, fontes do sistema)

### 7. Backend (Supabase original já reconectado)
- As 132 migrations **não precisam rodar** — já existem no projeto original
- Copiar `supabase/functions/*` para o repo do Lovable e fazer deploy pelas tools do Supabase
- Copiar `supabase/config.toml` mesclando com o existente

### 8. Validação
- Build sem erros (`tsc` + Vite)
- Smoke test manual: login, listar workspaces, abrir um space, criar uma task, abrir o chat, abrir um document Tiptap, sair
- Verificar que cada `Link` dinâmico funciona (espaços, tasks, docs)

## Riscos e ressalvas (importantes)

1. **Quebras em editores ricos**: Tiptap 3 com SSR pode dar `window is not defined`. Mitigação: importar Tiptap só dentro de `useEffect` ou marcar componentes pesados com `ssr:false` na rota.
2. **`localStorage` em contexts**: `AuthContext` e `WorkspaceContext` provavelmente acessam `localStorage` no init. Em rotas `_authenticated/*` (`ssr:false`) é seguro. Para `auth.tsx` (pública, SSR ligado), envolver acessos em `typeof window !== "undefined"`.
3. **`<Link to>` dinâmico**: TanStack exige `params` separados. Todo lugar que usa template string vira chamada com `params={{...}}` — é a maior fonte de mudança nos 247 componentes (estimo ~80 arquivos tocados).
4. **`react-router-dom` em libs de terceiros**: nenhuma dep direta requer, então remover é seguro.
5. **`next-themes`** funciona no TanStack Start mas pede `suppressHydrationWarning` no `<html>` — adicionar no `__root.tsx`.
6. **Tempo realista**: mesmo automatizando muito, é um trabalho grande e provavelmente vai precisar de iterações para corrigir imports quebrados e tipos. Espere 2–4 ciclos de "build → erro → corrigir" depois do plano rodar.

## O que **não** será feito

- Não vou rodar as 132 migrations (estão no Supabase original)
- Não vou reescrever as edge functions como `createServerFn` (decisão sua)
- Não vou portar o histórico de commits — só o código atual do `main`
- Não vou mexer no design system além da sintaxe Tailwind v4 (cores e tokens permanecem idênticos)
