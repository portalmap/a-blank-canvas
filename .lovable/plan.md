# Plano — Decisão do cliente legível na aba Atividade da tarefa

## Diagnóstico (confirmado)

O backend gravou tudo certo. O problema é de **exibição**:

1. O `task_activities` da decisão tem `metadata` com `aprovador_nome`, `decisao` e `origem: 'hub'`, mas **sem `content`/`comment_content`** — e o componente `TaskActivityItem` só mostra o texto do comentário quando esse campo existe no metadata. Resultado: aparece só "Suporte adicionou um comentário".
2. O autor exibido é o autor técnico ("Suporte"); o nome do cliente (`aprovador_nome`) não é usado na UI.
3. Os anexos da decisão são gravados em `task_attachments`, mas **nenhuma atividade `attachment.added` é criada** — então não aparecem na aba Atividade.

## 1. Edge Function `hub-inbox` — enriquecer o que grava

No `handleCalendarioDecisao`, por item:

- **`task_activities` (comment.created)**: adicionar ao metadata:
  - `content`: o comentário completo gravado (mesmo texto do `task_comments`)
  - `comentario_cliente`: só o texto que o cliente escreveu no Portal (sem o prefixo "Cliente X aprovou/devolveu")
- **Anexos**: para cada anexo processado com sucesso, criar também uma atividade `attachment.added` com metadata `{ file_name, file_type, file_size, storage_path, origem: 'hub', decisao, aprovador_nome }` — assim o anexo aparece na linha do tempo (o componente já sabe renderizar `attachment.added` com preview/assinatura via `AttachmentPreviewInActivity`).
- Nada muda em: comentário, contador de devoluções, idempotência, demais assuntos.

## 2. Frontend `TaskActivityItem.tsx` — renderização da decisão

Para atividades `comment.created` com `metadata.origem === 'hub'` e `metadata.decisao`:

- **Título**: mostrar o nome do cliente (`metadata.aprovador_nome`) em destaque no lugar do autor técnico, com selo de origem "via Portal" (estilo já existente do `isPortal`).
- **Selo de decisão**: badge **"Aprovado"** (verde, CheckCircle2) ou **"Devolvido"** (âmbar/vermelho, ícone de retorno) ao lado do nome.
- **Texto**: exibir `metadata.comentario_cliente` (quando houver) na caixa de comentário já existente; se não houver texto, não renderizar a caixa vazia.
- Atividades `attachment.added` vindas do hub já renderizam o anexo (imagem com thumbnail ou link com clipe) — sem alteração extra além de garantir que o metadata tem `storage_path`.
- Decisões do cliente não são editáveis (o autor técnico não é o cliente); o botão de editar continua aparecendo só para o autor logado — sem mudança de regra.

## 3. Correção retroativa do registro já exibido (opcional, incluída)

A mensagem já processada não será regravada (idempotência). Uma execução SQL pontual atualiza o metadata da atividade `f788349a...`-relacionada na tarefa atual (`e2322362-...`) adicionando `content` e `comentario_cliente` a partir do `task_comments` correspondente, para que a tela que você mostrou passe a exibir nome, decisão e texto. Se houver anexos dessa decisão em `task_attachments`, gera as atividades `attachment.added` retroativas.

## 4. O que NÃO muda

- Schema do banco (nenhuma migration de estrutura — apenas o UPDATE retroativo de metadata).
- Comentário, contador `cliente_devolucoes_count`, idempotência via `hub_inbox_processed`.
- `calendario.publicar`, `tarefa.listar_para_aprovacao`, `diagnostico.ping`, SSO.

## 5. Arquivos

- `supabase/functions/hub-inbox/index.ts` — metadata enriquecido + atividades de anexo (deploy após a alteração).
- `src/components/tasks/TaskActivityItem.tsx` — renderização da decisão do cliente (nome, selo, texto).
- 1 execução SQL retroativa (metadata da atividade existente + atividades de anexo, se houver).
