# Unificar as etapas "A Fazer" duplicadas

## Situação confirmada no banco

São 17 etapas órfãs, **todas com o nome "A Fazer"**, uma em cada lista, somando 47 tarefas. Cada uma dessas listas já tem também a etapa "A Fazer" oficial do modelo (posição 1), ou seja: hoje a lista mostra "A Fazer" duas vezes.

| Lista (Space) | Modelo | Tarefas na órfã |
| --- | --- | --- |
| Designer/Edição de Vídeo \| BrasaLux | Design/Edição de Vídeo | 8 |
| Tráfego Pago \| Ser e Sentir Estética | Tráfego Pago | 6 |
| Tráfego Pago \| Acopremo | Tráfego Pago | 6 |
| Designer/Edição de Vídeo \| Accerth | Design/Edição de Vídeo | 5 |
| Tráfego Pago \| Monvizo BR | Tráfego Pago | 3 |
| Tráfego Pago \| Viviane Trajano | Tráfego Pago | 3 |
| Tráfego Pago \| Dra Aline Bordim | Tráfego Pago | 3 |
| Designer/Edição de Vídeo \| Tintas Palmares | Design/Edição de Vídeo | 2 |
| Tráfego Pago \| PsicoMed | Tráfego Pago | 2 |
| Plan. de Criativos \| Monvizo PRO | Plan. de Criativos | 2 |
| Plan. de Criativos \| Tintas Palmares | Plan. de Criativos | 1 |
| Designer/Edição de Vídeo \| Mania de Vidros | Design/Edição de Vídeo | 1 |
| Designer/Edição de Vídeo \| Monvizo BR | Design/Edição de Vídeo | 1 |
| Designer/Edição de Vídeo \| Monvizo PRO | Design/Edição de Vídeo | 1 |
| Tráfego Pago \| Aviões e Músicas | Tráfego Pago | 1 |
| Tráfego Pago \| King Talhas | Tráfego Pago | 1 |
| Tráfego Pago \| BrasaLux | Tráfego Pago | 1 |

## O que será feito

1. Para cada uma das 17 listas, mover as tarefas da etapa "A Fazer" órfã para a etapa "A Fazer" do modelo da mesma lista.
2. Depois de mover, excluir as 17 etapas órfãs — cada lista passa a ter apenas uma "A Fazer", vinculada ao modelo e sincronizada.
3. Conferir que o total de tarefas com etapa continua igual (1.196) e que nenhuma lista ficou com "A Fazer" duplicada.

Nada de código de aplicação muda: é uma correção de dados no módulo de status.

## Detalhes técnicos

- Ajuste de dados (`run_sql`, sem migration): `UPDATE public.tasks SET status_id = <a_fazer_do_modelo>` para as tarefas cujo `status_id` é uma etapa com `template_item_id IS NULL`, `template_id IS NOT NULL`, `scope_type = 'list'` e nome normalizado "a fazer"; destino = etapa do mesmo `scope_id` com `template_item_id IS NOT NULL` e mesmo nome normalizado (menor `order_index`).
- Em seguida `DELETE FROM public.statuses` dessas 17 linhas, já sem tarefas apontando para elas.
- Verificação com contagens antes/depois de `tasks` por etapa e da lista de etapas por escopo.
