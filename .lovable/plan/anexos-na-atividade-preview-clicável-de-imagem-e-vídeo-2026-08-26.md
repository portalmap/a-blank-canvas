# Anexos na atividade: preview clicável de imagem e vídeo

## O que está acontecendo (verificado)

- Os dois arquivos recebidos do Portal (a imagem `.png` e o vídeo `.mp4`) **existem** no storage, no bucket privado `task-attachments`, e as atividades `attachment.added` guardam o `storage_path` correto.
- O bucket `task-attachments` **não tem nenhuma policy de leitura** (as únicas policies em `storage.objects` são do bucket `avatars`). Por isso o navegador do usuário não consegue assinar/abrir o arquivo — a URL falha e o "quadradinho" da imagem aparece quebrado ("not found").
- No histórico, anexos que não são imagem (o vídeo) são renderizados apenas como link de texto com o nome do arquivo — não há player nem miniatura.

## Correções

### 1. Liberar leitura do bucket (causa do "not found")
Migration criando policies em `storage.objects` para o bucket `task-attachments`:
- `SELECT` para `authenticated` (necessário para gerar signed URL e baixar);
- `INSERT`/`DELETE` para `authenticated`, mantendo o upload que já funciona pela UI;
- o bucket continua **privado** — o acesso segue sendo por signed URL, nunca público.

### 2. Miniatura clicável para imagem e vídeo na atividade
Em `src/components/tasks/TaskActivityItem.tsx`, no componente `AttachmentPreviewInActivity`:
- **Imagem**: miniatura quadrada (como hoje), agora abrindo em um modal (lightbox) em vez de nova aba.
- **Vídeo**: miniatura quadrada usando `<video muted preload="metadata">` com overlay de ícone de play; ao clicar, abre o mesmo modal com o vídeo em player com `controls` (play funcionando).
- **Outros arquivos**: mantém o link com ícone de clipe + nome.
- Se a assinatura da URL falhar, mostrar um estado claro ("não foi possível carregar o anexo") com botão de tentar novamente, em vez de um quadrado quebrado.

## Escopo

Nada muda no `hub-inbox`, no relay de saída, nem no formato do payload recebido. Só a policy de leitura do bucket e a apresentação do anexo no histórico da tarefa.
