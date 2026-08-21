# Campos novos em tarefas para a integração Social Flow

Objetivo: permitir que um post recebido do Social Flow chegue como tarefa no MAP Flow com formato e rede social como campos reais, e sem risco de duplicar tarefa em caso de reenvio.

## O que muda

Três colunas novas na tabela de tarefas (`tasks`), todas opcionais — nada quebra nas telas e integrações atuais:

| Campo | O que guarda | Tipo | Obrigatório |
|---|---|---|---|
| `external_post_ref` | Identificador do post no Social Flow (idempotência) | texto | opcional |
| `format` | Formato do post: carrossel, reels, story, feed, etc. | texto | opcional |
| `social_channel` | Rede social: instagram, facebook, linkedin, tiktok, etc. | texto | opcional |

## Idempotência (evitar tarefa duplicada)

- Índice único parcial em (`workspace_id`, `external_post_ref`), aplicado só quando `external_post_ref` não é nulo. Assim, dois workspaces podem ter o mesmo `post_id`, mas o mesmo post não entra duas vezes no mesmo workspace.
- Índice de consulta por `external_post_ref` para leitura rápida.

Isso deixa a base pronta para a regra "se já existe, atualiza / devolve a tarefa existente em vez de criar outra" — a regra em si entra depois, junto da função de recebimento.

## Por que texto e não lista fechada (enum)

`format` e `social_channel` mudam com frequência (nova rede, novo formato). Texto livre normalizado (minúsculo, sem acento) evita migração de banco a cada mudança e não travará o Social Flow ao enviar um valor novo. Se você preferir valores fixos e validados no banco, digo agora e uso enums.

## Detalhes técnicos

- Uma migration: `ALTER TABLE public.tasks ADD COLUMN external_post_ref text, ADD COLUMN format text, ADD COLUMN social_channel text;`
- `CREATE UNIQUE INDEX ... ON public.tasks (workspace_id, external_post_ref) WHERE external_post_ref IS NOT NULL;`
- Sem mudança de RLS: as políticas de `tasks` já cobrem as novas colunas.
- Sem mudança de grants: as colunas herdam os grants da tabela.
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a migration.

## Fora do escopo deste plano

- Endpoint/assunto de recebimento dos posts (criação da tarefa a partir do Social Flow) e retorno do `tasks.id`.
- Exibição de formato/rede social na interface da tarefa.
- Identificação de cliente (assunto separado, ainda em aberto).
