INSERT INTO public.lists (workspace_id, space_id, folder_id, name, default_view, status_source)
SELECT sp.workspace_id, sp.id, f.id, v.lista, 'list'::list_view, 'custom'
FROM (VALUES
  ('Tech | Pintepisos','Tarefas & Demandas | Pintepisos'),
  ('Informações | PsicoMed','Tarefas & Demandas | PsicoMed'),
  ('Informações | Vanessa Marques Beauty','Tarefas & Demandas | Vanessa Marques Beauty')
) AS v(lista, pasta)
JOIN public.folders f ON f.name = v.pasta
JOIN public.spaces sp ON sp.id = f.space_id
WHERE NOT EXISTS (SELECT 1 FROM public.lists l WHERE l.name = v.lista);

WITH d(lista, status, categoria) AS (VALUES
  ('Designer/Edição de Vídeo | BrasaLux','Env. Aprovação','in_progress'),
  ('Designer/Edição de Vídeo | BrasaLux','Instagram','in_progress'),
  ('Designer/Edição de Vídeo | Monvizo BR','Aguardando','not_started'),
  ('Designer/Edição de Vídeo | SF','Env. Aprovação','in_progress'),
  ('Designer/Edição de Vídeo | Tintas Palmares','A Fazer','active'),
  ('Designer/Edição de Vídeo | Tintas Palmares','Aguardando','not_started'),
  ('Designer/Edição de Vídeo | Tintas Palmares','Concluído','done'),
  ('Designer/Edição de Vídeo | Tintas Palmares','Em Progresso','in_progress'),
  ('Informações | Monvizo PRO','Contrato Criado','not_started'),
  ('Informações | PsicoMed','Concluído','done'),
  ('Informações | Vanessa Marques Beauty','Concluído','done'),
  ('Interno','A Fazer','active'),
  ('Interno','Aguardando','not_started'),
  ('Interno','Concluído','done'),
  ('Interno','Em Progresso','in_progress'),
  ('Operacional | Zomata Seguros','Concluído','done'),
  ('Plan. Social Media | Accerth','Aguardando','not_started'),
  ('Plan. Social Media | Atacadão da Suburbana','Aguardando','not_started'),
  ('Plan. Social Media | Monvizo BR','Aguardando','not_started'),
  ('Plan. Social Media | Pintepisos','Aguardando','not_started'),
  ('Plan. Social Media | SF','Aguardando','not_started'),
  ('Plan. Social Media | Tintas Palmares','Aguardando','not_started'),
  ('Plan. de Criativos | Atacadão da Suburbana','Aguardando','not_started'),
  ('Plan. de Criativos | BrasaLux','Aguardando','not_started'),
  ('Plan. de Criativos | BrasaLux','Temas Enviados','in_progress'),
  ('Plan. de Criativos | Mania de Vidros','Instagram','in_progress'),
  ('Plan. de Criativos | Monvizo BR','Aguardando','not_started'),
  ('Plan. de Criativos | Monvizo BR','Em Progresso','in_progress'),
  ('Plan. de Criativos | Monvizo PRO','Aguardando','not_started'),
  ('Plan. de Criativos | Tintas Palmares','A Fazer','active'),
  ('Tech | Atacadão da Suburbana','Aguardando','not_started'),
  ('Tech | Atacadão da Suburbana','Concluído','done'),
  ('Tech | Pintepisos','Concluído','done'),
  ('Tech | Strike Jiu-Jitsu','Aguardando','not_started'),
  ('Tech | Strike Jiu-Jitsu','Concluído','done'),
  ('Tecnologia | Monvizo BR','Aguardando','not_started'),
  ('Tecnologia | Tintas Palmares','Aguardando','not_started'),
  ('Tecnologia | Tintas Palmares','Concluído','done'),
  ('Tráfego Pago | Acopremo','Aguardando','not_started'),
  ('Tráfego Pago | Acopremo','Concluído','done'),
  ('Tráfego Pago | André Ortiz','Concluído','done'),
  ('Tráfego Pago | Atacadão da Suburbana','Aguardando','not_started'),
  ('Tráfego Pago | Aviões e Músicas','Aguardando','not_started'),
  ('Tráfego Pago | Aviões e Músicas','Concluído','done'),
  ('Tráfego Pago | Dra Aline Bordim','Aguardando','not_started'),
  ('Tráfego Pago | King Talhas','Aguardando','not_started'),
  ('Tráfego Pago | King Talhas','Concluído','done'),
  ('Tráfego Pago | King Talhas','Em Progresso','in_progress'),
  ('Tráfego Pago | Mania de Vidros','Aguardando','not_started'),
  ('Tráfego Pago | Monvizo BR','Aguardando','not_started'),
  ('Tráfego Pago | Monvizo BR','Concluído','done'),
  ('Tráfego Pago | Monvizo BR','Em Progresso','in_progress'),
  ('Tráfego Pago | Vanessa Marques Beauty','Concluído','done'),
  ('Tráfego Pago | Viviane Trajano','Aguardando','not_started'),
  ('Tráfego Pago | Viviane Trajano','Concluído','done')
),
novos AS (
  SELECT l.id AS lid, l.workspace_id AS wid, d.status, d.categoria,
         ROW_NUMBER() OVER (PARTITION BY l.id ORDER BY d.status) AS rn,
         COALESCE((SELECT MAX(s3.order_index) FROM public.statuses s3 WHERE s3.scope_type='list' AND s3.scope_id=l.id), -1) AS maxidx,
         NOT EXISTS (SELECT 1 FROM public.statuses s4 WHERE s4.scope_type='list' AND s4.scope_id=l.id) AS vazia
  FROM d JOIN public.lists l ON l.name = d.lista
  WHERE NOT EXISTS (
    SELECT 1 FROM public.statuses s WHERE s.scope_type='list' AND s.scope_id=l.id AND s.name=d.status
  )
)
INSERT INTO public.statuses (workspace_id, name, color, category, scope_type, scope_id, is_default, order_index)
SELECT wid, status, '#94a3b8', categoria, 'list'::status_scope, lid, (vazia AND rn=1), maxidx + rn
FROM novos;