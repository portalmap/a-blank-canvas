# Corrigir erro ao enviar anexo no chat

## Causa confirmada

As políticas de acesso do bucket `chat-attachments` não existem mais no banco. Consultei as políticas de `storage.objects` e só há regras para `avatars` e `task-attachments`. Como o bucket é privado e sem política de INSERT/SELECT, qualquer upload de anexo no chat é bloqueado — daí o toast "Erro ao enviar anexo".

Os buckets `stickers` e `feed-attachments` estão na mesma situação (privados e sem nenhuma política), então figurinhas e anexos do feed também estão quebrados pelo mesmo motivo.

## O que será feito

Uma migration que recria as políticas dos buckets afetados, sem tocar em nenhum código de aplicação:

- `chat-attachments`: leitura e upload para usuários autenticados; exclusão apenas do próprio arquivo (primeira pasta = id do usuário), com exceção para administradores do sistema.
- `stickers`: leitura para autenticados; upload/exclusão restritos a administradores do sistema.
- `feed-attachments`: leitura e upload para autenticados; exclusão do próprio arquivo ou por administrador.

## Detalhes técnicos

- `CREATE POLICY ... ON storage.objects` com `TO authenticated`, filtrando por `bucket_id`, usando `(storage.foldername(name))[1] = auth.uid()::text` para posse e `is_system_admin(auth.uid())` para administradores (mesmo padrão já usado nas políticas de `avatars`).
- Os buckets permanecem privados; o app continua usando signed URLs (`createSignedUrl`), como já faz em `useChatAttachments.ts`.

## Verificação

Após a migration, listar as políticas de `storage.objects` para confirmar a cobertura dos três buckets e testar o envio de um anexo no chat pelo preview.
