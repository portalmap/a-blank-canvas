# Importar anexos das tarefas (julho/agosto 2026)

## Verificação já feita

- O CSV traz **840 anexos** em **368 tarefas** (as outras linhas são tarefas sem anexo).
- Todas as tarefas do arquivo já existem aqui.
- Volume total: **~3,2 GB**; maior arquivo 178 MB. Tipos: 638 imagens, 41 documentos, 35 vídeos, 112 sem tipo definido.
- Os arquivos estão em **projetos antigos** (3 hosts diferentes) e os links do CSV são assinados, válidos até **22/09/2026**. Amostra de 15 links testada: todos acessíveis.
- Uma exceção: **1 anexo** de um dos hosts antigos já retorna erro 400 (arquivo indisponível na origem).

Conclusão: é possível importar, mas não dá para apenas guardar os links — eles expiram. Os arquivos precisam ser **copiados para o storage deste projeto**.

## O que será feito

1. Para cada anexo, baixar o arquivo pelo link do CSV e subir para o bucket privado `task-attachments` deste projeto, no caminho padrão do sistema (`<usuário>/<tarefa>/<timestamp>_<nome>`).
2. Registrar o anexo na tarefa com: nome original do arquivo, tipo, tamanho e data de envio original.
3. O ID original do anexo é mantido, então rodar de novo não duplica nada.
4. Autoria: como a maioria de quem enviou não tem conta aqui, o anexo fica registrado como **Suporte** (mesma regra usada nos comentários) e o nome de quem enviou continua disponível no relatório final.
5. No fim eu entrego a lista de arquivos que falharam (a começar pelo anexo já indisponível na origem), com tarefa e nome do arquivo.

Como são ~3,2 GB, a cópia roda em lotes e leva alguns minutos; vou acompanhando o progresso e retomo de onde parou se algo cair.

## Detalhes técnicos

- Tabela `public.task_attachments` (`id`, `task_id`, `file_name`, `file_url`, `file_type`, `file_size`, `uploaded_by`, `created_at`). O campo `file_url` guarda o **path** no storage — é assim que o app já funciona (`useTaskAttachments` gera signed URL de 45 dias na leitura).
- Upload via API de storage com service role, `x-upsert: true`, streaming arquivo por arquivo para não estourar memória.
- Nome sanitizado no path igual ao `sanitizeFileName` do app; `file_name` guarda o nome original com acentos.
- `uploaded_by` = perfil `Suporte` (`b7e892cf-...`), pois a coluna é obrigatória. Nenhum perfil novo é criado.
- Sem migration, sem alteração de schema, RLS, SSO ou funções do Hub. Nenhum arquivo de código alterado.
