# Aumentar limite de anexos de tarefas para 500 MB

## O que será feito

1. Atualizar o bucket `task-attachments` no Supabase para aceitar arquivos de até **500 MB**.
2. Se o Supabase rejeitar por ultrapassar o limite do projeto, avisar e indicar onde aumentar o limite global (Settings → Storage no dashboard).
3. Confirmar o novo valor após a alteração.

## Detalhes técnicos

- Bucket afetado: `task-attachments` (privado).
- Ferramenta: `supabase--storage_update_bucket` com `file_size_limit="500MB"`.
- O código frontend não impõe limite próprio, então o controle passa a ser apenas do bucket.
