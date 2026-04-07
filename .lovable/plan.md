

# Upgrade do Chat — Itens 1 a 7

## Resumo

Implementar 7 recursos no módulo de chat: reações com emoji, threads, pesquisa de mensagens, fixar mensagens, DMs, grupos de DM, e emoji picker completo (estilo WhatsApp).

---

## Migration SQL (1 migration)

### Novas tabelas

**`chat_reactions`** — reações com emoji nas mensagens
- `id uuid PK`, `message_id uuid FK chat_messages`, `user_id uuid FK profiles`, `emoji text NOT NULL`, `created_at timestamptz`
- Unique constraint em `(message_id, user_id, emoji)`
- RLS: SELECT/INSERT/DELETE para membros do workspace via canal

**`chat_pinned_messages`** — mensagens fixadas
- `id uuid PK`, `message_id uuid FK chat_messages UNIQUE`, `channel_id uuid FK chat_channels`, `pinned_by uuid FK profiles`, `pinned_at timestamptz`
- RLS: SELECT para membros, INSERT/DELETE para admins + criador do canal

### Alterações em tabelas existentes

**`chat_messages`** — adicionar coluna:
- `reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL` — para threads

**`chat_channel_type` enum** — adicionar valores:
- `'dm'` e `'group_dm'`

### Realtime
- `ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;`

### RLS para todas as novas tabelas e operações

---

## Arquivos a criar/editar

### Novos componentes (6 arquivos)

1. **`src/components/chat/EmojiPickerPopover.tsx`**
   - Integra biblioteca `emoji-mart` (ou `@emoji-mart/react`) com popover
   - Usado tanto para reações quanto para inserir emoji no input

2. **`src/components/chat/MessageReactions.tsx`**
   - Exibe reações agrupadas por emoji com contagem e tooltip de quem reagiu
   - Botão "+" para adicionar reação, clique numa reação existente para toggle

3. **`src/components/chat/ThreadPanel.tsx`**
   - Painel lateral (ou sheet) que abre ao clicar "Responder em fio"
   - Lista respostas da thread + input próprio
   - Header mostra mensagem original

4. **`src/components/chat/ChatSearchDialog.tsx`**
   - Dialog com input de busca, filtro por canal opcional
   - Resultados com preview da mensagem, autor, data
   - Clique navega ao canal + scroll até a mensagem (highlight)

5. **`src/components/chat/PinnedMessagesSheet.tsx`**
   - Sheet/popover no header do canal listando mensagens fixadas
   - Botão "Desafixar" para admins

6. **`src/components/chat/DMCreateDialog.tsx`**
   - Seletor de usuário(s) para criar DM ou grupo de DM
   - Para DM 1:1, verifica se já existe canal entre os dois usuários antes de criar

### Novos hooks (3 arquivos)

7. **`src/hooks/useChatReactions.ts`**
   - `useMessageReactions(messageId)` — busca reações
   - `useToggleReaction()` — adiciona ou remove reação
   - Realtime subscription para atualizar reações em tempo real

8. **`src/hooks/useChatSearch.ts`**
   - `useChatSearch(query, channelId?)` — busca full-text em `chat_messages.content`
   - Usa `ilike` ou `to_tsvector/to_tsquery` para busca

9. **`src/hooks/useChatPins.ts`**
   - `usePinnedMessages(channelId)` — lista fixados
   - `usePinMessage()` / `useUnpinMessage()` — mutations

### Arquivos editados (5 arquivos)

10. **`src/components/chat/ChatMessageItem.tsx`**
    - Adicionar botões no hover: reagir (emoji), responder em fio, fixar
    - Renderizar `<MessageReactions>` abaixo do conteúdo
    - Mostrar indicador de thread ("N respostas") quando `reply_count > 0`
    - Indicador de "fixada" (📌) quando a mensagem está fixada

11. **`src/components/chat/ChatRoom.tsx`**
    - Adicionar botão de busca e botão de fixados no header
    - Integrar `ThreadPanel` (painel lateral que abre ao clicar em thread)
    - Filtrar mensagens: não mostrar replies inline (só no ThreadPanel)
    - Atualizar `channelType` para aceitar `'dm' | 'group_dm'` também

12. **`src/components/chat/ChatSidebar.tsx`**
    - Adicionar seção "MENSAGENS DIRETAS" abaixo de "PERSONALIZADOS"
    - Filtrar canais `dm` e `group_dm` para essa seção
    - Exibir nome/avatar do outro usuário em DMs (não o nome do canal)
    - Botão "Nova mensagem" para abrir `DMCreateDialog`

13. **`src/components/chat/ChatInput.tsx`**
    - Adicionar botão de emoji picker ao lado do input
    - Inserir emoji selecionado na posição do cursor

14. **`src/hooks/useChat.ts`**
    - Adicionar `reply_to` no `ChatMessageWithSender` type
    - Atualizar `useSendMessage` para aceitar `replyTo` opcional
    - Adicionar `useThreadMessages(parentMessageId)` — busca replies de uma mensagem
    - Atualizar `useAllChatChannels` para incluir DMs
    - Adicionar `useCreateDM()` — cria canal tipo `dm` ou `group_dm`
    - Adicionar `reply_count` via subquery ou campo calculado

### Dependências (package.json)

15. Instalar `@emoji-mart/react` e `@emoji-mart/data` para o emoji picker completo com emojis Unicode (mesmos do WhatsApp)

---

## Detalhes técnicos importantes

**Threads**: Mensagens com `reply_to` preenchido são "replies" e não aparecem no feed principal do canal. Apenas a mensagem pai aparece, com indicador "N respostas — clique para ver". O `ThreadPanel` abre ao lado como um sheet.

**DMs**: Um canal `dm` tem exatamente 2 membros em `chat_channel_members`. O nome exibido na sidebar é o nome do outro participante (não do canal). Antes de criar, verificar se já existe um canal `dm` entre os dois usuários.

**Pesquisa**: Usar `ilike '%query%'` inicialmente. Se performance for problema, criar índice GIN com `to_tsvector`.

**Fixar**: Apenas admins do workspace ou criador do canal podem fixar/desafixar.

**Emoji picker**: `emoji-mart` fornece todos os emojis Unicode com skin tones, categorias, busca — mesmo set usado pelo WhatsApp.

---

## Resultado

- Mensagens podem receber reações com emoji (toggle, agrupadas)
- Threads reduzem ruído nos canais
- Busca full-text no histórico de mensagens
- Mensagens podem ser fixadas no canal
- DMs 1:1 e em grupo funcionam pela sidebar
- Emoji picker completo no input e nas reações
- ~14 arquivos novos/editados + 1 migration SQL + 2 dependências npm

