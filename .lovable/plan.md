# Diagnóstico — `calendario.publicar` (nada alterado)

## 1. Schema Zod que valida o payload

### Raiz (`CalendarioSchema`)

```text
name           string | null   opcional
cliente_chave  string (min 1)  OBRIGATÓRIO
tasks          array (min 1)   OBRIGATÓRIO
```

### Cada item de `tasks` (`PostSchema`)

```text
external_post_ref  string (min 1)   OBRIGATÓRIO
title              string (min 1)   OBRIGATÓRIO
description        string | null    opcional
social_channel     string | null    opcional
format             string | null    opcional
due_date           string | null    opcional
attachments        array            opcional
```

### Cada item de `attachments` (`AnexoSchema`)

```text
url        string (min 1)   OBRIGATÓRIO  <- URL do arquivo
file_name  string (min 1)   opcional     <- nome do arquivo
file_type  string           opcional
file_size  number           opcional
```

## 2. JSON exato devolvido na resposta (status 200)

```text
{
  cliente: {
    nome_recebido: string,
    client_name: string | null,
    space_id: string,
    space_name: string
  },
  workspace_id: string,
  list_id: string,
  list_name: string | null,
  resultados: [
    {
      external_post_ref: string,
      task_id: string,
      status: "criada" | "ja_existia"
    }
  ]
}
```

Em caso de erro de processamento de um post dentro do array, o item pode vir com chaves extras:

```text
{
  external_post_ref: string,
  task_id: string | null,
  status: "erro",
  error: string,
  canal: string | null,
  status_disponiveis: string[]
}
```

Nada será alterado — apenas diagnóstico.
