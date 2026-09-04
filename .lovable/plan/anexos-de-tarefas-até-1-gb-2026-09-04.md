# Anexos de tarefas até 1 GB

Agora que o limite no armazenamento foi elevado, o sistema passa a aceitar arquivos de até 1 GB por anexo e avisa claramente quando o arquivo passar desse tamanho.

## O que muda

- O "cofre" de anexos de tarefas passa a aceitar até 1 GB por arquivo.
- Antes de enviar, o sistema confere o tamanho do arquivo:
  - até 1 GB: envio normal;
  - acima de 1 GB: nada é enviado e aparece o aviso "O limite por arquivo é de 1 GB. \"nome-do-arquivo\" tem X GB."
- Vale nos dois lugares onde se anexa arquivo na tarefa: o botão "Adicionar" da lista de anexos e o campo de comentário/atividade (incluindo arquivos colados).
- Quando vários arquivos são escolhidos de uma vez, os que estão dentro do limite seguem normalmente e só os grandes são recusados, com aviso individual.

## Detalhes técnicos

- Atualizar o bucket `task-attachments` para `file_size_limit` de 1 GB.
- Criar um helper único (ex.: `MAX_ATTACHMENT_BYTES` + `validateAttachmentSize`) em `src/hooks/useTaskAttachments.ts` para não duplicar regra.
- Validar em `TaskAttachmentsList.handleFileSelect` e em `TaskActivityPanel.handleFilesSelected` (usado também pelo paste), usando `toast.error` do sonner.
- Manter a validação também dentro de `useUploadAttachment` como rede de segurança, retornando erro amigável em vez do erro cru do storage.
- Nenhuma restrição de formato é adicionada.
