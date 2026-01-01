import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportTask {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignees: string[];
  listName: string;
  dueDate?: string;
  startDate?: string;
}

// Mapeamento de listas do Space Accerth
const LIST_MAP: Record<string, string> = {
  "Plan. Social Media | Accerth": "c4d05137-1784-4770-9a6f-cbf776113914",
  "Plan. de Criativos | Accerth": "6981567c-b0f3-4e08-880e-9529f31d6d2e",
  "Designer | Accerth": "96c988df-e7bd-4d8d-ac56-b8e629808dfc",
  "Designer/Edição de Vídeo | Accerth": "96c988df-e7bd-4d8d-ac56-b8e629808dfc",
};

// Mapeamento de usuários
const USER_MAP: Record<string, string> = {
  "Beatriz Santos": "a586595c-d580-49be-a7d7-ed6574303897",
  "Mirian Vilivas": "5e7a3657-7b0c-4312-ac0d-a129932ba69a",
  "Wendy Uda": "66941d98-068e-48fb-ad78-62bbc0db0753",
  "Dionatas Florêncio": "956df024-1054-440b-afb3-272dc4c77501", // Substituído por João Luiz
  "João Luiz": "956df024-1054-440b-afb3-272dc4c77501",
};

// Mapeamento de status ClickUp -> Nome do status no sistema
const STATUS_MAP: Record<string, string> = {
  "to do": "A Fazer",
  "em andamento": "Em Progresso",
  "aguardando aprovação": "Env. Aprovação",
  "aguardando aprovacao": "Env. Aprovação",
  "planejar postagem": "Planejar Postagem",
  "em produção": "Em Progresso",
  "em producao": "Em Progresso",
  "revisão": "Em Progresso",
  "revisao": "Em Progresso",
  "aguardando feedback": "Env. Aprovação",
  "demanda sem prazo": "A Fazer",
  "devolução de aprovação": "Em Progresso",
  "devolucao de aprovacao": "Em Progresso",
};

// Mapeamento de prioridade ClickUp -> sistema
const PRIORITY_MAP: Record<string, string> = {
  "1": "urgent",
  "2": "high",
  "3": "medium",
  "4": "low",
  "urgent": "urgent",
  "high": "high",
  "medium": "medium",
  "low": "low",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tasks, workspaceId } = await req.json() as { 
      tasks: ImportTask[]; 
      workspaceId: string;
    };

    console.log(`[import-tasks] Iniciando importação de ${tasks.length} tarefas para workspace ${workspaceId}`);

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma tarefa fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar templates de status das listas
    const listIds = Object.values(LIST_MAP);
    const { data: lists, error: listsError } = await supabase
      .from("lists")
      .select("id, name, status_template_id")
      .in("id", listIds);

    if (listsError) {
      console.error("[import-tasks] Erro ao buscar listas:", listsError);
      throw listsError;
    }

    console.log(`[import-tasks] Listas encontradas: ${lists?.length}`);

    // Buscar todos os status templates items
    const templateIds = lists?.map(l => l.status_template_id).filter(Boolean) || [];
    const { data: statusItems, error: statusError } = await supabase
      .from("status_template_items")
      .select("id, template_id, name, is_default")
      .in("template_id", templateIds);

    if (statusError) {
      console.error("[import-tasks] Erro ao buscar status:", statusError);
      throw statusError;
    }

    console.log(`[import-tasks] Status items encontrados: ${statusItems?.length}`);

    // Criar mapa de list_id -> status_items
    const listStatusMap: Record<string, typeof statusItems> = {};
    for (const list of lists || []) {
      if (list.status_template_id) {
        listStatusMap[list.id] = statusItems?.filter(s => s.template_id === list.status_template_id) || [];
      }
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Buscar o usuário criador (primeiro admin do workspace)
    const { data: adminMember } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("role", "admin")
      .limit(1)
      .single();

    const creatorId = adminMember?.user_id;
    if (!creatorId) {
      return new Response(
        JSON.stringify({ error: "Não foi possível encontrar um admin no workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[import-tasks] Usando creator_id: ${creatorId}`);

    for (const task of tasks) {
      try {
        // Encontrar a lista de destino
        const listId = LIST_MAP[task.listName];
        if (!listId) {
          results.skipped++;
          results.errors.push(`Lista não encontrada: ${task.listName} - Tarefa: ${task.title}`);
          continue;
        }

        // Encontrar o status correto
        const listStatuses = listStatusMap[listId] || [];
        const mappedStatusName = STATUS_MAP[task.status.toLowerCase()] || "A Fazer";
        
        let statusId = listStatuses.find(s => s.name === mappedStatusName)?.id;
        if (!statusId) {
          // Fallback para o status padrão da lista
          statusId = listStatuses.find(s => s.is_default)?.id;
        }
        if (!statusId && listStatuses.length > 0) {
          // Fallback para o primeiro status
          statusId = listStatuses[0].id;
        }

        if (!statusId) {
          results.skipped++;
          results.errors.push(`Status não encontrado para lista ${task.listName} - Tarefa: ${task.title}`);
          continue;
        }

        // Mapear prioridade
        const priority = PRIORITY_MAP[task.priority?.toLowerCase() || "medium"] || "medium";

        // Inserir a tarefa
        const { data: newTask, error: taskError } = await supabase
          .from("tasks")
          .insert({
            title: task.title,
            description: task.description || null,
            workspace_id: workspaceId,
            list_id: listId,
            status_id: statusId,
            priority: priority,
            due_date: task.dueDate || null,
            start_date: task.startDate || null,
            created_by_user_id: creatorId,
          })
          .select("id")
          .single();

        if (taskError) {
          console.error(`[import-tasks] Erro ao inserir tarefa ${task.title}:`, taskError);
          results.errors.push(`Erro ao inserir: ${task.title} - ${taskError.message}`);
          continue;
        }

        // Inserir assignees
        if (task.assignees && task.assignees.length > 0) {
          const assigneeInserts = task.assignees
            .map(name => {
              const userId = USER_MAP[name.trim()];
              if (!userId) {
                console.log(`[import-tasks] Usuário não mapeado: ${name}`);
                return null;
              }
              return {
                task_id: newTask.id,
                user_id: userId,
              };
            })
            .filter(Boolean);

          if (assigneeInserts.length > 0) {
            const { error: assigneeError } = await supabase
              .from("task_assignees")
              .insert(assigneeInserts);

            if (assigneeError) {
              console.error(`[import-tasks] Erro ao inserir assignees para ${task.title}:`, assigneeError);
            }
          }
        }

        results.imported++;
        console.log(`[import-tasks] Tarefa importada: ${task.title}`);

      } catch (err) {
        console.error(`[import-tasks] Erro ao processar tarefa ${task.title}:`, err);
        results.errors.push(`Erro ao processar: ${task.title}`);
      }
    }

    console.log(`[import-tasks] Importação concluída: ${results.imported} importadas, ${results.skipped} ignoradas`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[import-tasks] Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
