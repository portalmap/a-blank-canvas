# Importar anexos das tarefas (23–30 de agosto de 2026)

## O que já foi verificado

- O CSV traz **52 anexos** em **26 tarefas** (as demais linhas são tarefas sem anexo).
- **Todas as 26 tarefas já existem** aqui — nenhuma referência quebrada.
- Nenhum desses anexos está registrado ainda: é importação 100% nova, sem substituição.
- Volume total: **~91 MB** (45 PNG, 5 JPEG, 2 PDF) — importação rápida.
- Os arquivos estão no projeto antigo, com links assinados válidos até 22/09/2026. Amostra de 6 links testada: todos acessíveis (200).
- Quem enviou: Amanda Tavares (23), Juliane Levorato (14), um e-mail solto (7), Mirian Vilivas (5), Cadu Rios (2), João Pessoa (1).

Como os links expiram, não dá para só guardar a URL: os arquivos serão **copiados para o storage deste projeto**.

## O que será feito

1. Para cada anexo, baixar o arquivo pelo link do CSV e subir para o bucket privado `task-attachments` deste projeto, no caminho padrão do sistema (`<usuário>/<tarefa>/<timestamp>_<nome>`).
2. Registrar o anexo na tarefa com nome original, tipo, tamanho e a data de envio original.
3. O ID original do anexo é mantido, então rodar de novo não duplica nada.
4. Autoria: os anexos ficam registrados como **Suporte** (mesma regra das importações anteriores, já que a maioria dos remetentes não tem conta aqui); os anexos de Mirian Vilivas ficam com autoria real.
5. Também será gerado o registro de atividade de "anexo adicionado", para aparecer na aba Atividade da tarefa.
6. No final entrego a lista de eventuais falhas (tarefa + nome do arquivo).

## Detalhes técnicos

- Tabela `public.task_attachments` (`id`, `task_id`, `file_name`, `file_url`, `file_type`, `file_size`, `uploaded_by`, `created_at`); `file_url` guarda o **path** no storage, como o app já espera (signed URL gerada na leitura).
- Upload via API de storage com service role, `x-upsert: true`, arquivo por arquivo.
- Nome sanitizado no path igual ao `sanitizeFileName` do app; `file_name` mantém o nome original com acentos.
- Perfil de sistema `Suporte` (`b7e892cf-...`) para `uploaded_by` quando não houver conta correspondente. Nenhum perfil novo é criado.
- Sem migration, sem alteração de schema, RLS, SSO ou funções do Hub. Nenhum arquivo de código alterado.
