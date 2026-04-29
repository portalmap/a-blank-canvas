## Diagnóstico

Existiam 18 documentos reais com conteúdo (criados em fev/2026) dentro das pastas antigas (`Entrei na MAP e agora?`, `Playbook Processos`, `Playbook Funções`, `Processos Operacionais`) no workspace principal `f37fdcb3...`.

A seed da última etapa criou pastas duplicadas e 21 documentos vazios em ambos os workspaces (`f37fdcb3...` e `b233069a...`), além da nova raiz `Base de Conhecimento`. Sim — dá pra consertar 100% reusando os documentos reais.

## O que será feito

### 1. Apagar todos os 21 documentos vazios criados pela seed
Todos os docs com `content = '{}'` criados em `2026-04-28 16:49:25` serão removidos (são exatamente os da seed).

### 2. Apagar as pastas duplicadas/extras criadas pela seed
- Apagar a estrutura inteira (raiz + 5 subpastas) do workspace `b233069a...` (workspace secundário, todas as subpastas estão vazias agora).
- No workspace principal `f37fdcb3...`, apagar as 4 subpastas vazias da seed: `Entrei para MAP e agora?`, `Boas Práticas MAP`, `Playbooks Processos`, `Playbooks Funções`, `Processos Operacionais` (`be54ebfb`, `5bbae926`, `1dd8dbb7`, `dd6fac2a`, `75cea5b3`).
- **Manter** a raiz `Base de Conhecimento` (`55f28035...`) — ela vai ser o "guarda-chuva" das pastas antigas que já têm conteúdo.

### 3. Adotar as 4 pastas antigas (que já têm conteúdo) como filhas de "Base de Conhecimento"
Setar `parent_folder_id = 55f28035...` (Base de Conhecimento) nestas pastas existentes:
- `ec863e41...` — **Entrei na MAP e agora?** (1 doc real: Playbook de Foto para o Perfil)
- `7ae9d9b7...` — **Playbook Processos** (4 docs reais: Onboarding, Check-in, Offboarding 30d, Offboarding imediato)
- `cf180001...` — **Playbook Funções** (6 docs reais: Account Manager, Gestor Tráfego, Social Media, Designer, Editor de Vídeos, Customer Success)
- `2a7aab4b...` — **Processos Operacionais** (7 docs reais: Linha Editorial, Mídias Pagas, Design/Edição de Vídeo, Criação de Criativos, Gerenciamento de Demandas, Jornada Completa do Cliente, Boas Práticas para Briefing)

### 4. Mover os 2 docs reais soltos para a raiz
- `Desafio G4 Skills` (`391785bc...`, sem folder) → `folder_id = 55f28035...`
- O doc `Cultura MAP` original não existe com conteúdo — só o vazio da seed (será excluído). Se quiser, posso criar um vazio depois ou você cria manualmente.

## Resultado final

```text
📚 Base de Conhecimento (raiz)
├── 🏆 Desafio G4 Skills                    (real, com conteúdo)
├── 📁 Entrei na MAP e agora?
│   └── 📋 Playbook de Foto para o Perfil
├── 📁 Playbook Processos
│   ├── 📒 Playbook de Onboarding Completo
│   ├── 📒 Playbook de Check-in
│   ├── 📒 Offboarding (30 dias)
│   └── 📒 Offbording (imediato)
├── 📁 Playbook Funções
│   ├── 📑 Playbook Account Manager
│   ├── 📑 Playbook Gestor de Tráfego Pago
│   ├── 📑 Playbook Social Media
│   ├── 📑 Playbook Designer
│   ├── 📑 Playbook Editor de Vídeos
│   └── 📑 Playbook Customer Sucess
└── 📁 Processos Operacionais
    ├── 📌 Linha Editorial
    ├── 🎯 Mídias Pagas
    ├── 💡 Design / Edição de Vídeo
    ├── 📎 Criação de Criativos
    ├── 🔖 Gerenciamento de Demandas
    ├── 🚀 Jornada Completa do Cliente
    └── ⭐ Boas Práticas para Criação de Briefing
```

Total: 1 raiz + 4 subpastas + 19 documentos reais com conteúdo preservado.

## Como será executado (técnico)

Tudo via operações de banco (DELETE + UPDATE), nenhum arquivo de código será alterado:

```sql
-- Apagar docs vazios da seed
DELETE FROM documents WHERE created_at = '2026-04-28 16:49:25.054271+00' AND content::text = '{}';

-- Apagar subpastas vazias no workspace principal e estrutura toda do secundário
DELETE FROM document_folders WHERE id IN (
  'be54ebfb...', '5bbae926...', '1dd8dbb7...', 'dd6fac2a...', '75cea5b3...',
  '8a365815...', 'd483e0ca...', '1af778cc...', '77dd0e91...', '78882ca6...', '8d90e798...'
);

-- Anexar pastas antigas à raiz Base de Conhecimento
UPDATE document_folders 
SET parent_folder_id = '55f28035-3425-442c-bf12-156952451f0d'
WHERE id IN ('ec863e41...', '7ae9d9b7...', 'cf180001...', '2a7aab4b...');

-- Mover Desafio G4 Skills para a raiz
UPDATE documents SET folder_id = '55f28035-3425-442c-bf12-156952451f0d' 
WHERE id = '391785bc-4aca-44bc-a418-3cc04397b767';
```

## Fora do escopo
- Renomear pastas existentes (mantenho os nomes originais que você já tinha: `Playbook Processos`, `Playbook Funções`, etc.)
- Recriar `Cultura MAP` vazio — me avisa se quiser
- Mexer no workspace secundário `b233069a...` além de limpar a seed dele
