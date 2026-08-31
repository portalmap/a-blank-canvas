# Permissões do Hub não são reconhecidas no login

## O que eu verifiquei (dados reais)

Consultei o banco e o código do SSO. O papel do Hub **está** sendo gravado:

| e-mail | papel do Hub | papel global local | membro do workspace |
|---|---|---|---|
| rodrigobraz | administrador_global | global_owner | admin |
| wendyuda / mirianvilivas / amandatavares | administrador | admin | **nenhum** |
| joaopessoa | membro | — | member (adicionado à mão) |

Ou seja: o `sso-exchange` chama corretamente a sincronização e grava `admin` /
`global_owner`. O problema é depois disso.

## Causa

O acesso a workspaces, spaces, pastas, listas e tarefas é decidido pela
tabela de membros do workspace — não pelo papel global. Duas lacunas:

1. Quem entra pelo Hub **não recebe nenhum vínculo com workspace**. Sem esse
   vínculo, as regras de acesso não retornam nada: a pessoa loga e vê o sistema
   vazio (nenhum workspace, nenhum space), mesmo sendo "administrador" no Hub.
2. A função interna que libera "administrador do sistema" só reconhece
   `global_owner` e `owner`. O papel `admin` (vindo de `administrador` no Hub)
   não é considerado em nenhuma regra de visualização.

Por isso só funciona para quem é `administrador_global` **e** já tinha vínculo
manual no workspace.

## O que vou fazer

Módulo isolado de "provisionamento de acesso no login", sem alterar o fluxo de
SSO existente nem as telas.

1. **Mapa de papéis Hub → papel no workspace** (confirmado por você):
   - `Administrador Global` → **admin** (+ `global_owner` global)
   - `Administrador` → **admin** (+ `admin` global)
   - `Gestor` → **membro**
   - `Membro` → **membro**
   - `Convidado` → **convidado**

2. **Nova função no banco** (`provision_hub_user_access`) que, a cada login,
   garante o vínculo da pessoa em todos os workspaces ativos com o papel
   correspondente ao mapa acima. Ela apenas cria o que falta e corrige o papel
   quando o Hub mudou; nunca rebaixa nem apaga permissões específicas de space
   concedidas manualmente.
3. **Ajuste na regra de administrador do sistema**: `admin` global passa a
   contar como administrador do sistema para leitura, de modo que
   `administrador` do Hub veja os workspaces mesmo antes do vínculo existir.
4. **Chamada no `sso-exchange`**, logo após a sincronização de papel já
   existente, isolada em try/catch (falha aqui não bloqueia o login).
5. **Correção retroativa**: aplicar o provisionamento aos usuários já criados
   (wendyuda, mirianvilivas, amandatavares e demais), para não depender de um
   novo login.

## Ponto que preciso confirmar

Hoje existe mais de um workspace (ex.: "Operacional MAP", "TESTE HUB"). O padrão
que vou aplicar é: **todo usuário do Hub entra em todos os workspaces** com o
papel mapeado. Se você preferir um único workspace padrão (e os demais só por
convite manual), me diga qual e eu ajusto essa parte.

## Detalhes técnicos

- Migration: nova função `public.provision_hub_user_access(_user_id uuid, _role_slug text)`
  (SECURITY DEFINER, search_path fixo), atualização de `public.is_system_admin`
  para incluir `has_role(_user_id,'admin')`, e um `DO` block de backfill.
- `supabase/functions/sso-exchange/index.ts`: um `admin.rpc('provision_hub_user_access', ...)`
  ao lado do `sync_hub_role_to_app_roles` atual.
- Nenhuma mudança em componentes de UI ou hooks.
