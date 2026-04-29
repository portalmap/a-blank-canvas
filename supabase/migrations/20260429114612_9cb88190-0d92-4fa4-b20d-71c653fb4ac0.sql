
-- 1. Apagar todos os documentos vazios criados pela seed
DELETE FROM documents 
WHERE created_at = '2026-04-28 16:49:25.054271+00' 
  AND content::text = '{}';

-- 2. Apagar as pastas vazias criadas pela seed (mantém apenas a raiz Base de Conhecimento do workspace principal)
DELETE FROM document_folders WHERE id IN (
  -- Subpastas vazias da seed no workspace principal (f37fdcb3...)
  'be54ebfb-92a6-4704-bda8-7a0f2b58d4a8', -- Entrei para MAP e agora?
  '5bbae926-7657-4e37-b606-544b45eb1618', -- Boas Práticas MAP
  '1dd8dbb7-8ca9-49f3-b0e8-78f3d47ccb73', -- Playbooks Processos
  'dd6fac2a-1ead-4ad8-a387-9b340f044096', -- Playbooks Funções
  '75cea5b3-fa23-4e08-a422-aa1527100515', -- Processos Operacionais
  -- Estrutura inteira do workspace secundário (b233069a...)
  '8a365815-b4d7-429a-a647-6d93d47fdae3',
  'd483e0ca-247c-4d4e-ac0d-4f1b42a5d9c7',
  '1af778cc-6f69-4d12-ac11-ad1ef65034ac',
  '77dd0e91-5ab6-422d-a4cf-0ad1a03f7d03',
  '78882ca6-bcad-4953-93fb-567819070766',
  '8d90e798-6c59-434a-828d-5e40906c3730'
);

-- 3. Anexar as 4 pastas antigas (com conteúdo real) à raiz Base de Conhecimento
UPDATE document_folders 
SET parent_folder_id = '55f28035-3425-442c-bf12-156952451f0d'
WHERE id IN (
  'ec863e41-8979-47f5-8fbd-7503888c658b', -- Entrei na MAP e agora?
  '7ae9d9b7-21ab-438a-ba8b-dcabb69fdebe', -- Playbook Processos
  'cf180001-1fe5-43ba-948c-015819a9ac89', -- Playbook Funções
  '2a7aab4b-9038-4c4e-a5c0-66174b02f7da'  -- Processos Operacionais
);

-- 4. Mover o documento "Desafio G4 Skills" para a raiz da Base de Conhecimento
UPDATE documents 
SET folder_id = '55f28035-3425-442c-bf12-156952451f0d' 
WHERE id = '391785bc-4aca-44bc-a418-3cc04397b767';
