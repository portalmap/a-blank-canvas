# Plano — corrigir erro ao adicionar a etiqueta "enviar aprovação"

## Diagnóstico confirmado no código

O erro começou no novo disparo automático ligado à etiqueta `enviar aprovação`.

Pontos verificados:

- `src/hooks/useTaskTags.ts` chama `relayApprovalSend({ data: ... })` diretamente dentro do `onSuccess` do React Query.
- Em TanStack Start, chamadas de server function feitas a partir de hooks/componentes devem passar por `useServerFn(...)` para usar o protocolo correto e anexar a sessão corretamente.
- O padrão correto já existe no projeto em `UserManagement.tsx`, onde `backfillAvatarsFromHub` é chamado com `useServerFn`.
- `src/start.ts` já registra `attachSupabaseAuth`, então a infraestrutura de token existe; o problema está no modo como o novo relay foi chamado no hook.
- `src/lib/relay-approval.functions.ts` também contém constantes e helper em escopo de módulo. Para server functions neste stack, o arquivo deve ser fino: imports e declarações de server functions. Helpers/runtime devem ficar dentro do handler ou em módulo separado, para evitar problemas de split/runtime.

## Objetivo

Corrigir o erro ao adicionar a etiqueta sem mexer no SSO, sem mexer no `hub-inbox` e sem remover fluxos antigos.

## Correção proposta

1. **Corrigir a chamada da server function no hook de etiquetas**
   - Em `useAddTaskTag`, criar uma instância com `useServerFn(relayApprovalSend)`.
   - Trocar a chamada direta:
     - de `relayApprovalSend({ data: ... })`
     - para `sendApprovalRelay({ data: ... })`.

2. **Isolar a falha do relay da ação principal de adicionar etiqueta**
   - A inserção em `task_tag_relations` continua sendo a ação principal.
   - Se o envio ao Hub falhar, a etiqueta não deve ser removida nem bloquear a tela.
   - O usuário recebe apenas um aviso de falha no reenvio.

3. **Ajustar o arquivo da server function para o padrão seguro do TanStack Start**
   - Remover helpers/constantes runtime do escopo de módulo em `relay-approval.functions.ts`.
   - Manter o arquivo como wrapper fino da server function.
   - Colocar constantes e função `extractStoragePath` dentro do handler ou em módulo server-only separado, sem expor segredo ao cliente.

4. **Preservar o fluxo aprovado**
   - Continuar disparando somente quando a tag ID `78b84f6c-b619-40bd-94f8-c1c2a63842c0` for adicionada.
   - Continuar enviando ao Hub:
     - `assunto: "calendario.aprovacao"`
     - `modo: "entrega"`
     - `destinos: ["portal-map"]`
     - payload raiz com `name`
     - lista local em `tasks`, conforme o dicionário do Hub.

5. **Verificação depois da correção**
   - Validar que a aplicação não quebra ao abrir a tela da tarefa.
   - Validar que adicionar uma etiqueta comum continua funcionando.
   - Validar que adicionar `enviar aprovação` não gera erro de chamada da server function.
   - Conferir, quando possível, se o registro `enviado` aparece em `relay_diagnostico_log` com o status retornado pelo Hub.

## O que não será alterado

- SSO permanece intacto.
- `hub-inbox` permanece intacto.
- `tarefa.listar_para_aprovacao` permanece intacto.
- A tag antiga `enviar cliente` permanece intacta.
- Nenhum fluxo de recebimento do Hub será mexido.
