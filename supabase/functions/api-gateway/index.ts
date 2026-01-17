import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface TokenInfo {
  workspace_id: string;
  is_active: boolean;
  expires_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("api_tokens")
      .select("workspace_id, is_active, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token validation error:", tokenError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenInfo = tokenData as TokenInfo;

    if (!tokenInfo.is_active) {
      return new Response(
        JSON.stringify({ error: "Token desativado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokenInfo.expires_at && new Date(tokenInfo.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceId = tokenInfo.workspace_id;

    // Parse URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Remove 'api-gateway' from path if present
    const apiIndex = pathParts.indexOf("api-gateway");
    const resourcePath = apiIndex >= 0 ? pathParts.slice(apiIndex + 1) : pathParts;
    
    const resource = resourcePath[0] || "";
    const resourceId = resourcePath[1] || null;

    // Get query params
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Route to appropriate handler
    let result;
    
    switch (resource) {
      case "spaces":
        result = await handleSpaces(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "folders":
        result = await handleFolders(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "lists":
        result = await handleLists(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "tasks":
        result = await handleTasks(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "subtasks":
        result = await handleSubtasks(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "statuses":
        result = await handleStatuses(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "tags":
        result = await handleTags(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "comments":
        result = await handleComments(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "checklists":
        result = await handleChecklists(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "checklist-items":
        result = await handleChecklistItems(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "assignees":
        result = await handleAssignees(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "attachments":
        result = await handleAttachments(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "members":
        result = await handleMembers(supabase, req.method, resourceId, workspaceId, queryParams);
        break;
      case "task-tags":
        result = await handleTaskTags(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "workspaces":
        result = await handleWorkspaces(supabase, req.method, workspaceId, await parseBody(req));
        break;
      case "activities":
        result = await handleActivities(supabase, req.method, resourceId, workspaceId, await parseBody(req), queryParams);
        break;
      case "":
        result = { 
          data: { 
            message: "API Gateway v1.0",
            workspace_id: workspaceId,
            endpoints: [
              "GET/PUT /workspaces",
              "GET/POST /spaces?name={filter}",
              "GET/POST /folders",
              "GET/POST /lists",
              "GET/POST/PUT/DELETE /tasks?tag_name={filter}&space_id={filter}",
              "GET/POST /subtasks",
              "GET/POST /statuses",
              "GET/POST/PUT/DELETE /tags",
              "GET/POST/DELETE /task-tags",
              "GET/POST/PUT/DELETE /comments",
              "GET/POST/PUT/DELETE /checklists",
              "GET/POST/PUT/DELETE /checklist-items",
              "GET/POST/DELETE /assignees",
              "GET/POST/DELETE /attachments",
              "GET /members",
              "GET/POST /activities"
            ]
          }, 
          status: 200 
        };
        break;
      default:
        result = { error: `Recurso não encontrado: ${resource}`, status: 404 };
    }

    // Update last_used_at
    await supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data: result.data }),
      { status: result.status || 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("API Gateway error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function parseBody(req: Request) {
  if (req.method === "GET" || req.method === "DELETE") {
    return null;
  }
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// ============ SPACES ============
async function handleSpaces(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("spaces")
          .select("*")
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        let queryBuilder = supabase
          .from("spaces")
          .select("*")
          .eq("workspace_id", workspaceId);
        
        // Filter by name (case-insensitive, partial match)
        if (query.name) {
          queryBuilder = queryBuilder.ilike("name", `%${query.name}%`);
        }
        
        const { data, error } = await queryBuilder.order("created_at", { ascending: false });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.name) return { error: "Campo 'name' é obrigatório", status: 400 };
      const { data: newSpace, error: createError } = await supabase
        .from("spaces")
        .insert({
          workspace_id: workspaceId,
          name: body.name,
          description: body.description || null,
          color: body.color || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newSpace, status: 201 };
    case "PUT":
      if (!id) return { error: "ID do space é obrigatório", status: 400 };
      const { data: updatedSpace, error: updateError } = await supabase
        .from("spaces")
        .update({
          name: body.name,
          description: body.description,
          color: body.color,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedSpace };
    case "DELETE":
      if (!id) return { error: "ID do space é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("spaces")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ FOLDERS ============
async function handleFolders(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("folders")
          .select("*, spaces!inner(workspace_id)")
          .eq("id", id)
          .eq("spaces.workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        let queryBuilder = supabase
          .from("folders")
          .select("*, spaces!inner(workspace_id)")
          .eq("spaces.workspace_id", workspaceId);
        if (query.space_id) {
          queryBuilder = queryBuilder.eq("space_id", query.space_id);
        }
        const { data, error } = await queryBuilder.order("created_at", { ascending: false });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.name) return { error: "Campo 'name' é obrigatório", status: 400 };
      if (!body?.space_id) return { error: "Campo 'space_id' é obrigatório", status: 400 };
      const { data: newFolder, error: createError } = await supabase
        .from("folders")
        .insert({
          space_id: body.space_id,
          name: body.name,
          description: body.description || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newFolder, status: 201 };
    case "PUT":
      if (!id) return { error: "ID da folder é obrigatório", status: 400 };
      const { data: updatedFolder, error: updateError } = await supabase
        .from("folders")
        .update({
          name: body.name,
          description: body.description,
        })
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedFolder };
    case "DELETE":
      if (!id) return { error: "ID da folder é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("folders")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ LISTS ============
async function handleLists(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("lists")
          .select(`
            *,
            space:spaces(id, name, color, description),
            folder:folders(id, name)
          `)
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        let queryBuilder = supabase
          .from("lists")
          .select(`
            *,
            space:spaces(id, name, color, description),
            folder:folders(id, name)
          `)
          .eq("workspace_id", workspaceId);
        if (query.space_id) {
          queryBuilder = queryBuilder.eq("space_id", query.space_id);
        }
        if (query.folder_id) {
          queryBuilder = queryBuilder.eq("folder_id", query.folder_id);
        }
        const { data, error } = await queryBuilder.order("created_at", { ascending: false });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.name) return { error: "Campo 'name' é obrigatório", status: 400 };
      if (!body?.space_id) return { error: "Campo 'space_id' é obrigatório", status: 400 };
      const { data: newList, error: createError } = await supabase
        .from("lists")
        .insert({
          workspace_id: workspaceId,
          space_id: body.space_id,
          folder_id: body.folder_id || null,
          name: body.name,
          description: body.description || null,
          default_view: body.default_view || "list",
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newList, status: 201 };
    case "PUT":
      if (!id) return { error: "ID da lista é obrigatório", status: 400 };
      const { data: updatedList, error: updateError } = await supabase
        .from("lists")
        .update({
          name: body.name,
          description: body.description,
          default_view: body.default_view,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedList };
    case "DELETE":
      if (!id) return { error: "ID da lista é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("lists")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ TASKS ============
async function handleTasks(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            *,
            lists!inner(workspace_id, name, space_id, space:spaces(id, name)),
            statuses(id, name, color),
            task_assignees(user_id, profiles:user_id(id, full_name, avatar_url)),
            task_attachments(id, file_url, file_name, file_type, file_size),
            task_tag_relations(id, tag:task_tags(id, name, color))
          `)
          .eq("id", id)
          .eq("lists.workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        // Check if filtering by tag_name - special handling for Portal integration
        if (query.tag_name) {
          // First, find the tag by name (case-insensitive)
          const { data: tag, error: tagError } = await supabase
            .from("task_tags")
            .select("id")
            .eq("workspace_id", workspaceId)
            .ilike("name", query.tag_name)
            .single();
          
          if (tagError || !tag) {
            return { data: [] }; // No tasks with this tag
          }
          
          // Get task IDs that have this tag
          const { data: relations, error: relError } = await supabase
            .from("task_tag_relations")
            .select("task_id")
            .eq("tag_id", tag.id);
          
          if (relError || !relations || relations.length === 0) {
            return { data: [] };
          }
          
          const taskIds = relations.map((r: any) => r.task_id);
          
          // Fetch full task details
          let taskQuery = supabase
            .from("tasks")
            .select(`
              *,
              lists!inner(workspace_id, name, space_id, space:spaces(id, name)),
              statuses(id, name, color),
              task_assignees(user_id, profiles:user_id(id, full_name, avatar_url)),
              task_attachments(id, file_url, file_name, file_type, file_size),
              task_tag_relations(id, tag:task_tags(id, name, color))
            `)
            .in("id", taskIds)
            .eq("lists.workspace_id", workspaceId)
            .is("parent_id", null)
            .is("archived_at", null);
          
          // Optional: filter by space_id
          if (query.space_id) {
            taskQuery = taskQuery.eq("lists.space_id", query.space_id);
          }
          
          const { data: tasks, error: tasksError } = await taskQuery.order("created_at", { ascending: false });
          if (tasksError) return { error: tasksError.message, status: 400 };
          return { data: tasks || [] };
        }
        
        // Standard task listing
        let queryBuilder = supabase
          .from("tasks")
          .select(`
            *,
            lists!inner(workspace_id, name, space_id, space:spaces(id, name)),
            statuses(id, name, color),
            task_assignees(user_id, profiles:user_id(id, full_name, avatar_url)),
            task_tag_relations(id, tag:task_tags(id, name, color))
          `)
          .eq("lists.workspace_id", workspaceId)
          .is("parent_id", null);
        
        if (query.list_id) {
          queryBuilder = queryBuilder.eq("list_id", query.list_id);
        }
        if (query.space_id) {
          queryBuilder = queryBuilder.eq("lists.space_id", query.space_id);
        }
        if (query.status_id) {
          queryBuilder = queryBuilder.eq("status_id", query.status_id);
        }
        if (query.priority) {
          queryBuilder = queryBuilder.eq("priority", query.priority);
        }
        const { data, error } = await queryBuilder.order("created_at", { ascending: false });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.title) return { error: "Campo 'title' é obrigatório", status: 400 };
      if (!body?.list_id) return { error: "Campo 'list_id' é obrigatório", status: 400 };
      
      // Resolver status_id com base no payload
      let statusId = body.status_id;
      console.log(`[api-gateway] Creating task in list ${body.list_id}, status_id: ${body.status_id}, status_name: ${body.status_name}`);
      
      // PRIORIDADE 1: Se status_name foi enviado, buscar pelo nome (case-insensitive)
      if (!statusId && body.status_name) {
        console.log(`[api-gateway] Looking for status by name: "${body.status_name}"`);
        
        const { data: namedStatus } = await supabase
          .from("statuses")
          .select("id, name")
          .eq("scope_type", "list")
          .eq("scope_id", body.list_id)
          .ilike("name", body.status_name)
          .maybeSingle();

        if (namedStatus) {
          statusId = namedStatus.id;
          console.log(`[api-gateway] Found status by name "${body.status_name}": ${statusId}`);
        } else {
          console.warn(`[api-gateway] Status "${body.status_name}" not found in list ${body.list_id}, falling back to default`);
        }
      }
      
      // PRIORIDADE 2: Fallback para status default
      if (!statusId) {
        // Verificar se a lista usa status por template
        const { data: listConfig } = await supabase
          .from("lists")
          .select("status_source")
          .eq("id", body.list_id)
          .single();
        
        if (listConfig?.status_source === 'template') {
          // Buscar status da própria lista
          const { data: listStatuses } = await supabase
            .from("statuses")
            .select("id")
            .eq("scope_type", "list")
            .eq("scope_id", body.list_id)
            .eq("is_default", true)
            .limit(1);
          
          if (listStatuses && listStatuses.length > 0) {
            statusId = listStatuses[0].id;
            console.log(`[api-gateway] Using default list status: ${statusId}`);
          } else {
            // Fallback: primeiro status da lista
            const { data: anyListStatus } = await supabase
              .from("statuses")
              .select("id")
              .eq("scope_type", "list")
              .eq("scope_id", body.list_id)
              .order("order_index", { ascending: true })
              .limit(1);
            
            if (anyListStatus && anyListStatus.length > 0) {
              statusId = anyListStatus[0].id;
              console.log(`[api-gateway] Using first list status: ${statusId}`);
            }
          }
        } else {
          // Status do workspace
          const { data: defaultStatuses } = await supabase
            .from("statuses")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("scope_type", "workspace")
            .eq("is_default", true)
            .limit(1);
          
          if (defaultStatuses && defaultStatuses.length > 0) {
            statusId = defaultStatuses[0].id;
            console.log(`[api-gateway] Using default workspace status: ${statusId}`);
          } else {
            // Fallback: primeiro status do workspace
            const { data: anyStatus } = await supabase
              .from("statuses")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("scope_type", "workspace")
              .order("order_index", { ascending: true })
              .limit(1);
            
            if (anyStatus && anyStatus.length > 0) {
              statusId = anyStatus[0].id;
              console.log(`[api-gateway] Using first workspace status: ${statusId}`);
            }
          }
        }
        
        if (!statusId) {
          return { error: "Nenhum status configurado para esta lista ou workspace", status: 400 };
        }
      }
      
      console.log(`[api-gateway] Final status resolved: ${statusId}`);

      // Buscar um usuário admin do workspace para ser o criador da tarefa
      const { data: workspaceAdmin } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("role", "admin")
        .limit(1)
        .single();
      
      const creatorUserId = body.created_by_user_id || workspaceAdmin?.user_id || null;
      
      if (!creatorUserId) {
        return { error: "Nenhum usuário admin encontrado no workspace para criar a tarefa", status: 400 };
      }

      const { data: newTask, error: createError } = await supabase
        .from("tasks")
        .insert({
          list_id: body.list_id,
          workspace_id: workspaceId,
          created_by_user_id: creatorUserId,
          title: body.title,
          description: body.description || null,
          status_id: statusId,
          priority: body.priority || "medium",
          due_date: body.due_date || null,
          start_date: body.start_date || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };

      // Handle attachment if provided
      if (body.attachment_url) {
        await supabase.from("task_attachments").insert({
          task_id: newTask.id,
          file_url: body.attachment_url,
          file_name: body.attachment_name || "attachment",
          file_type: body.attachment_type || "application/octet-stream",
          uploaded_by: creatorUserId,
        });
      }

      return { data: newTask, status: 201 };
    case "PUT":
      if (!id) return { error: "ID da tarefa é obrigatório", status: 400 };
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.status_id !== undefined) updateData.status_id = body.status_id;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.due_date !== undefined) updateData.due_date = body.due_date;
      if (body.start_date !== undefined) updateData.start_date = body.start_date;
      if (body.completed_at !== undefined) updateData.completed_at = body.completed_at;

      const { data: updatedTask, error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedTask };
    case "DELETE":
      if (!id) return { error: "ID da tarefa é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ SUBTASKS ============
async function handleSubtasks(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.parent_id && !id) return { error: "Parâmetro 'parent_id' é obrigatório", status: 400 };
      if (id) {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .not("parent_id", "is", null)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("parent_id", query.parent_id)
          .order("created_at", { ascending: true });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.title) return { error: "Campo 'title' é obrigatório", status: 400 };
      if (!body?.parent_id) return { error: "Campo 'parent_id' é obrigatório", status: 400 };
      
      // Get parent task's list_id AND workspace_id
      const { data: parentTask, error: parentError } = await supabase
        .from("tasks")
        .select("list_id, workspace_id")
        .eq("id", body.parent_id)
        .single();
      if (parentError) return { error: "Tarefa pai não encontrada", status: 404 };

      // Determine status_id for subtask
      let subtaskStatusId = body.status_id;
      if (!subtaskStatusId) {
        // Check if list uses template statuses
        const { data: listConfig } = await supabase
          .from("lists")
          .select("status_source")
          .eq("id", parentTask.list_id)
          .single();
        
        if (listConfig?.status_source === 'template') {
          // Get list-specific status
          const { data: listStatuses } = await supabase
            .from("statuses")
            .select("id")
            .eq("scope_type", "list")
            .eq("scope_id", parentTask.list_id)
            .eq("is_default", true)
            .limit(1);
          
          if (listStatuses && listStatuses.length > 0) {
            subtaskStatusId = listStatuses[0].id;
          } else {
            // Fallback: first list status
            const { data: anyListStatus } = await supabase
              .from("statuses")
              .select("id")
              .eq("scope_type", "list")
              .eq("scope_id", parentTask.list_id)
              .order("order_index", { ascending: true })
              .limit(1);
            
            if (anyListStatus && anyListStatus.length > 0) {
              subtaskStatusId = anyListStatus[0].id;
            }
          }
        }
        
        // Fallback to workspace status if no list status found
        if (!subtaskStatusId) {
          const { data: defaultStatuses } = await supabase
            .from("statuses")
            .select("id")
            .eq("workspace_id", parentTask.workspace_id)
            .eq("scope_type", "workspace")
            .eq("is_default", true)
            .limit(1);
          
          if (defaultStatuses && defaultStatuses.length > 0) {
            subtaskStatusId = defaultStatuses[0].id;
          } else {
            const { data: anyStatus } = await supabase
              .from("statuses")
              .select("id")
              .eq("workspace_id", parentTask.workspace_id)
              .eq("scope_type", "workspace")
              .order("order_index", { ascending: true })
              .limit(1);
            
            if (anyStatus && anyStatus.length > 0) {
              subtaskStatusId = anyStatus[0].id;
            }
          }
        }
        
        if (!subtaskStatusId) {
          return { error: "Nenhum status configurado para esta lista ou workspace", status: 400 };
        }
      }

      // Get a workspace admin user to be the creator
      const { data: subtaskWorkspaceAdmin } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", parentTask.workspace_id)
        .eq("role", "admin")
        .limit(1)
        .single();
      
      const subtaskCreatorUserId = body.created_by_user_id || subtaskWorkspaceAdmin?.user_id || null;
      
      if (!subtaskCreatorUserId) {
        return { error: "Nenhum usuário admin encontrado no workspace para criar a subtarefa", status: 400 };
      }

      const { data: newSubtask, error: createError } = await supabase
        .from("tasks")
        .insert({
          list_id: parentTask.list_id,
          workspace_id: parentTask.workspace_id,
          created_by_user_id: subtaskCreatorUserId,
          parent_id: body.parent_id,
          title: body.title,
          description: body.description || null,
          status_id: subtaskStatusId,
          priority: body.priority || "medium",
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newSubtask, status: 201 };
    case "PUT":
      if (!id) return { error: "ID da subtarefa é obrigatório", status: 400 };
      const { data: updatedSubtask, error: updateError } = await supabase
        .from("tasks")
        .update({
          title: body.title,
          description: body.description,
          completed_at: body.completed_at,
        })
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedSubtask };
    case "DELETE":
      if (!id) return { error: "ID da subtarefa é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ STATUSES ============
async function handleStatuses(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("statuses")
          .select("*")
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        // Build query with optional filters
        let queryBuilder = supabase
          .from("statuses")
          .select("*")
          .eq("workspace_id", workspaceId);
        
        // Filter by list_id (list-specific statuses)
        if (query.list_id) {
          queryBuilder = queryBuilder
            .eq("scope_type", "list")
            .eq("scope_id", query.list_id);
        } else if (query.scope_type) {
          // Filter by scope_type only
          queryBuilder = queryBuilder.eq("scope_type", query.scope_type);
        }
        // If no filters, return all statuses (workspace + list)
        
        queryBuilder = queryBuilder.order("order_index", { ascending: true });
        
        const { data, error } = await queryBuilder;
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.name) return { error: "Campo 'name' é obrigatório", status: 400 };
      const { data: newStatus, error: createError } = await supabase
        .from("statuses")
        .insert({
          workspace_id: workspaceId,
          name: body.name,
          color: body.color || "#94a3b8",
          is_default: body.is_default || false,
          order_index: body.order_index || 0,
          category: body.category || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newStatus, status: 201 };
    case "PUT":
      if (!id) return { error: "ID do status é obrigatório", status: 400 };
      const { data: updatedStatus, error: updateError } = await supabase
        .from("statuses")
        .update({
          name: body.name,
          color: body.color,
          is_default: body.is_default,
          order_index: body.order_index,
          category: body.category,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedStatus };
    case "DELETE":
      if (!id) return { error: "ID do status é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("statuses")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ TAGS ============
async function handleTags(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (id) {
        const { data, error } = await supabase
          .from("task_tags")
          .select("*")
          .eq("id", id)
          .eq("workspace_id", workspaceId)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("task_tags")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("name", { ascending: true });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.name) return { error: "Campo 'name' é obrigatório", status: 400 };
      const { data: newTag, error: createError } = await supabase
        .from("task_tags")
        .insert({
          workspace_id: workspaceId,
          name: body.name,
          color: body.color || "#3b82f6",
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newTag, status: 201 };
    case "PUT":
      if (!id) return { error: "ID da tag é obrigatório", status: 400 };
      const { data: updatedTag, error: updateError } = await supabase
        .from("task_tags")
        .update({
          name: body.name,
          color: body.color,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedTag };
    case "DELETE":
      if (!id) return { error: "ID da tag é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("task_tags")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ COMMENTS ============
async function handleComments(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id && !id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      if (id) {
        const { data, error } = await supabase
          .from("task_comments")
          .select("*, profiles:author_id(id, full_name, avatar_url)")
          .eq("id", id)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("task_comments")
          .select("*, profiles:author_id(id, full_name, avatar_url)")
          .eq("task_id", query.task_id)
          .order("created_at", { ascending: true });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.content) return { error: "Campo 'content' é obrigatório", status: 400 };
      const { data: newComment, error: createError } = await supabase
        .from("task_comments")
        .insert({
          task_id: body.task_id,
          content: body.content,
          author_id: body.author_id || "00000000-0000-0000-0000-000000000000",
          assignee_id: body.assignee_id || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newComment, status: 201 };
    case "PUT":
      if (!id) return { error: "ID do comentário é obrigatório", status: 400 };
      const { data: updatedComment, error: updateError } = await supabase
        .from("task_comments")
        .update({
          content: body.content,
          resolved_at: body.resolved_at,
          resolved_by: body.resolved_by,
        })
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedComment };
    case "DELETE":
      if (!id) return { error: "ID do comentário é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ CHECKLISTS ============
async function handleChecklists(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id && !id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      if (id) {
        const { data, error } = await supabase
          .from("task_checklists")
          .select("*, task_checklist_items(*)")
          .eq("id", id)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("task_checklists")
          .select("*, task_checklist_items(*)")
          .eq("task_id", query.task_id)
          .order("order_index", { ascending: true });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.title) return { error: "Campo 'title' é obrigatório", status: 400 };
      const { data: newChecklist, error: createError } = await supabase
        .from("task_checklists")
        .insert({
          task_id: body.task_id,
          title: body.title,
          order_index: body.order_index || 0,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newChecklist, status: 201 };
    case "PUT":
      if (!id) return { error: "ID do checklist é obrigatório", status: 400 };
      const { data: updatedChecklist, error: updateError } = await supabase
        .from("task_checklists")
        .update({
          title: body.title,
          order_index: body.order_index,
        })
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedChecklist };
    case "DELETE":
      if (!id) return { error: "ID do checklist é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("task_checklists")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ CHECKLIST ITEMS ============
async function handleChecklistItems(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.checklist_id && !id) return { error: "Parâmetro 'checklist_id' é obrigatório", status: 400 };
      if (id) {
        const { data, error } = await supabase
          .from("task_checklist_items")
          .select("*")
          .eq("id", id)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("task_checklist_items")
          .select("*")
          .eq("checklist_id", query.checklist_id)
          .order("order_index", { ascending: true });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.checklist_id) return { error: "Campo 'checklist_id' é obrigatório", status: 400 };
      if (!body?.content) return { error: "Campo 'content' é obrigatório", status: 400 };
      const { data: newItem, error: createError } = await supabase
        .from("task_checklist_items")
        .insert({
          checklist_id: body.checklist_id,
          content: body.content,
          is_completed: body.is_completed || false,
          order_index: body.order_index || 0,
          assignee_id: body.assignee_id || null,
          due_date: body.due_date || null,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newItem, status: 201 };
    case "PUT":
      if (!id) return { error: "ID do item é obrigatório", status: 400 };
      const { data: updatedItem, error: updateError } = await supabase
        .from("task_checklist_items")
        .update({
          content: body.content,
          is_completed: body.is_completed,
          order_index: body.order_index,
          assignee_id: body.assignee_id,
          due_date: body.due_date,
        })
        .eq("id", id)
        .select()
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updatedItem };
    case "DELETE":
      if (!id) return { error: "ID do item é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("task_checklist_items")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ ASSIGNEES ============
async function handleAssignees(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      const { data, error } = await supabase
        .from("task_assignees")
        .select("*, profiles:user_id(id, full_name, avatar_url)")
        .eq("task_id", query.task_id);
      if (error) return { error: error.message, status: 400 };
      return { data };
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.user_id) return { error: "Campo 'user_id' é obrigatório", status: 400 };
      const { data: newAssignee, error: createError } = await supabase
        .from("task_assignees")
        .insert({
          task_id: body.task_id,
          user_id: body.user_id,
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newAssignee, status: 201 };
    case "DELETE":
      if (!query.task_id || !query.user_id) {
        return { error: "Parâmetros 'task_id' e 'user_id' são obrigatórios", status: 400 };
      }
      const { error: deleteError } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", query.task_id)
        .eq("user_id", query.user_id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ ATTACHMENTS ============
async function handleAttachments(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id && !id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      if (id) {
        const { data, error } = await supabase
          .from("task_attachments")
          .select("*")
          .eq("id", id)
          .single();
        if (error) return { error: error.message, status: 404 };
        return { data };
      } else {
        const { data, error } = await supabase
          .from("task_attachments")
          .select("*")
          .eq("task_id", query.task_id)
          .order("created_at", { ascending: false });
        if (error) return { error: error.message, status: 400 };
        return { data };
      }
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.file_url) return { error: "Campo 'file_url' é obrigatório", status: 400 };
      if (!body?.file_name) return { error: "Campo 'file_name' é obrigatório", status: 400 };
      const { data: newAttachment, error: createError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: body.task_id,
          file_url: body.file_url,
          file_name: body.file_name,
          file_type: body.file_type || "application/octet-stream",
          file_size: body.file_size || null,
          uploaded_by: body.uploaded_by || "00000000-0000-0000-0000-000000000000",
        })
        .select()
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newAttachment, status: 201 };
    case "DELETE":
      if (!id) return { error: "ID do anexo é obrigatório", status: 400 };
      const { error: deleteError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ MEMBERS (read-only) ============
async function handleMembers(supabase: any, method: string, id: string | null, workspaceId: string, query: any) {
  if (method !== "GET") {
    return { error: "Apenas leitura permitida para membros", status: 405 };
  }
  
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, profiles:user_id(id, full_name, avatar_url)")
    .eq("workspace_id", workspaceId);
  
  if (error) return { error: error.message, status: 400 };
  return { data };
}

// ============ TASK-TAGS (Relations) ============
async function handleTaskTags(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      const { data, error } = await supabase
        .from("task_tag_relations")
        .select("*, tag:task_tags(*)")
        .eq("task_id", query.task_id);
      if (error) return { error: error.message, status: 400 };
      return { data };
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.tag_id) return { error: "Campo 'tag_id' é obrigatório", status: 400 };
      const { data: newRelation, error: createError } = await supabase
        .from("task_tag_relations")
        .insert({
          task_id: body.task_id,
          tag_id: body.tag_id,
        })
        .select("*, tag:task_tags(*)")
        .single();
      if (createError) return { error: createError.message, status: 400 };
      return { data: newRelation, status: 201 };
    case "DELETE":
      if (!query.task_id || !query.tag_id) {
        return { error: "Parâmetros 'task_id' e 'tag_id' são obrigatórios", status: 400 };
      }
      const { error: deleteError } = await supabase
        .from("task_tag_relations")
        .delete()
        .eq("task_id", query.task_id)
        .eq("tag_id", query.tag_id);
      if (deleteError) return { error: deleteError.message, status: 400 };
      return { data: { deleted: true } };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ WORKSPACES ============
async function handleWorkspaces(supabase: any, method: string, workspaceId: string, body: any) {
  switch (method) {
    case "GET":
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, description, created_at, updated_at")
        .eq("id", workspaceId)
        .single();
      if (error) return { error: error.message, status: 404 };
      return { data };
    case "PUT":
      const updateData: any = {};
      if (body?.name !== undefined) updateData.name = body.name;
      if (body?.description !== undefined) updateData.description = body.description;
      updateData.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from("workspaces")
        .update(updateData)
        .eq("id", workspaceId)
        .select("id, name, description, created_at, updated_at")
        .single();
      if (updateError) return { error: updateError.message, status: 400 };
      return { data: updated };
    default:
      return { error: "Método não permitido", status: 405 };
  }
}

// ============ ACTIVITIES ============
async function handleActivities(supabase: any, method: string, id: string | null, workspaceId: string, body: any, query: any) {
  switch (method) {
    case "GET":
      if (!query.task_id) return { error: "Parâmetro 'task_id' é obrigatório", status: 400 };
      const { data, error } = await supabase
        .from("task_activities")
        .select("*")
        .eq("task_id", query.task_id)
        .order("created_at", { ascending: false });
      if (error) return { error: error.message, status: 400 };
      return { data };
      
    case "POST":
      if (!body?.task_id) return { error: "Campo 'task_id' é obrigatório", status: 400 };
      if (!body?.activity_type) return { error: "Campo 'activity_type' é obrigatório", status: 400 };
      
      // Get an admin user from the workspace if user_id not provided
      let userId = body.user_id;
      if (!userId) {
        const { data: admin } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", workspaceId)
          .eq("role", "admin")
          .limit(1)
          .single();
        userId = admin?.user_id || null;
      }
      
      if (!userId) {
        return { error: "Nenhum usuário encontrado para registrar a atividade", status: 400 };
      }
      
      const { data: newActivity, error: createError } = await supabase
        .from("task_activities")
        .insert({
          task_id: body.task_id,
          user_id: userId,
          activity_type: body.activity_type,
          field_name: body.field_name || null,
          old_value: body.old_value || null,
          new_value: body.new_value || null,
          metadata: body.metadata || null,
        })
        .select("*")
        .single();
        
      if (createError) return { error: createError.message, status: 400 };
      return { data: newActivity, status: 201 };
      
    default:
      return { error: "Método não permitido", status: 405 };
  }
}
