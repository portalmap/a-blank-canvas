## Objetivo

Validar a geração de signed URL no `hub-inbox` com um arquivo real e remover o log temporário de diagnóstico.

## Passos

1. **Subir PDF mínimo no Storage**
   - Gerar localmente um PDF válido mínimo (poucos bytes, 1 página em branco).
   - Fazer upload no bucket privado `task-attachments`, exatamente no path:
     `b7e892cf-ea9e-4d15-86d8-5243bce7034c/574e7766-db46-4acf-8523-4c6e67134d8f/1769000000000_briefing-teste.pdf`
   - Confirmar via consulta a `storage.objects` que o objeto passou a existir.

2. **Validar a resolução**
   - Chamar o `hub-inbox` com `assunto: "tarefa.listar_para_aprovacao"`, `modo: "consulta"` e `list_ids: ["8c066634-f5a9-4f27-af8f-94340ed0a9d3"]`.
   - Confirmar que `attachments[0].url` começa com `https://` (TTL de 45 dias mantido).

3. **Remover o log temporário**
   - Em `supabase/functions/hub-inbox/index.ts`, remover o `console.error("signed url item failed: …")` que expõe o path (bloco marcado como `TEMPORARIO (diagnostico)`).
   - Manter o comportamento atual: `file_url = null` quando não houver signed URL, e o log agregado apenas com a contagem de falhas.
   - Fazer novo deploy da função `hub-inbox`.

## Fora de escopo

Nenhuma mudança de lógica de resolução, TTL, formato de resposta, `api-gateway` ou schema.
