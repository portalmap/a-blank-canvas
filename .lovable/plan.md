# Wendy não consegue atualizar o template de automações

## Causa confirmada

O template existente ("MAP |") é **global** (não pertence a nenhum workspace) e foi criado por outro usuário. As regras de acesso atuais dizem:

- Editar o template: só o **criador**, ou um administrador **do workspace do template** — e como o template é global, não existe workspace, então essa segunda condição nunca vale.
- Editar pastas, listas, tarefas e automações do template: **apenas o criador**, sem exceção.

Wendy Uda é administradora (perfil "administrador" e admin do workspace), mas não é a criadora do template. Por isso a gravação é recusada e a tela mostra "Erro ao atualizar template".

## Correção proposta

### 1. Ajustar as regras de acesso (banco)
Uma migração que substitui as regras de escrita dos templates de Space, ampliando o acesso para **administradores em geral**:

- Pode criar, editar e excluir **qualquer** template de Space (global ou de workspace) quem for:
  - o criador do template, ou
  - **administrador** do sistema (papel `admin`/`owner` do app, administrador global do Hub), ou
  - administrador do workspace do template (quando o template pertence a um workspace).
- As mesmas condições aplicadas às tabelas filhas: pastas, listas, tarefas e automações do template — hoje elas exigem ser o criador, o que bloqueia o salvamento das automações.
- Limpeza das regras duplicadas de atualização/exclusão em `space_templates` (existem duas versões sobrepostas hoje).

Leitura continua como está: qualquer membro do workspace, e todos para templates globais.

### 2. Mensagem de erro útil (frontend)
Em `src/hooks/useSpaceTemplates.ts`, o `useUpdateSpaceTemplate` faz `.single()` na atualização; quando nenhuma linha é permitida, o erro genérico aparece. Passar a detectar esse caso e mostrar "Você não tem permissão para editar este template" em vez de "Erro ao atualizar template".

## Verificação

1. Entrar como Wendy, abrir Configurações > Modelos de Automação > template "MAP |", adicionar uma automação e salvar: deve salvar sem erro.
2. Confirmar que um usuário membro comum (não administrador e não criador) continua sem conseguir editar, recebendo a mensagem clara de permissão.
