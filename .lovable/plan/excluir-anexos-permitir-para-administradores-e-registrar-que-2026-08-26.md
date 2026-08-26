# Excluir anexos: permitir para administradores e registrar quem excluiu

## Situação atual (verificada)

- A exclusão de anexo já tenta criar um registro `attachment.removed` na atividade (em `TaskAttachmentsList`), e o texto "removeu o anexo X" já existe.
- Porém a regra de acesso da tabela `task_attachments` permite excluir **apenas quem enviou** o arquivo (`uploaded_by = usuário atual`). Anexos vindos do Portal MAP / importações têm outro autor, então o clique do administrador não remove nada — e, sem exclusão, também não fica registro coerente.
- Na atividade, `attachment.removed` não tem ícone/cor própria (cai no padrão genérico), diferente de `attachment.added`.

## O que muda

1. **Administradores passam a poder excluir de fato** qualquer anexo das tarefas do workspace (admin do workspace e proprietário global), além do próprio autor do envio.
2. **Registro na atividade sempre nomeia quem excluiu** — autor, data, nome do arquivo e, quando o excluidor não é o autor do envio, a indicação de que foi removido por administrador.
3. **Botão de excluir visível conforme permissão**: aparece para o autor do anexo e para administradores; escondido para os demais (hoje aparece para todos e falha silenciosamente).
4. **Visual da atividade**: ícone de clipe com cor própria para "removeu o anexo", seguindo o padrão das outras atividades.

## Detalhes técnicos

- Migration: nova política de DELETE em `public.task_attachments` permitindo `uploaded_by = auth.uid()` OU `public.is_workspace_admin(auth.uid(), t.workspace_id)` OU `public.is_global_owner(auth.uid())` (via `EXISTS` em `tasks`). Mantém a política atual ou é substituída por uma única política consolidada.
- `src/components/tasks/TaskAttachmentsList.tsx`: calcular `canDelete` por anexo (autor ou admin) e passar em `showRemove`; ao remover, gravar a atividade com `metadata` = `{ file_name, file_type, file_size, uploaded_by, removed_by_admin }`. Se a exclusão falhar, não gravar atividade e mostrar erro claro.
- `src/hooks/useTaskActivities.ts`: enriquecer o texto de `attachment.removed` com o sufixo "(como administrador)" quando `metadata.removed_by_admin` for verdadeiro.
- `src/components/tasks/TaskActivityItem.tsx`: mapear `attachment.removed` em `getActivityIcon` (clipe) e `getActivityColor` (tom neutro/vermelho suave).
- Permissão de admin no cliente: usar os hooks já existentes de papel do workspace/`useAppRole` — sem criar nova fonte de verdade.
