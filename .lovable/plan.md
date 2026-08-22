# Ajuste do `calendario.publicar` no hub-inbox

Dois ajustes na regra de criação da tarefa. Nada mais é tocado.

## AJUSTE 1 — Lista de destino fixa: "Tarefas & Demandas" → "Plan. de Criativos"

Substitui a função `resolverListaDestino`. Nova regra, dentro do workspace já resolvido pelo nome do cliente:

1. Busca as pastas (`folders`) do workspace e escolhe a que tem nome normalizado igual a `tarefas & demandas`.
   - Nenhuma → rejeita `pasta_destino_nao_encontrada` (422), informando as pastas existentes.
   - Mais de uma → rejeita `pasta_destino_ambigua` (422).
2. Busca as listas (`lists`) com `folder_id` daquela pasta e escolhe a de nome normalizado `plan. de criativos`.
   - Para tolerar variação de pontuação, a comparação também remove pontos e colapsa espaços (`plan de criativos` casa).
   - Nenhuma → rejeita `lista_destino_nao_encontrada` (422), informando a pasta encontrada e as listas dentro dela.
   - Mais de uma → rejeita `lista_destino_ambigua` (422).

Removidas: a regra da lista "Calendário" e a regra da "única lista do workspace". O `payload.list_id` deixa de existir como atalho — a lista é sempre a canônica (posso manter o `list_id` explícito se você preferir; hoje o Social Flow não manda).

A normalização continua a mesma já usada (NFD sem acento, minúsculo, espaços aparados).

## AJUSTE 2 — Status = nome do canal do post

Substitui `resolverStatusInicial` (que pegava o `is_default`). Agora, por post:

- Monta o conjunto de status aplicáveis à lista "Plan. de Criativos", na hierarquia que o sistema já usa: status de escopo `list` daquela lista; se a lista não tiver status próprios, os do `space` dela; senão os do `workspace`.
- Procura nesse conjunto o status cujo nome normalizado seja igual ao `social_channel` do post.
- Achou → é o `status_id` da tarefa.
- Não achou (ou o post veio sem `social_channel`) → **rejeita só aquele post**, sem criar tarefa, com item de resultado:

```json
{ "external_post_ref": "post-1", "task_id": null, "status": "erro",
  "error": "status_do_canal_nao_encontrado",
  "canal": "Instagram",
  "status_disponiveis": ["Instagram", "Facebook", "TikTok"] }
```

Os demais posts da mesma mensagem continuam sendo criados normalmente. Nenhum status default é usado em nenhum caso.

## Erros — resumo

| Situação | Resposta |
|---|---|
| Cliente não encontrado / ambíguo | 422 `cliente_nao_encontrado` / `cliente_ambiguo` (inalterado) |
| Pasta "Tarefas & Demandas" ausente/duplicada | 422 `pasta_destino_nao_encontrada` / `pasta_destino_ambigua` (mensagem inteira recusada, nada criado) |
| Lista "Plan. de Criativos" ausente/duplicada na pasta | 422 `lista_destino_nao_encontrada` / `lista_destino_ambigua` |
| Canal do post sem status correspondente | 200, item do post com `status: "erro"` e `status_do_canal_nao_encontrado` |

## Confirmações do que continua igual

- Resolução do cliente por `workspaces.name` normalizado, com os três casos (achou / não achou / ambíguo).
- Uma tarefa por post e a devolução do `task_id` de cada post na resposta, na mesma ordem, com o `external_post_ref` ecoado.
- Idempotência por mensagem (`hub_inbox_processed`) e por post (`external_post_ref` + índice único parcial, incluindo o tratamento de corrida `23505`).
- Anexos em `task_attachments` só para tarefas criadas agora; autor técnico (criador do workspace → proprietário global).
- SSO, `diagnostico.ping`, `tarefa.listar_para_aprovacao`, `verify_jwt = false` e a comparação de token: intocados.
- Nenhuma migration, nenhuma outra edge function alterada. Só `supabase/functions/hub-inbox/index.ts`.

## Observação sobre o banco atual

Hoje o único workspace ("TESTE HUB") tem a pasta "Pasta teste" com "Lista teste", e os status existentes são de escopo `workspace` ("A Fazer", "Aguardando", "Em Progresso", "Concluído") — nenhum com nome de canal. Ou seja: depois do ajuste, os testes reais só passam quando a pasta "Tarefas & Demandas", a lista "Plan. de Criativos" e os status com nome dos canais existirem no workspace do cliente. Antes disso a resposta será exatamente o erro de rejeição descrito acima.
