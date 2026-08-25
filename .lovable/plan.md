# Plano — Anexos na decisão do cliente (`calendario.post.aprovado` / `calendario.post.reprovado`)

Somente adições no handler `handleCalendarioDecisao` existente. Comentário, contador, `calendario.publicar`, `diagnostico.ping`, `tarefa.listar_para_aprovacao` e SSO ficam **intactos**.

## 1. Schema Zod — anexos opcionais no item de tasks

No `DecisaoTaskSchema` (item de `tasks`), acrescentar um campo opcional:

```text
attachments?: array de { file_name: string (opcional), file_url: string (obrigatório) }
```

- `attachments` é opcional: mensagens sem anexos seguem funcionando exatamente como hoje.
- Nada muda nos campos já validados (`id`, `comentario`) nem no raiz (`aprovador_nome`).

## 2. Fluxo por item (após o comentário/contador que já existem)

Para cada item de `tasks` **com `attachments`**, depois de localizar a tarefa e gravar o comentário:

1. **Baixar** o arquivo com `fetch(file_url)` (URL assinada do Portal).
2. **Subir** para o bucket privado `task-attachments` do MAP Flow, no path padrão:
   `<autor_tecnico>/<task_id>/<timestamp>_<file_name_sanitizado>`
   - `autor_tecnico` = o mesmo autor do comentário (criador do workspace, função `resolverAutor` já existente).
   - Sanitização do nome igual ao `sanitizeFileName` do app (remove acentos e caracteres especiais no path; o `file_name` original com acentos vai para o banco).
   - Upload via service role, com `contentType` detectado do download.
3. **Gravar em `task_attachments`**:
   - `task_id` = `tasks.id` do item
   - `file_name` = nome recebido (ou derivado da URL se ausente)
   - `file_url` = **path no storage do MAP Flow** (nunca a URL do Portal)
   - `file_type` = `Content-Type` do download (nulo se indetectável)
   - `file_size` = tamanho em bytes do download (nulo se indetectável)
   - `uploaded_by` = autor técnico
4. O resultado do item passa a incluir `attachments`: por anexo, `{ file_name, status: "ok" | "erro", error? }`.

## 3. Tratamento de erro — anexo nunca quebra o resto

- Falha no download (link expirado, rede, 4xx/5xx) ou no upload: `console.error` com task_id + file_name, item do anexo marcado como `{ status: "erro", error: "download_falhou" | "upload_falhou" }`, e **segue o próximo anexo e a próxima tarefa**.
- O comentário e o contador daquela decisão **já foram gravados antes** dos anexos e não são afetados — o comentário é o dado principal.
- A resposta HTTP da mensagem continua 200 com os resultados por item (incluindo os erros de anexo), para o Hub não reenviar por causa de um anexo ruim.

## 4. Idempotência

- **Reenvio da mesma mensagem**: a guarda `hub_inbox_processed` já existe e retorna a resposta salva **antes de qualquer escrita** — anexos não são baixados nem duplicados. Nada a mudar.
- **Mensagem nova com a mesma decisão/tarefa**: é uma decisão nova com anexos próprios (novas URLs assinadas), então baixar e registrar de novo é o comportamento correto — igual ao comentário, que também é criado de novo. O timestamp no path garante que não há colisão de arquivos.

## 5. O que NÃO muda

- Comentário sempre gravado (aprovado e reprovado) e contador `cliente_devolucoes_count +1` só no reprovado — intactos.
- `calendario.publicar`, `tarefa.listar_para_aprovacao`, `diagnostico.ping` — intocados.
- `verify_jwt=false` e a validação `Authorization: Bearer <HUB_INBOX_TOKEN>` — mantidos.
- SSO e frontend — nenhuma alteração.
- Nenhum envio de volta ao Portal/Social Flow.

## 6. Arquivos

- `supabase/functions/hub-inbox/index.ts` — campo `attachments` no schema do item + função auxiliar `processarAnexosDecisao` + chamada no `handleCalendarioDecisao`.
- Deploy da `hub-inbox` após a alteração.
- Sem migration (tabela `task_attachments` e bucket `task-attachments` já existem).
