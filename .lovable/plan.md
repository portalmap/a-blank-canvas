

# Plano de Segurança — 3 Itens + Recomendações Adicionais

## Contexto

- **Item 1 (HIBP)**: Já realizado pelo usuário — nenhuma ação necessária.
- **Item 2 (Políticas RLS permissivas)**: 5 políticas com `true` encontradas em 3 tabelas.
- **Item 3 (space_templates exposto)**: Tabela acessível ao público sem autenticação.

---

## Item 2 — Corrigir políticas RLS permissivas

### Tabelas afetadas e diagnóstico

| Tabela | Política | Problema |
|---|---|---|
| `notifications` | INSERT `WITH CHECK (true)` | Qualquer pessoa pode inserir notificações para qualquer usuário |
| `webhook_deliveries` | INSERT `WITH CHECK (true)`, UPDATE `USING (true)` | Escritas abertas ao público |
| `webhook_inbox` | INSERT `WITH CHECK (true)`, UPDATE `USING (true)` | Escritas abertas ao público |

### Solução

Essas tabelas de `notifications`, `webhook_deliveries` e `webhook_inbox` recebem writes de Edge Functions (que usam `service_role_key`). A role `service_role` já **bypassa RLS automaticamente**. Portanto, as políticas permissivas para `{public}` são desnecessárias.

**Migration SQL:**
- Dropar as 5 políticas permissivas
- Recriar com restrição a `authenticated` + validação de pertencimento ao workspace:
  - `notifications` INSERT: `WITH CHECK (user_id = auth.uid())` — apenas o próprio sistema via service_role insere para outros
  - `webhook_deliveries` INSERT/UPDATE: restringir para `service_role` only (dropar a policy e não recriar — service_role já bypassa)
  - `webhook_inbox` INSERT/UPDATE: mesmo tratamento

---

## Item 3 — Restringir `space_templates`

### Problema

A política SELECT usa role `{public}` e permite `workspace_id IS NULL` — templates globais ficam visíveis sem autenticação.

### Solução

**Migration SQL:**
- Dropar a política SELECT atual
- Recriar exigindo `auth.uid() IS NOT NULL` (apenas `authenticated`):
  ```
  USING (
    auth.uid() IS NOT NULL
    AND (
      workspace_id IS NULL
      OR EXISTS (SELECT 1 FROM workspace_members WHERE ...)
    )
  )
  ```
- Alterar as demais políticas (INSERT, UPDATE, DELETE) de `{public}` para `TO authenticated`

---

## Recomendações adicionais de segurança

Após análise completa das 68 tabelas:

1. **Todas as políticas usam role `{public}` em vez de `TO authenticated`** — Isso significa que tokens anônimos (anon key) podem tentar operações. Recomendo migrar gradualmente todas as políticas para `TO authenticated` onde aplicável.

2. **`profiles` SELECT usa `USING (true)`** — Qualquer pessoa autenticada vê todos os perfis (nome, telefone, bio, avatar). Considerar restringir a membros do mesmo workspace.

3. **`api_tokens` armazena token em texto** — O campo `token` está em plain text. Idealmente deveria armazenar apenas o hash e mostrar o token uma vez ao criar.

4. **Edge Functions sem JWT verification** — Funções como `webhooks-inbound` e `api-gateway` podem não verificar JWT. Verificar se `verify_jwt = false` está configurado apenas onde necessário.

5. **Buckets de storage públicos** — `task-attachments` e `chat-attachments` são públicos. Qualquer pessoa com o URL pode acessar arquivos. Considerar tornar privados com políticas de acesso.

---

## Arquivos alterados

- 1 migration SQL (dropar e recriar ~8 políticas RLS)
- 0 arquivos frontend (as queries continuam funcionando pois os usuários já são autenticados)

## Prioridade de execução

1. Corrigir `space_templates` (item 3) — risco alto
2. Corrigir `notifications`, `webhook_*` (item 2) — risco médio
3. Recomendações adicionais — melhorias graduais

