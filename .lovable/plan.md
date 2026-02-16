

# Reorganizar Categorias de Gatilhos

## Alteracoes no arquivo `src/components/automations/advanced/triggerCategories.ts`

### 1. Remover o grupo "Popular"
Mover seus itens para outros grupos:
- `on_task_created` ("Tarefa ou subtarefa criada") -> grupo "Adicionar ou mover"
- `on_custom_field_changed` ("Alteracoes de campo personalizado") -> grupo "Gerenciamento de tarefas"
- `on_status_changed` ("Alteracoes de status") -> grupo "Gerenciamento de tarefas"
- `on_schedule` ("A cada...") -> grupo "Datas e horario"

### 2. Resultado esperado dos grupos

- **AI** (1 item) - sem alteracao
- **Adicionar ou mover** (3 itens) - adicionar `on_task_created`
- **Comunicacao** (1 item) - sem alteracao
- **Criar e concluir** (2 itens) - sem alteracao
- **Datas e horario** (8 itens) - adicionar `on_schedule`
- **Gerenciamento de tarefas** (11 itens) - adicionar `on_custom_field_changed` e `on_status_changed`

### Resumo

- 1 arquivo modificado: `src/components/automations/advanced/triggerCategories.ts`
- Remover a categoria "Popular" inteira
- Redistribuir os 4 gatilhos para as categorias indicadas
- Nenhuma alteracao de logica ou banco de dados

