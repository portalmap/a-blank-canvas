# Plano: corrigir novo erro ao adicionar a etiqueta "enviar aprovação"

## Diagnóstico confirmado

O erro não está mais na adição da etiqueta em si. A etiqueta foi adicionada e o MAP Flow tentou enviar o evento `calendario.aprovacao` ao Hub.

O Hub/Portal recusou a entrega com validação 422:

```text
payload_invalido
fieldErrors.posts: Expected string, received null
```

O log do MAP Flow mostra que o envio atual está saindo como `tasks: [...]`, com alguns campos nulos (`format`, `due_date`) e sem um campo literal `posts` preenchido no formato que o Portal está validando.

## O que será corrigido

1. Ajustar o payload de saída de `calendario.aprovacao` para não enviar valores nulos em campos que o destino valida como string.
2. Incluir/preencher o campo `posts` com texto válido derivado da tarefa, usando esta prioridade:
   - descrição da tarefa convertida para texto simples, quando existir;
   - título da tarefa como fallback.
3. Manter o envio passando pelo Hub com destino `portal-map`, sem criar atalho direto para o Portal.
4. Preservar o comportamento atual: a etiqueta continua sendo aplicada mesmo se o relay falhar.
5. Melhorar a mensagem de retorno para diferenciar:
   - etiqueta aplicada, mas envio recusado pelo Portal;
   - Hub indisponível;
   - relay não configurado.
6. Registrar no log de diagnóstico o payload normalizado enviado e a resposta do Hub, sem expor token.

## Validação

1. Remover e adicionar novamente a etiqueta `enviar aprovação` na tarefa de teste.
2. Conferir se o novo registro em `relay_diagnostico_log` retorna status aceito pelo Hub/Portal.
3. Confirmar que o payload não contém `posts: null` nem strings obrigatórias nulas.
4. Confirmar visualmente que a etiqueta permanece aplicada na tarefa.

## Detalhes técnicos

- Arquivo principal a ajustar: `src/lib/relay-approval.server.ts`.
- Manter `src/lib/relay-approval.functions.ts` como wrapper fino de `createServerFn`.
- A normalização deve converter a descrição TipTap/JSON da tarefa para texto simples antes de enviar ao Portal.
- Campos opcionais sem valor devem ser omitidos ou convertidos para string vazia somente quando o contrato do destino exigir string.
- Nenhuma mudança de banco é necessária para esta correção.
