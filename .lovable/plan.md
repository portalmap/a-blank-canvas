# Aplicar automações de modelo: importar, criar o que falta e substituir o que já existe

## O que está acontecendo

O aviso "Este template não possui automações habilitadas" está correto para os dados de hoje: o modelo "MAP | Tarefas & Demandas | Tráfego Pago |" não tem nenhuma automação cadastrada dentro dele. Verifiquei no banco:

- As 7 automações reais existem apenas nas listas do space "MAP | Tintas Palmares" (Tráfego Pago, Designer/Edição de Vídeo, Plan. Social Media, Plan. de Criativos).
- Só o modelo antigo "MAP |" tem as 7 automações registradas. Todos os modelos novos (Tráfego Pago, Designer, Social Media, Criativos, Tech, Onboarding, Informações) estão com zero.

Ou seja: falta uma forma prática de trazer as automações que já funcionam para dentro dos modelos novos, e a janela de aplicar precisa se comportar como você descreveu (manter o que existe, criar o que falta).

## O que vou fazer

### 1. Importar automações para dentro do modelo

Na tela do modelo (Configurações > Automações > Editar), um botão **"Importar automações"** com duas origens:

- **De um space, pasta ou lista real** — escolhe na árvore (ex.: Tráfego Pago | Tintas Palmares) e traz as automações daquele escopo.
- **De outro modelo** — traz as automações de um modelo já preenchido (ex.: "MAP |").

Na importação, gatilho, ação, descrição, etiqueta e status são convertidos para as referências do modelo (pasta/lista/etapa por nome). Se alguma etapa citada não existir no modelo, a automação é importada e marcada com um aviso do que precisa ser ajustado, em vez de ser descartada em silêncio.

### 2. Aplicar em pastas e listas com a regra que você pediu

Na janela "Aplicar Automações em Listas/Pastas":

- **Destino já existe** → mantém a pasta/lista e as tarefas; automações equivalentes (mesmo gatilho + ação + descrição) são substituídas, e as demais automações do destino continuam intactas.
- **Destino não existe** → a pasta ou lista é criada dentro do space escolhido, com as etapas do modelo, e recebe as automações. Nada de tarefa é criado.
- A árvore de seleção passa a mostrar, além do que existe, as pastas/listas do modelo que ainda **faltam** em cada space, marcadas como "será criada", para você poder selecioná-las.

### 3. Aviso claro em vez de erro vermelho

Quando o modelo estiver sem automações, a janela abre com um aviso explicativo e um atalho para "Importar automações"; o botão "Aplicar Automações" fica desativado. Sem mais toast de erro.

## Detalhes técnicos

- `useTemplateAutomations`: novas mutações `useImportAutomationsFromScope` (lê `automations` por `scope_type`/`scope_id` e converte `action_config` para refs do modelo) e `useImportAutomationsFromTemplate` (copia `space_template_automations` remapeando `folder_ref_id`/`list_ref_id` por nome).
- Novo `ImportTemplateAutomationsDialog.tsx` reutilizando `LocationTree` (origem única) e um seletor de modelo.
- `useApplyTemplateAutomationsToScopes` em `useSpaceTemplates.ts`: aceita destinos "virtuais" (`{ spaceId, path }`) e, antes de aplicar, cria a pasta/lista faltante (`folders`/`lists`) e sincroniza as etapas via o modelo de status já vinculado à lista do template; mantém o retorno com criadas/substituídas/erros.
- `ApplyTemplateAutomationsToScopeDialog.tsx`: estado vazio bloqueante, itens "a criar" na árvore e contagem atualizada.
- Sem migração de banco: as tabelas `space_template_automations`, `folders`, `lists` e `statuses` já suportam tudo isso.
