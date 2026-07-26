## Diagnóstico

A resolução de signed URL **já existe** no `hub-inbox` (`resolveAttachmentUrls` / `resolveTasksAttachments`, replicadas do `api-gateway`) e já é chamada antes do mapeamento. O problema é o comportamento de fallback:

```ts
if (signed[i]?.signedUrl) a.file_url = signed[i].signedUrl;
```

Quando o Storage não consegue assinar um item — que é exatamente o caso do anexo de teste, cujo objeto não existe fisicamente no bucket privado `task-attachments` — `createSignedUrls` devolve aquele item com `error` e `signedUrl: null`. O código então **mantém o path original**, que é o que aparece hoje em `"url"`.

## Correção (somente `supabase/functions/hub-inbox/index.ts`)

1. Em `resolveAttachmentUrls`, trocar o fallback silencioso: para cada anexo cujo path não pôde ser assinado, definir `file_url = null` em vez de manter o path.
2. Cobrir também a falha global (erro na chamada `createSignedUrls`): nesse caso todos os itens não resolvidos ficam com `url: null`, sem lançar exceção — a resposta continua íntegra.
3. Registrar no console apenas a contagem de falhas e a mensagem de erro do Storage, **sem** paths, ids de tarefa ou nomes de arquivo.
4. TTL segue o mesmo do projeto: `3888000` segundos (45 dias).
5. `api-gateway` não é tocado; `list_name`, `space_name`, `description` e o restante do payload permanecem idênticos.
6. Fazer o deploy da função `hub-inbox`.

## Observação importante sobre o teste

Como o arquivo `briefing-teste.pdf` não existe de fato no bucket, o retorno correto após a correção será `"url": null` — não uma URL `https://`. Isso confirma que o caminho de assinatura está sendo acionado, mas para ver uma URL `https://` de verdade é preciso um anexo com objeto real no Storage. Se você quiser validar o formato `https://`, posso na sequência subir um PDF de teste real no bucket no mesmo path (basta pedir).
