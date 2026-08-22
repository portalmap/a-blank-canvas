# Importar tarefas de julho/agosto do MAP Flow antigo

Trazer para o banco atual toda a estrutura e as tarefas do CSV enviado, dentro do workspace **Operacional MAP** (o único existente hoje).

## O que o CSV contém

- 1.009 tarefas (808 tarefas + 201 subtarefas), todas do workspace "Operacional MAP"
- 26 spaces, 26 pastas, 85 listas (combinação space/pasta/lista)
- 12 nomes de status diferentes, variando por tipo de lista
- 6 tags ("enviar cliente", "enviar designer", "enviar editor de vídeo", "enviar gestor tráfego", "enviar social media", "tecnologia")
- Datas de início/entrega, conclusão, criação, atualização, prioridade, tipo, marco, tempo estimado/gasto, vínculo de subtarefa

Hoje o banco tem 0 spaces, 0 pastas, 0 listas e 0 tarefas — a importação começa do zero, sem risco de duplicar nada.

## Decisões confirmadas

- **Nomes**: mantidos exatamente como no CSV, incluindo o sufixo do cliente (pasta "Tarefas & Demandas | Accerth", lista "Plan. de Criativos | Accerth").
- **Responsáveis**: só as 4 pessoas que já existem aqui (Victor Borges, Rodrigo Braz, Wendy Uda, Suporte) recebem atribuição; as demais tarefas ficam sem responsável.
- **Comentários e anexos**: fora desta importação (o CSV traz só a quantidade). Ficam para um segundo CSV.

## O que será criado

1. **Spaces** — 26, no workspace Operacional MAP.
2. **Pastas** — 1 por space, dentro do space correspondente.
3. **Listas** — 85, cada uma dentro da sua pasta, visão padrão "list".
4. **Status por lista** — cada lista recebe exatamente os status que aparecem nas tarefas dela no CSV (ex.: "Plan. de Criativos" ganha Aguardando, A Fazer, Em Progresso, Planejar Postagem, Temas Enviados, Instagram, LinkedIn, Blog, Canal Whatsapp, Concluído), com a categoria vinda do CSV (`not_started` / `active` / `in_progress` / `done`) e o primeiro como padrão.
5. **Tags** — as 6 tags do workspace, vinculadas às tarefas correspondentes.
6. **Tarefas** — 1.009 registros preservando o `tarefa_id` original (mesmos UUIDs), com título, descrição, status, prioridade, datas, conclusão, criação/atualização, tipo marco, tempo estimado/gasto e vínculo pai→filho das subtarefas.
7. **Responsáveis** — `assignee_id` e `task_assignees` apenas para as pessoas existentes; seguidores seguem a mesma regra.

## Ponto de atenção

A integração `calendario.publicar` (recebimento do Hub) procura a pasta **"Tarefas & Demandas"** e a lista **"Plan. de Criativos"** com nome exato. Como decidimos manter o sufixo do cliente, essas listas importadas **não** serão encontradas por essa integração. Duas saídas depois: ajustar a regra da integração para casar por prefixo/cliente, ou renomear as listas. Não faz parte desta importação.

## Detalhes técnicos

- Tudo aplicado por uma migration SQL única e transacional, gerada a partir do CSV (nenhum código de app muda).
- Triggers existentes de status default por workspace e de criação de canal de chat por space continuam ativos; a inserção respeita a ordem spaces → folders → lists → statuses → tasks (pais antes de filhos) → tags → assignees.
- `created_by_user_id` (NOT NULL) recebe o usuário global `portal@assessoriamap.com.br` quando o autor do CSV não existe aqui; o nome original do autor não é perdido porque a tarefa mantém as datas e o histórico textual.
- Texto com quebras de linha, acentos e aspas é escapado corretamente (dollar-quoting).
- Verificação final: contagem de spaces (26), pastas (26), listas (85), tarefas (1.009), subtarefas com pai válido (201) e nenhuma tarefa com status de outra lista.
