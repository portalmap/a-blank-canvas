
# Excluir Canais "Empresa Teste"

## O que sera feito

Excluir os 3 canais de chat identificados no banco de dados:

| Canal | ID |
|---|---|
| MAP \| Empresa Teste 2 Chat | `2cf7eb8d-2f5a-4f8a-acaa-db2c19e3d12e` |
| MAP \| Empresa Teste Chat | `fa790b89-7a0f-4c4d-8ed9-6973a749664c` |
| MAP \| Empresa Teste Chat | `a4dcef5e-868b-4292-a34d-34ce12d62eef` |

## Dados relacionados

- **Mensagens**: nenhuma (os canais estao vazios)
- **Membros**: nenhum registro
- **Status de leitura**: 3 registros que serao excluidos junto

## Execucao

Uma unica migracao SQL para:

1. Excluir registros de `chat_read_status` dos 3 canais
2. Excluir os 3 registros de `chat_channels`

Nenhuma alteracao de codigo e necessaria.
