

# Mensagens de áudio no Chat e Comentários (estilo WhatsApp)

Sim, será similar ao WhatsApp — botão de microfone para gravar, player inline com barra de progresso para ouvir, e possibilidade de adicionar uma descrição textual ao áudio antes de enviar.

## Componentes novos

### 1. `src/components/audio/AudioRecorderButton.tsx`
- Botão de microfone que ao pressionar inicia gravação via `MediaRecorder` API
- Durante gravação: indicador pulsante vermelho + cronômetro
- Ao parar: preview do áudio + campo de texto para **descrição do áudio** (opcional) + botões descartar/enviar
- Callback `onAudioReady(file: File, description?: string)`

### 2. `src/components/audio/AudioPlayer.tsx`
- Player inline compacto estilo WhatsApp: play/pause, barra de progresso arrastável, duração
- Exibe a **descrição do áudio** abaixo do player (se houver)
- Ícone de microfone para identificar visualmente como mensagem de voz

## Alterações em arquivos existentes

### 3. `src/hooks/useChatAttachments.ts`
- Sem mudança estrutural — áudio é tratado como arquivo normal no upload

### 4. `src/components/chat/ChatInput.tsx`
- Adicionar `AudioRecorderButton` ao lado dos botões existentes (anexo, atribuir, enviar)
- Quando áudio gravado com descrição: adicionar arquivo ao `pendingFiles` e incluir a descrição no conteúdo da mensagem (ex: `🎤 {descrição}`)

### 5. `src/components/chat/ChatAttachments.tsx`
- Detectar `file_type` que começa com `audio/`
- Renderizar `AudioPlayer` ao invés do card de download genérico
- Passar a descrição (extraída do conteúdo da mensagem ou do campo `file_name` metadata)

### 6. `src/components/tasks/TaskComments.tsx`
- Adicionar `AudioRecorderButton` ao lado do botão "Comentar"
- Upload do áudio via `useUploadChatAttachments` (reutiliza bucket existente)
- Salvar URL + descrição no conteúdo do comentário

## Fluxo do usuário

```text
1. Clica no microfone → navegador pede permissão
2. Gravando: indicador vermelho + tempo
3. Clica parar → preview do áudio + campo "Adicionar descrição..."
4. (Opcional) digita descrição: "Resumo da reunião com cliente"
5. Clica enviar → upload + mensagem enviada
6. Destinatário vê: player inline + descrição abaixo
```

## Detalhes técnicos
- **Formato**: `audio/webm` (Chrome/Edge/Firefox) com fallback `audio/ogg`
- **Armazenamento**: bucket `chat-attachments` (já público)
- **Sem migração**: usa o mesmo campo JSONB `attachments` existente
- **Descrição**: armazenada como campo extra no objeto de attachment (`description`) dentro do JSONB

