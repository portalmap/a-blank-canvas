# Migração Lovable Cloud → Supabase externo

Importante: o projeto **atual** continuará vinculado ao Lovable Cloud (não é possível desconectar). A estratégia abaixo cria um **clone** apontando para um Supabase próprio, em um **novo projeto Lovable**.

## Visão geral em 6 fases

```
[1] Provisionar          [2] Exportar schema       [3] Exportar dados
    Supabase próprio  →      (DDL + funções)    →     (pg_dump --data)
                                                          ↓
[6] Cutover DNS      ←   [5] Edge functions     ←   [4] Restaurar no
    e usuários               + secrets               novo Supabase
```

---

## Fase 1 — Provisionar destino

1. Criar conta/projeto em supabase.com (região igual à atual para minimizar latência).
2. Anotar: `Project URL`, `anon key`, `service_role key`, senha do Postgres.
3. Criar projeto novo no Lovable **sem** Lovable Cloud e conectá-lo ao Supabase próprio.

## Fase 2 — Exportar schema (estrutura)

Do Supabase atual (acessível via Connectors → Lovable Cloud → View Backend), rodar:

```bash
pg_dump \
  --schema-only \
  --no-owner --no-privileges \
  --schema=public --schema=storage \
  "postgresql://postgres:[SENHA]@[HOST]:5432/postgres" \
  > schema.sql
```

Inclui: ~50 tabelas, enums (`app_role`, `chat_channel_type`, etc.), ~60 funções/RPCs (productivity, followers, automations), triggers, policies RLS e grants.

**Limpeza manual em `schema.sql`** antes de aplicar:
- Remover linhas referentes a schemas gerenciados (`auth`, `realtime`, `vault`, `supabase_functions`, `extensions`).
- Manter apenas DDL de `public` e definições de buckets em `storage`.

## Fase 3 — Exportar dados

```bash
pg_dump --data-only --no-owner \
  --schema=public \
  --exclude-table=public.schema_migrations \
  "postgresql://..." > data.sql
```

Para **auth.users** (não acessível por pg_dump padrão), usar Supabase Management API ou script com `service_role` que lê de `auth.admin.listUsers()` e replica via `auth.admin.createUser({ email, password_hash, ... })`. Isso preserva IDs (essencial — `profiles.id` e FKs referenciam `auth.users.id`).

Storage (`task-attachments`, `chat-attachments`, `stickers`): script Node que lista todos os objetos no bucket de origem e faz upload no destino com mesmo path.

## Fase 4 — Restaurar no destino

Ordem obrigatória:

1. Aplicar `schema.sql` (cria tabelas + RLS + funções).
2. Recriar buckets em Storage (private, mesmos nomes).
3. Importar `auth.users` via API.
4. Aplicar `data.sql` (FKs já têm os user_ids corretos).
5. Reativar publicação realtime se necessário (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`).
6. Subir objetos do storage.

## Fase 5 — Edge functions e secrets

- Copiar `supabase/functions/*` para o novo projeto Lovable.
- Redeploy automático ao conectar.
- Reconfigurar secrets no novo projeto: `RESEND_API_KEY`, `LOVABLE_API_KEY`, e quaisquer chaves de integração (GCSM/Social Flow, etc.).
- Configurar auth providers (Google OAuth) novamente no dashboard do novo Supabase.

## Fase 6 — Cutover

1. Smoke test: login, criar tarefa, comentário, anexo, automação, chat, productivity report.
2. Comparar contagens (`SELECT count(*)` por tabela) entre origem e destino.
3. Comunicar nova URL aos usuários (eles mantêm email/senha porque importamos `auth.users`).
4. Atualizar webhooks externos (GCSM aponta para o novo `api-gateway` URL).
5. Manter o projeto Cloud antigo em modo somente-leitura por ~30 dias como fallback.

---

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| IDs de usuário divergentes quebram FKs | Importar `auth.users` preservando UUIDs antes dos dados |
| Senhas de usuários perdidas | Usar `password_hash` via Admin API; senhas continuam válidas |
| Triggers disparando durante `data.sql` | `SET session_replication_role = replica;` durante restore |
| Sequências fora de sincronia | `SELECT setval(...)` em todas as sequências após restore |
| Storage signed URLs antigas (15 dias) | Sem fix — apenas avisar; novas URLs geradas no novo Supabase |
| Realtime publication | Re-adicionar tabelas no novo projeto |

## Estimativa de esforço

- Schema export/cleanup: ~2h
- Auth migration script: ~3h
- Data restore + verificação: ~2h
- Storage migration: ~1h (depende do volume)
- Edge functions + secrets: ~1h
- Testes + cutover: ~3h

**Total: ~1–2 dias de trabalho focado.**

## Próximo passo sugerido

Confirma que quer seguir por esse caminho? Se sim, começo gerando:
1. O script de export do schema já limpo
2. O script Node de migração de `auth.users` + storage
3. Checklist executável passo a passo

Ou, se preferir, posso primeiro abrir o painel atual do Supabase pra você ver tudo que existe antes de decidir.