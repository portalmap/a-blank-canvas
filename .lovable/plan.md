

# Adicionar Mirian e Amanda como seguidoras em todos os 33 Spaces

## Dados confirmados

- **mirianvilivas@assessoriamap.com.br** → `5e7a3657-7b0c-4312-ac0d-a129932ba69a`
- **amandatavares@assessoriamap.com.br** → `8326d4b4-c1ed-4a05-bb4e-f3469e290ca2`
- **33 Spaces** encontrados (todos com prefixo "MAP |")
- **0 registros existentes** — nenhuma das duas é seguidora de nenhum Space ainda

## O que será feito

Executar um script SQL que insere 66 registros na tabela `space_followers` (33 Spaces × 2 usuárias), usando `ON CONFLICT DO NOTHING` para segurança.

Os triggers de propagação do banco já cuidarão de cascatear as seguidoras para Pastas, Listas e Tarefas dentro de cada Space automaticamente.

## SQL a executar

```sql
INSERT INTO space_followers (space_id, user_id)
SELECT s.id, u.id
FROM spaces s
CROSS JOIN (
  VALUES 
    ('5e7a3657-7b0c-4312-ac0d-a129932ba69a'::uuid),
    ('8326d4b4-c1ed-4a05-bb4e-f3469e290ca2'::uuid)
) AS u(id)
ON CONFLICT DO NOTHING;
```

## Resultado esperado
- 66 registros em `space_followers`
- Propagação automática via triggers para todas as pastas, listas e tarefas existentes
- Nenhum arquivo de código alterado

