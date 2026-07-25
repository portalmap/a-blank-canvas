## Aplicar MAP Design System (arquétipo sidebar) no MAP Flow

Aplicar os 3 prompts do documento na ordem, alinhando o MAP Flow ao molde canônico já validado no Hub.

### Etapa 1 — Fundação canônica (Prompt 1)

Reescrever `src/styles.css`:
- Trocar o esquema HSL triplet atual pelos tokens **OKLCH** canônicos do bloco travado (root + `.dark`), com marca âmbar (`--brand: oklch(0.78 0.16 75)`), radius base `0.75rem`, sombras `--shadow-soft`/`--shadow-elegant`, `--glass-*`, `--gradient-*` e paleta `--status-*` (success/warning/danger/info/neutral, cada uma com `-foreground` e `-soft`).
- Substituir o bloco `@theme inline` pelo canônico (fontes Sora/Manrope, escala de radius, todos os `--color-*` incluindo sidebar e status).
- Ajustar `@custom-variant dark` para `(&:is(.dark *))` conforme o molde.
- Substituir `@layer base` pelo bloco canônico (tipografia H1–H5, `small`, body 15px/1.6).
- Preservar `@keyframes highlight-fade` / utilitário `.animate-highlight-fade` (específicos do projeto).

Carregar fontes no head da rota raiz (`src/routes/__root.tsx`):
- `<link>` para `https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap` (via `head()` do TanStack).

Atualizar `src/components/ui/card.tsx`:
- Base: `rounded-2xl border border-border bg-card text-card-foreground` (sem sombra fixa).
- Nova prop `elevated?: boolean` — aplica `shadow-[var(--shadow-elegant)]` só quando ligada.
- Header/Content/Footer com `p-6`.

Atualizar `src/components/ui/button.tsx`:
- `rounded-[var(--radius)]`, `active:scale-[.98]`.
- Variantes: `default`/`primary` = `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90`; `brand` (nova) = `bg-brand text-brand-foreground shadow-sm hover:bg-brand/90`; `secondary`, `outline`, `ghost`, `destructive`, `link` = padrão shadcn lendo tokens.
- Tamanhos: `sm` h-8, `md` h-10 (default), `lg` h-[46px], `icon` h-10 w-10.

Nota de compatibilidade: como o resto do código hoje usa utilitários shadcn semânticos (`bg-background`, `text-foreground`, `bg-primary`, `bg-sidebar`, etc.) que passam a resolver via OKLCH pelo novo `@theme inline`, a troca é transparente para os componentes atuais. Tokens legados (`--primary-hover`, `--status-todo`, `--priority-*`) serão mapeados na Etapa 3.

### Etapa 2 — Sidebar alinhada ao arquétipo (Prompt 2)

Refazer `src/components/AppSidebar.tsx` mantendo TODAS as rotas atuais (Home, Chat, Everything, Documents, Dashboards, Spaces, Lists, Automations, Teams, Workspaces, Archived Spaces, Settings, etc.):
- **Topo**: marca "MAP Flow" = ponto âmbar (`bg-brand`) + wordmark em `font-display` (Sora) + tag discreta "MAP" em `text-muted-foreground`.
- **Navegação agrupada** com labels eyebrow (`text-[13px] text-muted-foreground uppercase tracking-wide`). Agrupamento sugerido: **Trabalho** (Home, Chat, Everything, My Tasks) · **Organização** (Spaces, Lists, Folders, Archived Spaces) · **Conhecimento** (Documents, Dashboards) · **Automação** (Automations, Webhooks) · **Administração** (Teams, Workspaces, Settings).
- **Item ativo**: ícone e indicador em `text-brand` (barra fina à esquerda `bg-brand`), fundo `bg-sidebar-accent` sutil.
- **Rodapé**: avatar + nome + papel do usuário + botão de recolher.
- **Responsivo**: colapsa para só-ícones em md; drawer no mobile (já existe `MobileHeader` com hambúrguer).
- **Header de conteúdo**: introduzir um `PageHeader` reutilizável (`h3` de título + slot para ações/avatar à direita) e adotá-lo nas páginas principais (`HomePage`, `Documents`, `Dashboards`, `Spaces`, `Everything`, `Settings`). Páginas não migradas continuam funcionando.

Sem cores hardcoded — apenas tokens `--sidebar-*` e `--brand`.

### Etapa 3 — Retrofit de cores (Prompt 3)

Passada incremental sobre o app:
1. Substituir cores hardcoded (`text-white`, `bg-black`, `text-gray-*`, `bg-gray-*`, `border-gray-*`, `bg-[#...]`) por tokens semânticos (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `bg-brand`). Percorrer `src/page-views/**`, `src/components/**`, `src/routes/**`.
2. Cards com destaque passam a usar `<Card elevated>` em vez de shadow inline.
3. **Preservar significado semântico**:
   - Statuses de task/fluxo hoje em `--status-todo/progress/review/done` → mapear para `--status-neutral/info/warning/success`.
   - Prioridades `--priority-low/medium/high/urgent` → `--status-neutral/warning/warning/danger` (mantendo escala visual).
   - Manter os aliases legados no `:root` apontando para os novos tokens (`--status-todo: var(--status-neutral)` etc.) para não quebrar componentes que ainda referenciam os antigos.
4. Estados vazios: adotar moldura "em construção/convite" (card com ícone + título h4 + descrição muted + CTA), em vez de tela branca. Aplicar nas telas que hoje mostram lista vazia sem tratamento.

Execução incremental com typecheck após cada bloco. Ao final, relatar a lista de arquivos tocados.

### Fora do escopo
- Sincronização automática do molde (passo 5 do documento) — só depois que os 4 apps estiverem no mesmo ponto.
- Alterações em backend, RLS, Edge Functions, SSO ou integrações.

### Verificação
- Build/typecheck após cada etapa.
- Screenshot do MAP Flow (login pós-SSO, Home, Documents, Sidebar recolhida, dark mode) para comparar com o Hub — o documento pede um print pareado após a Etapa 1.
