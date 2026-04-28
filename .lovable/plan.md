## Objetivo

Criar, dentro de **Documentos → Wikis**, a estrutura completa "Base de Conhecimento" igual à do ClickUp da segunda imagem, com pastas, subpáginas e emojis/ícones — todos os documentos vazios para você preencher depois.

## O que será criado

Estrutura na seção **Wikis** do workspace ativo:

```text
📚 Base de Conhecimento (pasta wiki raiz)
├── 🎨 Cultura MAP                    (doc)
├── 🏆 Desafios G4 SKILLS             (doc)
├── 👋 Entrei para MAP e agora?       (pasta)
│   └── 📷 PLAYBOOK DE FOTO PARA PERFIL
├── 🔥 Boas Práticas MAP              (pasta)
│   ├── 📄 Knowledge Article 1
│   └── 📄 Knowledge Article 2
├── 📂 Playbooks Processos            (pasta)
│   ├── 📕 Playbook de Onboarding Completo
│   └── 📗 Playbook de Check-in
├── 📂 Playbooks Funções              (pasta)
│   ├── 📘 Playbook Account Manager
│   ├── 📘 Playbook do Gestor de Tráfego
│   ├── 📘 Playbook do Social Media
│   ├── 📘 Playbook do Designer
│   ├── 📘 Playbook do Editor de Vídeos
│   └── 📘 Playbook do Customer Success
└── 📁 Processos Operacionais         (pasta)
    ├── 📝 Linha Editorial
    ├── 💵 Mídias Pagas
    ├── 🎬 Designer / Edição de Vídeo
    ├── 🎨 Criação de Criativos - Social Media
    ├── 🎯 Gerenciamento de Demandas
    └── 🗺️ Jornada Completa do Cliente
```

Total: **1 pasta raiz + 6 subpastas + 21 documentos**, todos vazios e marcados como wiki.

## Como será feito (técnico)

A estrutura de dados (`document_folders` + `documents`) já suporta:
- Hierarquia infinita via `parent_folder_id`
- Documentos dentro de pastas via `folder_id`
- Emojis customizados por documento (`emoji`)
- Marcação como wiki (`is_wiki = true`) — herda permissões já existentes (visível para todos os membros do workspace)

**Passos:**

1. **Descobrir o workspace alvo** — query rápida pra pegar o `workspace_id` ativo (existe só um na conta) e o `user_id` do owner como `created_by_user_id`.
2. **Inserir tudo via SQL seed** numa única migração:
   - Cria a pasta raiz `Base de Conhecimento` com `is_wiki=true`, `parent_folder_id=null`.
   - Cria as 6 subpastas referenciando a raiz.
   - Cria os 21 documentos com `is_wiki=true`, `content='{}'`, `emoji` apropriado e `folder_id` correto.
3. Documentos soltos (Cultura MAP, Desafios G4 SKILLS) vão direto na pasta raiz `Base de Conhecimento` (sem subpasta).

**Observação sobre emojis das pastas:** o componente `DocFolderTreeItem` hoje usa um ícone fixo de pasta colorida — os emojis específicos de pasta (🔥, 👋, 📂) ficam visíveis apenas nos documentos. Se quiser emojis também nas pastas, posso adicionar um campo `emoji` em `document_folders` num próximo passo (não incluído aqui pra manter o escopo do "popular conteúdo").

## Fora do escopo

- Conteúdo dos documentos (ficam vazios)
- Mudanças de UI na sidebar
- Permissões customizadas (usa o padrão de wiki = todos do workspace veem)
