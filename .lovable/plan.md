
# Correção geral de UX/UI + alinhamento ao MAP Flow v.2.0

## Diagnóstico

O projeto v.2.0 e este compartilham o mesmo código de componentes (AppSidebar, etc.) e o mesmo conjunto de tokens HSL. A diferença está no **stack de build**:

- **v.2.0**: Tailwind v3 + react-router + react-resizable-panels v2 — funciona.
- **Atual**: Tailwind v4 + TanStack Start + react-resizable-panels v4 — várias quebras silenciosas e uma fatal.

### Causas raiz identificadas

1. **Tokens HSL não viram utilitários no Tailwind v4.** `src/styles.css` define `--primary`, `--sidebar-background`, etc. como triplets HSL, mas não existe bloco `@theme inline` mapeando para `--color-*`. Logo classes como `bg-sidebar`, `bg-primary`, `text-sidebar-foreground`, `border-border`, `bg-status-done`, `bg-priority-high` não geram CSS → cores aparecem erradas ou ausentes em toda a aplicação.
2. **Largura da sidebar não é aplicada.** `src/components/ui/sidebar.tsx` usa sintaxe v3 `w-[--sidebar-width]`, `w-[--sidebar-width-icon]`, `calc(--sidebar-width-icon + theme(spacing.4))`. No Tailwind v4 essas classes não resolvem a variável CSS — o painel `fixed` fica sem largura útil, o spacer colapsa, e o `<main>` é coberto. No estado colapsado o ícone aparece sobre o texto pelo mesmo motivo.
3. **Documentos quebra com `Element type is invalid` em `ResizablePanelGroup`.** `react-resizable-panels@4` renomeou exports para `Group`/`Panel`/`Separator`. O wrapper shadcn (`src/components/ui/resizable.tsx`) importa `PanelGroup` e `PanelResizeHandle` que viraram `undefined`. Afeta também `Chat.tsx` e o tipo `ImperativePanelHandle` em `Documents.tsx`.
4. **Hydration warning** em `<html className="light">`: `next-themes` adiciona a classe no cliente; o SSR não tem essa classe. Resolvível com `suppressHydrationWarning` na raiz.
5. **Botão "Try again" + reload na sidebar (visto no replay):** consequência das quebras acima — assim que uma rota com Resizable monta, a árvore explode até o boundary do TanStack.

## O que será feito

### Fase 1 — Reparar quebras estruturais (alta prioridade)

1. **`src/styles.css`** — adicionar bloco `@theme inline` mapeando todos os tokens existentes (`--color-background`, `--color-foreground`, `--color-primary`, `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-primary`, `--color-sidebar-accent`, `--color-sidebar-border`, `--color-sidebar-ring`, `--color-status-*`, `--color-priority-*`, `--color-chart-*`, `--color-border`, `--color-input`, `--color-ring`, `--color-muted*`, `--color-accent*`, `--color-card*`, `--color-popover*`, `--color-destructive*`, `--color-secondary*`, `--color-primary-hover`) para `hsl(var(--*))`. Sem isso nenhuma das classes semânticas do projeto pinta.
2. **`src/components/ui/sidebar.tsx`** — substituir todas as ocorrências de `w-[--sidebar-width]`, `w-[--sidebar-width-icon]`, `left-[calc(var(--sidebar-width)*-1)]`, `w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]` etc. pela forma `var(--sidebar-width)` / `calc(var(--sidebar-width-icon) + 1rem)` (sem `theme(spacing.X)`, que também é v3-only). Aplica a `<Sidebar>`, `<SidebarInset>`, `<SidebarMenuSkeleton>` e wrappers internos.
3. **`react-resizable-panels` v4 → v2** — fazer downgrade para `^2.1.9` (mesma versão de v.2.0). Mantém o wrapper shadcn e o uso em `Documents.tsx`/`Chat.tsx` sem alterar API. Custo: 1 dependência rebaixada; benefício: compatibilidade testada.
4. **`src/routes/__root.tsx`** — adicionar `suppressHydrationWarning` no `<html>` para silenciar o mismatch do `next-themes`.

### Fase 2 — Alinhar tokens visuais ao MAP Flow v.2.0

Os tokens HSL deste projeto já são idênticos aos do v.2.0 (sidebar dark navy `222 47% 11%`, primary royal blue `221 83% 53%`, accent vibrant blue `217 91% 60%`, etc.). Após a Fase 1 a paleta v.2.0 passa a ser aplicada automaticamente.

Vou ainda copiar do v.2.0:
- Animação `highlight-fade` (efeito de destaque ao navegar para item).
- `border-radius` em `0.5rem` (já presente, conferir).
- Garantir `* { border-color: hsl(var(--border)) }` global equivalente ao `@layer base` do v.2.0.

### Fase 3 — Varredura página a página

Para cada rota autenticada, abro no preview, capturo console + visual e corrijo problemas pontuais encontrados:

- `/` (Início)
- `/everything` (Tudo)
- `/chat`
- `/teams` (Equipes)
- `/documents` + `/documents/$id`
- `/dashboards` + `/dashboards/$id`
- `/automations`
- `/spaces` + `/space/$spaceId`
- `/folder/$folderId`
- `/list/$listId`
- `/task/$taskId`
- `/archived-spaces`
- `/workspaces`
- `/settings`

Para cada uma: verifico (a) erro de runtime no console, (b) sobreposição/quebra de layout, (c) cores aplicadas corretamente após a Fase 1, (d) responsividade básica. Correções pontuais ficam restritas à página/componente afetado.

### Fase 4 — Verificação final

- Recarregar o preview, confirmar que sidebar expande/colapsa corretamente, sem sobreposição.
- Abrir `/documents` e confirmar que renderiza sem o erro do Resizable.
- Conferir console limpo (sem hydration warning, sem element-type-invalid).
- Reportar resumo do que foi corrigido por página.

## Fora de escopo (para iterações futuras)

- Reescrita de componentes/páginas sem bug visível.
- Otimização de performance além das melhorias naturais da Fase 1 (ex.: code-splitting agressivo, virtualização de listas).
- Refatoração da arquitetura do AppSidebar — só serão feitos ajustes mínimos para evitar regressões.
- Atualização do `react-resizable-panels` para v4 com adaptação do wrapper (downgrade é mais seguro e barato agora).

## Riscos

- O downgrade do `react-resizable-panels` pode disparar aviso de peer-dep, mas é a versão alvo do shadcn original. Risco baixo.
- Adicionar `@theme inline` pode revelar inconsistências em componentes que usavam cores hardcoded — vou tratar caso a caso na Fase 3.
