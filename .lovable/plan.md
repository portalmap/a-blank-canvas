
# Upgrade do Chat — Itens 8 e 9: Figurinhas + Criador

## Resumo

Implementar sistema completo de figurinhas no chat: galeria organizada em pacotes, upload de imagens como stickers, envio no chat, e um criador de figurinhas no browser com recorte, redimensionamento e texto.

---

## Item 8 — Sistema de Figurinhas

### O que faz
- Usuários podem enviar figurinhas nas mensagens do chat (como WhatsApp)
- Galeria de figurinhas acessível por botão ao lado do input
- Figurinhas organizadas em **pacotes** (ex: "Emojis animados", "Memes do time")
- Qualquer membro pode fazer upload de imagens (PNG/WebP) como figurinhas
- Figurinhas ficam disponíveis para todo o workspace
- Aba "Recentes" mostra as últimas figurinhas usadas pelo usuário

### Banco de dados

**`sticker_packs`** — pacotes de figurinhas
- `id`, `workspace_id`, `name`, `description`, `cover_url`, `created_by`, `created_at`

**`stickers`** — figurinhas individuais
- `id`, `pack_id FK sticker_packs`, `workspace_id`, `name`, `image_url` (path no storage), `created_by`, `created_at`

**`sticker_usage`** — registro de uso para "Recentes"
- `id`, `sticker_id FK stickers`, `user_id`, `used_at`

### Storage
- Bucket `stickers` (privado, signed URLs) para armazenar as imagens

### Componentes

1. **`StickerGallery.tsx`** — Popover/Sheet com abas: Recentes | Pacotes | Todos
2. **`StickerPackCard.tsx`** — Card de um pacote com preview das figurinhas
3. **`StickerUploadDialog.tsx`** — Dialog para upload de imagem + selecionar/criar pacote
4. **`StickerMessage.tsx`** — Renderização de uma figurinha enviada no chat (imagem maior que emoji, sem balão de texto)

### Hook
- **`useStickers.ts`** — CRUD de pacotes e stickers, busca recentes, registro de uso

### Integração
- `ChatInput.tsx` — botão de figurinha ao lado do emoji picker
- `ChatMessageItem.tsx` — detectar mensagem tipo sticker e renderizar `StickerMessage`
- Mensagem com sticker: `content` = `[sticker:ID]` (formato especial parseado no render)

---

## Item 9 — Criador de Figurinhas no Browser

### O que faz
- Editor visual dentro de um Dialog para criar figurinhas a partir de imagens
- Funcionalidades:
  - **Upload de imagem** base (foto, screenshot, etc.)
  - **Recorte** (crop) livre ou circular
  - **Redimensionar** para caber no formato padrão (512x512)
  - **Adicionar texto** sobre a imagem (com cor, tamanho, posição)
  - **Rotação** da imagem
  - **Preview** em tempo real
  - **Salvar** como figurinha em um pacote existente ou novo

### Tecnologia
- Usa **Canvas API** nativo do browser (sem dependências extras pesadas)
- Componente `<canvas>` para manipulação da imagem
- Controles com sliders e inputs do shadcn/ui

### Componentes

1. **`StickerCreatorDialog.tsx`** — Dialog principal com o editor
2. **`StickerCanvas.tsx`** — Componente canvas com a imagem editável
3. **`StickerTextOverlay.tsx`** — Controles para adicionar/editar texto sobre a imagem
4. **`StickerCropControls.tsx`** — Controles de recorte e redimensionamento

### Fluxo
1. Usuário clica "Criar figurinha" na galeria
2. Faz upload de uma imagem base
3. Recorta, redimensiona, adiciona texto se quiser
4. Clica "Salvar" → imagem final é exportada do canvas como PNG
5. Upload automático para o bucket `stickers`
6. Figurinha fica disponível na galeria do workspace

---

## Migration SQL (1 migration)

- Criar tabelas `sticker_packs`, `stickers`, `sticker_usage`
- Criar bucket `stickers` (privado)
- RLS: membros do workspace podem ver/criar/usar figurinhas
- RLS: apenas o criador ou admin pode deletar figurinha/pacote

---

## Arquivos

### Novos (9 arquivos)
1. `src/components/chat/stickers/StickerGallery.tsx`
2. `src/components/chat/stickers/StickerPackCard.tsx`
3. `src/components/chat/stickers/StickerUploadDialog.tsx`
4. `src/components/chat/stickers/StickerMessage.tsx`
5. `src/components/chat/stickers/StickerCreatorDialog.tsx`
6. `src/components/chat/stickers/StickerCanvas.tsx`
7. `src/components/chat/stickers/StickerTextOverlay.tsx`
8. `src/components/chat/stickers/StickerCropControls.tsx`
9. `src/hooks/useStickers.ts`

### Editados (3 arquivos)
10. `src/components/chat/ChatInput.tsx` — botão de figurinha
11. `src/components/chat/ChatMessageItem.tsx` — render de sticker
12. `src/hooks/useChatAttachments.ts` — suporte a signed URLs do bucket stickers

---

## Resultado

- Figurinhas enviadas no chat como imagens grandes (estilo WhatsApp)
- Galeria organizada com pacotes, busca e recentes
- Qualquer membro pode criar figurinhas diretamente no browser
- Editor com recorte, texto e preview em tempo real
- Zero dependências extras (Canvas API nativo)
- ~12 arquivos novos/editados + 1 migration SQL
