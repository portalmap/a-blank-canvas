# Trocar a tag de aprovação: "enviar cliente" → "enviar aprovação"

## Diagnóstico (confirmado)

O fluxo desejado já existe e já passa pelo Hub:

```text
Usuário marca tag na tarefa (MAP Flow)
        ↓
Portal MAP chama o Hub: assunto "tarefa.listar_para_aprovacao"
        ↓
Hub retransmite → hub-inbox do MAP Flow
        ↓
MAP Flow filtra tarefas com a tag e devolve posts + anexos (URLs assinadas)
        ↓
Portal MAP exibe o post para aprovação do cliente
```

- O filtro da tag está em `supabase/functions/hub-inbox/index.ts`, constante `TAG_APROVACAO = "enviar cliente"` (linha 108), usada com `.ilike` na busca da tag em `task_tags`.
- No banco existe a tag `enviar cliente` (id `d4f8592e-66dc-4b5b-b5c2-858571a031e5`) no workspace Operacional MAP, com tarefas já relacionadas em `task_tag_relations`.
- Nenhum outro ponto do código (frontend ou backend) referencia essa tag.

## Mudanças

1. **Banco de dados (run_sql):** renomear a tag existente para `enviar aprovação` (UPDATE em `task_tags`). Isso preserva automaticamente todas as tarefas que já estão marcadas — nenhuma relação é perdida.
2. **Edge Function `hub-inbox`:** alterar a constante para `TAG_APROVACAO = "enviar aprovação"` e redeploy.
3. **Documentação:** atualizar a menção à tag em `docs/INTEGRATIONS.md` (se houver) e em `docs/INTEGRACAO-SOCIAL-FLOW-CAMPOS.md`.

## Observações

- O assunto `tarefa.listar_para_aprovacao` e o formato do payload não mudam — Hub e Portal MAP não precisam de nenhum ajuste.
- A busca usa `ilike`, que é case-insensitive mas **não** ignora acento: o nome da tag no banco e a constante precisam ser idênticos quanto ao "ç/ã". Usarei exatamente `enviar aprovação`.
- Como o Hub só repassa o assunto, nada precisa ser cadastrado novamente no relay.

## Validação

- Query confirmando a tag renomeada e as relações intactas.
- Enviar ao `hub-inbox` um `tarefa.listar_para_aprovacao` de teste e confirmar que a tarefa marcada retorna.
