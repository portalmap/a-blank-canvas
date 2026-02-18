

# Mover Recorrência para abaixo das Datas

Alteração simples de posicionamento no `TaskMainContent.tsx`.

## Ordem Atual
1. Status e Prioridade
2. Datas (Início / Entrega)
3. Responsáveis
4. Etiquetas
5. **Recorrência** (posição atual)

## Nova Ordem
1. Status e Prioridade
2. Datas (Início / Entrega)
3. **Recorrência** (nova posição)
4. Responsáveis
5. Etiquetas

## Alteração Técnica

**Arquivo:** `src/components/tasks/TaskMainContent.tsx`

Mover o bloco `TaskRecurrenceConfig` (linhas 369-375) para logo após o fechamento do grid de datas (linha 361), antes do `TaskAssigneesManager` (linha 364).

