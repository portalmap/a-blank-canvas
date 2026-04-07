
# Botão "Relatório" no AccountReportDialog

## Resumo

Melhorar o `AccountReportDialog` para incluir um layout de tarefas igual ao `ProductivityReportDialog`: linhas clicáveis que navegam para a tarefa, cards de resumo no topo (com ícones e cores), indicador de dias em relação ao prazo, e visual mais polido.

## Alterações

### 1. Editar `AccountReportDialog.tsx`

- Adicionar cards de resumo no topo (4 cards: Antecipadas, No Prazo, Atrasadas, Sem Prazo) com ícones e contagens — mesmo estilo do ProductivityReportDialog
- Substituir o `renderTaskList` atual por um componente `TaskRow` clicável que:
  - Mostra dot colorido + título
  - Exibe prazo, data de conclusão, e diferença em dias (`+3d` / `-2d`)
  - Ao clicar, fecha o dialog e navega para `/tasks/{id}`
  - Mostra ícone de seta no hover
- Adicionar tab "Todas" como primeira aba (listando todas as tarefas juntas)
- Usar `useNavigate` para navegação

### 2. Nenhuma migration necessária

Os dados de tarefas já vêm do `get_account_productivity_report` — só precisa melhorar a apresentação.

## Arquivos

- 1 editado: `src/components/dashboards/cards/AccountReportDialog.tsx`

## Resultado

- Ao abrir o relatório de um Account, o usuário vê resumo visual + lista de tarefas clicáveis
- Cada tarefa é acessível com um clique, igual ao relatório de produtividade individual
