
Objetivo: corrigir definitivamente o problema de login desse usuário e fazer o botão “Salvar cadastro” sincronizar os dados no banco completo (autenticação + perfil), não só no perfil.

1) Diagnóstico confirmado (causa raiz)
- Hoje, ao salvar no cadastro, o sistema atualiza apenas `profiles` (nome/telefone/bio).
- O e-mail de login vem de `auth.users` (base de autenticação) e não está sendo atualizado pelo formulário.
- Resultado: fica inconsistente (`profiles` com e-mail correto, `auth.users` com e-mail antigo/typo), então login e “esqueci a senha” continuam falhando.

2) Correção estrutural (fluxo correto de atualização)
- Criar função de backend `update-user-email` (admin-only) para atualizar e-mail em `auth.users` via API administrativa segura.
- Validar permissões (global owner/owner/admin de workspace), validar formato de e-mail e tratar erro de e-mail já existente.
- Atualizar `UserEditDialog` para:
  - ter estado local de e-mail editável;
  - ao clicar “Salvar”, se e-mail mudou, chamar `update-user-email`;
  - depois salvar perfil (nome/telefone/bio) como já faz hoje;
  - invalidar queries para refletir imediatamente no UI.

3) Correção de dados do caso atual (joaopessoa)
- Executar correção pontual do e-mail no registro de autenticação desse usuário para o endereço correto.
- Confirmar consistência final:
  - `auth.users.email` = correto
  - listagem de usuários exibindo o mesmo valor
  - login com senha resetada funcionando
  - fluxo “esqueci a senha” enviando para o e-mail certo

4) Robustez para evitar reincidência
- Regra no formulário: normalizar e-mail (`trim + lowercase`) antes de salvar.
- Mensagens de erro claras (ex.: e-mail duplicado, permissão insuficiente, formato inválido).
- Log de auditoria simples na função para facilitar suporte futuro.

5) Impacto no sistema
- Sem mudança de schema/tabela.
- Sem impacto em tarefas, chat, automações ou permissões existentes.
- Mudança focada no módulo de usuários/autenticação para garantir sincronização completa no salvar.

Detalhes técnicos
- Arquivos a ajustar:
  - `supabase/functions/update-user-email/index.ts` (novo)
  - `src/components/settings/UserEditDialog.tsx` (editar para salvar e-mail + perfil no mesmo fluxo)
  - `supabase/config.toml` (adicionar bloco da função, mantendo validação JWT conforme padrão do projeto)
- Ordem de execução no salvar:
  1. validar permissões e dados
  2. atualizar e-mail na autenticação (se alterado)
  3. atualizar perfil (`full_name`, `phone`, `bio`)
  4. invalidar cache/listagens
- Resultado esperado: “Salvar cadastro” passa a atualizar o banco completo de forma consistente.
