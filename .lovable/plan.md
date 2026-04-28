## Melhorias no Feed do módulo Início

Mantém a estrutura atual (card no Início + diálogo expandido) e adiciona criação rica de posts, organização por abas/busca, e visual mais limpo inspirado na referência.

### 1. Banco de dados (migration única)

Alterações na tabela `feed_posts`:
- `content_format text not null default 'markdown'` (`plain` | `markdown`)
- `tags text[] not null default '{}'`
- `is_pinned boolean not null default false`
- `pinned_at timestamptz`
- `edited_at timestamptz`
- `attachments jsonb not null default '[]'` — array de objetos
- Trigger `before update`: se `content`/`title`/`tags`/`attachments` mudarem, seta `edited_at = now()`.
- Trigger `before update` em `is_pinned`: ajusta `pinned_at` automaticamente.
- Índices: `(workspace_id, is_pinned desc, created_at desc)` e GIN em `tags`.

Estrutura de cada item em `attachments` (JSONB):
```text
{ "kind": "image" | "file" | "doc_link",
  "storage_path": "...",        // image/file
  "name": "...", "mime": "...", "size": 123,
  "document_id": "...", "title": "..." // doc_link (Flow)
}
```

Novo bucket privado `feed-attachments` (mesmo padrão de `task-attachments`):
- RLS: insert/select restrito a membros do workspace dono do post (via path `workspace_id/post_id/...`).
- Acesso via signed URL (15 dias), padrão já adotado no projeto.

RLS de `feed_posts` ganha permissão de UPDATE para o autor (apenas título, conteúdo, tags, attachments, content_format) e admins do workspace.

### 2. Hook `useFeedPosts`

- `createPost` aceita `{ title?, content, content_format, tags, attachments }`.
- Novo `updatePost({ id, title?, content?, tags?, attachments?, content_format? })`.
- Novo `togglePin(postId)` (apenas admin).
- `postsQuery` ordena por `is_pinned desc, created_at desc` e devolve novos campos.
- Novo `useFeedPostReactors(postId, enabled)` — devolve até 5 perfis (avatar + nome) para a lista de "quem curtiu".

### 3. UI — `FeedCard`

- Header: ícone Rss + "Feed" + busca compacta + botão expandir.
- Abas (`Tabs`): **Recentes** | **Fixados** | **Meus posts** (filtro client-side sobre o array já carregado).
- Campo de busca filtra por título, conteúdo e tags (case-insensitive).
- Estado vazio adaptado por aba.
- Botão "Nova publicação" abre o `CreatePostDialog` aprimorado.

### 4. `CreatePostDialog` (refatorado)

- Campos: Título (opcional), editor com **markdown leve** + preview alternável (toggle "Escrever / Visualizar").
- Toolbar minimalista: **B**, *I*, lista, link → insere sintaxe markdown na textarea.
- Renderização via `react-markdown` + `remark-gfm` (já adicionar deps).
- Seletor de **tags** (chips com sugestões fixas: `Comunicado`, `RH`, `Eventos`, `Produto`, `Avisos`; usuário pode digitar nova).
- Anexos:
  - **Imagens**: múltiplas, preview em grid 2 colunas.
  - **Arquivos**: lista com nome + tamanho.
  - **Link a documento do Flow**: combobox que busca em `documents` do workspace (filtra por nome). Insere chip "📄 Nome do documento" que vira link interno (`/documents/:id`).
  - Hiperlink externo: tratado nativamente pelo markdown.
- Mesmo dialog é reutilizado para **edição** (recebe `initialPost`).

### 5. `FeedPostItem` (visual mais limpo)

- Cabeçalho: avatar 10×10, nome em negrito, cargo/função se disponível, data relativa, selo `Fixado` quando aplicável, selo `editado` ao lado da data quando `edited_at` existir.
- Conteúdo: título maior, corpo renderizado com `react-markdown`. Links internos para `/documents/:id` e `/task/:id` viram navegação SPA.
- **Galeria de imagens**: grid responsivo (1, 2 ou 3+ com "ver mais"). Clique abre lightbox simples.
- **Anexo de arquivo**: card com ícone PDF/genérico, nome, tamanho e botão download (signed URL).
- **Doc do Flow**: card compacto com ícone FileText e link para o documento.
- **Tags**: badges abaixo do conteúdo.
- Ações: Curtir (Heart) | Comentar (MessageCircle) | Salvar (Bookmark, opcional futuro). Contador formatado (`1.2k`).
- **Curtidas com avatares**: ao lado do contador, stack de até 3 avatares dos primeiros que curtiram (popover mostra lista completa).
- Menu `MoreVertical`: **Editar** (autor + admin), **Fixar/Desafixar** (admin), **Excluir** (autor + admin).

### 6. Renderer markdown seguro

Componente `FeedContent` que usa `react-markdown` + `remark-gfm` com whitelist de elementos. Override de `<a>`:
- `/documents/:id` e `/task/:id` → `<Link>` do react-router.
- Externos → `target="_blank" rel="noopener"`.

### 7. Detalhes técnicos

- Dependências novas: `react-markdown`, `remark-gfm`.
- Bucket signed URLs: helper `getFeedAttachmentUrl(path)` reutilizando padrão de `task-attachments`.
- Upload acontece no submit do dialog: cria post → faz upload → atualiza `attachments` no post (ou usa upload prévio em caminho temporário e move; vamos usar upload prévio para simplicidade, com path `workspace_id/<uuid>/<filename>`).
- Lightbox: componente leve já existente no projeto se houver, senão `Dialog` com `<img>`.
- Performance: a query principal não traz `attachments` grandes além do JSON; signed URLs são gerados sob demanda no item.
- Realtime opcional: não incluir agora para manter escopo.

### Arquivos afetados / criados

Criados:
- `supabase/migrations/<timestamp>_feed_enhancements.sql`
- `src/components/home/FeedContent.tsx` (markdown renderer)
- `src/components/home/FeedAttachments.tsx` (galeria + arquivos + doc links)
- `src/components/home/FeedPostTabs.tsx` (abas + busca)
- `src/components/home/DocumentLinkPicker.tsx` (combobox para docs do Flow)
- `src/components/home/FeedReactorsPopover.tsx`
- `src/lib/feedAttachments.ts` (helpers de upload + signed URL)

Editados:
- `src/components/home/FeedCard.tsx` — abas, busca, integração com edição.
- `src/components/home/FeedPostItem.tsx` — novo layout, tags, anexos, edit/pin, selo "editado", avatares de curtidas.
- `src/components/home/CreatePostDialog.tsx` — editor markdown, tags, anexos, modo edição.
- `src/hooks/useFeedPosts.ts` — `updatePost`, `togglePin`, novos campos, `useFeedPostReactors`.

Sem mudanças em outras áreas do app.