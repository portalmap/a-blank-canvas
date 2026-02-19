
# Anexos no Chat com Miniatura e Ampliacao

## Resumo

Adicionar suporte a upload de arquivos no chat, exibindo miniaturas nas mensagens (especialmente imagens). Ao clicar na miniatura, uma dialog amplia a imagem. Para outros tipos de arquivo, exibe icone e nome com opcao de download.

## O que sera feito

1. **Criar bucket de storage** `chat-attachments` (publico) com politicas RLS para upload por usuarios autenticados e leitura publica
2. **Botao de anexo no ChatInput** -- reutilizar o padrao do `CommentAttachmentButton` existente
3. **Upload dos arquivos** ao enviar a mensagem -- salvar no bucket e gravar as URLs no campo `attachments` (JSONB) que ja existe na tabela `chat_messages`
4. **Exibir miniaturas no ChatMessageItem** -- imagens aparecem como thumbnails clicaveis; outros arquivos aparecem como cards compactos com nome e icone
5. **Dialog de ampliacao** -- ao clicar numa miniatura de imagem, abre um dialog fullscreen com a imagem em tamanho real

## Detalhes Tecnicos

### 1. Migracao SQL

- Criar bucket `chat-attachments` (publico)
- Politica de INSERT: usuarios autenticados podem fazer upload
- Politica de SELECT: leitura publica

### 2. `src/hooks/useChatAttachments.ts` (novo)

Hook `useUploadChatAttachment` que:
- Recebe um `File`, faz upload para `chat-attachments/{userId}/{timestamp}_{filename}`
- Retorna objeto `{ file_name, file_url, file_type, file_size }`

### 3. `src/components/chat/ChatInput.tsx`

- Adicionar estado `pendingFiles: File[]`
- Adicionar botao de anexo (icone Paperclip) ao lado do botao de enviar
- Exibir preview dos arquivos pendentes acima do textarea (miniaturas para imagens, nome para outros)
- No submit, fazer upload de todos os arquivos e incluir array de attachments no insert da mensagem
- Input file oculto com `multiple` e `accept` generico

### 4. `src/hooks/useChat.ts` -- `useSendMessage`

- Atualizar para aceitar parametro `attachments` opcional (array de objetos)
- Incluir no insert do `chat_messages`

### 5. `src/components/chat/ChatMessageItem.tsx`

- Verificar se `message.attachments` tem conteudo
- Para cada attachment:
  - Se imagem: renderizar `<img>` com thumbnail (max 200px de largura, rounded, cursor pointer)
  - Se outro tipo: renderizar card compacto com icone e nome
- Ao clicar em imagem, abrir `ChatImageDialog`

### 6. `src/components/chat/ChatImageDialog.tsx` (novo)

- Dialog (usando Radix Dialog) que exibe a imagem em tamanho maximo
- Fundo escuro semitransparente
- Botao X para fechar
- Botao de download opcional

### Formato dos attachments no JSONB

```text
[
  {
    "file_name": "foto.jpg",
    "file_url": "https://...",
    "file_type": "image/jpeg",
    "file_size": 123456
  }
]
```

### Fluxo do usuario

1. Usuario clica no icone de clip no input do chat
2. Seleciona um ou mais arquivos
3. Previews aparecem acima do campo de texto
4. Usuario pode remover arquivos antes de enviar
5. Ao enviar (Enter ou botao), arquivos sao uploaded e mensagem e criada com attachments
6. Na mensagem, imagens aparecem como miniaturas
7. Ao clicar numa miniatura, abre dialog com imagem ampliada
