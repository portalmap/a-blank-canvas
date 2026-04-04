

# Adicionar áudio e transcrição nas atividades das tarefas

## O que será feito

Adicionar o botão de gravação de áudio no painel de atividades (`TaskActivityPanel`) e renderizar o `AudioPlayer` (com transcrição) nos comentários que contêm áudio dentro do `TaskActivityItem`.

## Alterações

### 1. `src/components/tasks/TaskActivityPanel.tsx`
- Importar `AudioRecorderButton` e `useUploadChatAttachments`
- Adicionar estado `isUploadingAudio`
- Criar handler `handleAudioReady` que faz upload do áudio, cria comentário com `[audio:url]` e registra atividade
- Adicionar o `AudioRecorderButton` ao lado dos botões existentes (Atribuir, Anexar)

### 2. `src/components/tasks/TaskActivityItem.tsx`
- Importar `AudioPlayer`
- Na renderização do conteúdo de comentários (linhas 337-355), detectar padrão `[audio:url]` no conteúdo
- Se for áudio, renderizar `AudioPlayer` com transcrição ao invés do texto simples via `renderTextWithImagesAndLinks`

Dois arquivos editados, reutilizando os mesmos componentes já implementados no chat e nos comentários diretos.

