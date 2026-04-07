

# Correção: Erro ao Enviar Comentário com Atribuição na Tarefa

## Diagnóstico

O erro acontece **apenas quando você atribui alguém no comentário** (usando o botão "Atribuir"). O fluxo é:

1. O comentário é criado com sucesso (por isso aparece "Comentário com atribuição adicionado!")
2. O registro de atividade é criado com sucesso
3. **A notificação para o outro usuário FALHA** — porque a regra de segurança do banco só permite criar notificações para si mesmo, não para outra pessoa
4. Como a notificação falha, o sistema exibe "Erro ao enviar. Tente novamente."

Na prática, o comentário já foi salvo, mas a notificação não foi entregue ao usuário atribuído.

## Solução

Alterar a regra de segurança (RLS) da tabela `notifications` para permitir que **membros do mesmo workspace** criem notificações para outros membros. Isso é seguro porque a notificação é apenas informativa.

### 1. Migration SQL

- **Dropar** a política atual de INSERT: `Users can insert own notifications`
- **Criar** nova política: permitir INSERT quando o usuário autenticado é membro do mesmo workspace que o destinatário da notificação

```text
Regra atual:  user_id = auth.uid()  (só para si mesmo)
Regra nova:   o remetente deve ser membro do workspace da notificação
```

### 2. Nenhuma alteração no frontend

O código já está correto — o problema é exclusivamente a regra de acesso no banco de dados.

## Resultado

- Comentários com atribuição funcionarão sem erro
- Notificações serão entregues corretamente ao usuário atribuído
- A segurança é mantida (só membros do workspace podem criar notificações dentro dele)

## Arquivos

- 1 migration SQL (alterar RLS de `notifications`)
- 0 arquivos frontend

