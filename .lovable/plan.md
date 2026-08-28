# Anexos não aparecem no Mockup do Portal MAP

## O que foi verificado

- O último envio de `calendario.aprovacao` (28/08 20:56, tarefa "POST 1 | OUTUBRO | Instagram") saiu do MAP Flow **com 1 anexo** (PNG) e o Hub confirmou entrega no portal-map com `status_code: 200`. Ou seja: o MAP Flow enviou e o Portal recebeu.
- No Portal MAP, o mockup monta imagem/vídeo lendo cada anexo pelas chaves **`url`** (e `title` como nome do arquivo). Anexo sem `url` é simplesmente ignorado — não gera erro.
- O MAP Flow envia cada anexo como **`file_url` / `file_name`**. Como o Portal grava os anexos como JSON livre (sem validação), a mensagem passa com 200, mas o mockup não encontra nenhuma mídia.
- Também não é enviado nenhum campo de imagem principal (`image_url`), que o Portal usa na miniatura do calendário.

Conclusão: não é falha de entrega nem de permissão do arquivo — é **incompatibilidade de nome de campo do anexo**.

## O que fazer (só no MAP Flow, sem mexer no Hub nem no Portal)

1. No envio de `calendario.aprovacao`, montar cada anexo com as chaves que o Portal entende, mantendo as atuais para não quebrar nada:
   - `url` (URL assinada) + `title` (nome do arquivo)
   - manter `file_url` e `file_name`
   - acrescentar `file_type` (mime, quando existir) e `id` do anexo
2. Enviar `image_url` no post: primeira imagem dos anexos (jpg/jpeg/png/gif/webp), para a miniatura do calendário do Portal.
3. Garantir que a URL assinada preserve a extensão do arquivo (o Portal detecta imagem/vídeo pela extensão na URL ou no título) — se o caminho não tiver extensão, o `title` cobre o caso.
4. Reenviar a tarefa de teste (remover e recolocar a tag "enviar aprovação") e validar no log de relay que o anexo saiu com `url` preenchida.

## Detalhes técnicos

- Arquivo alterado: `src/lib/relay-approval.server.ts` (montagem da lista `attachments` e do objeto do post).
- Consulta de anexos passa a trazer também `file_type`/mime de `task_attachments` (se a coluna existir; caso contrário, deduzir pela extensão do `file_name`).
- Nada muda no `hub-inbox` (entrada), nas tags, nem no fluxo de aprovação/reprovação.
