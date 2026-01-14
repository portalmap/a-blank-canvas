import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskPayload {
  title: string;
  description?: string;
  due_date?: string;
  start_date?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  list_id?: string;
  status_id?: string;
  status_name?: string;  // Nome do status (ex: "Instagram") - busca case-insensitive
  attachment_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
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
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error("Invalid or inactive API token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Invalid or inactive API token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.error("API token has expired");
      return new Response(
        JSON.stringify({ error: "API token has expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: TaskPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    // Validate required fields
    if (!payload.title) {
      return new Response(
        JSON.stringify({ error: "Field 'title' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine list_id (from payload or token config)
    const listId = payload.list_id || tokenData.target_list_id;
    if (!listId) {
      return new Response(
        JSON.stringify({ error: "Field 'list_id' is required (either in payload or token configuration)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get list info to verify workspace and check status_source
    const { data: listData, error: listError } = await supabase
      .from("lists")
      .select("workspace_id, space_id, status_source")
      .eq("id", listId)
      .single();

    if (listError || !listData) {
      console.error("List not found:", listError);
      return new Response(
        JSON.stringify({ error: "List not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify list belongs to the token's workspace
    if (listData.workspace_id !== tokenData.workspace_id) {
      return new Response(
        JSON.stringify({ error: "List does not belong to the token's workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolver status_id com base no payload
    let statusId: string | null = null;
    
    console.log(`Resolving status for list ${listId}...`);

    // PRIORIDADE 1: Se status_name foi enviado, buscar pelo nome (case-insensitive)
    if (payload.status_name) {
      console.log(`Looking for status by name: "${payload.status_name}"`);
      
      const { data: namedStatus } = await supabase
        .from("statuses")
        .select("id, name")
        .eq("scope_type", "list")
        .eq("scope_id", listId)
        .ilike("name", payload.status_name)
        .maybeSingle();

      if (namedStatus) {
        statusId = namedStatus.id;
        console.log(`Found status by name "${payload.status_name}": ${statusId}`);
      } else {
        console.warn(`Status "${payload.status_name}" not found in list ${listId}, falling back to default`);
      }
    }

    // PRIORIDADE 2: Status default da lista
    if (!statusId) {
      const { data: listDefaultStatus } = await supabase
        .from("statuses")
        .select("id")
        .eq("scope_type", "list")
        .eq("scope_id", listId)
        .eq("is_default", true)
        .maybeSingle();

      if (listDefaultStatus) {
        statusId = listDefaultStatus.id;
        console.log(`Using default list status: ${statusId}`);
      }
    }

    // PRIORIDADE 3: Primeiro status da lista
    if (!statusId) {
      const { data: firstListStatus } = await supabase
        .from("statuses")
        .select("id")
        .eq("scope_type", "list")
        .eq("scope_id", listId)
        .order("order_index", { ascending: true })
        .limit(1);

      if (firstListStatus && firstListStatus.length > 0) {
        statusId = firstListStatus[0].id;
        console.log(`Using first list status: ${statusId}`);
      }
    }

    // PRIORIDADE 4: Status do workspace (para listas sem template)
    if (!statusId) {
      const { data: workspaceDefaultStatus } = await supabase
        .from("statuses")
        .select("id")
        .eq("workspace_id", tokenData.workspace_id)
        .eq("scope_type", "workspace")
        .eq("is_default", true)
        .maybeSingle();

      if (workspaceDefaultStatus) {
        statusId = workspaceDefaultStatus.id;
        console.log(`Using default workspace status: ${statusId}`);
      } else {
        const { data: firstWorkspaceStatus } = await supabase
          .from("statuses")
          .select("id")
          .eq("workspace_id", tokenData.workspace_id)
          .eq("scope_type", "workspace")
          .order("order_index", { ascending: true })
          .limit(1);

        if (firstWorkspaceStatus && firstWorkspaceStatus.length > 0) {
          statusId = firstWorkspaceStatus[0].id;
          console.log(`Using first workspace status: ${statusId}`);
        }
      }
    }

    if (!statusId) {
      return new Response(
        JSON.stringify({ error: "No status available for this list or workspace" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Final status resolved: ${statusId} for list ${listId}`);

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        title: payload.title,
        description: payload.description || null,
        due_date: payload.due_date || null,
        start_date: payload.start_date || null,
        priority: payload.priority || "medium",
        list_id: listId,
        status_id: statusId,
        workspace_id: tokenData.workspace_id,
        created_by_user_id: tokenData.created_by,
      })
      .select()
      .single();

    if (taskError) {
      console.error("Error creating task:", taskError);
      return new Response(
        JSON.stringify({ error: "Failed to create task", details: taskError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Task created:", task.id);

    // Handle attachment if provided
    if (payload.attachment_url) {
      const { error: attachmentError } = await supabase
        .from("task_attachments")
        .insert({
          task_id: task.id,
          file_url: payload.attachment_url,
          file_name: payload.attachment_url.split("/").pop() || "attachment",
          uploaded_by: tokenData.created_by,
        });

      if (attachmentError) {
        console.warn("Failed to add attachment:", attachmentError);
        // Don't fail the entire request for attachment issues
      }
    }

    // Update last_used_at for the token
    await supabase
      .from("api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    return new Response(
      JSON.stringify({
        success: true,
        task_id: task.id,
        message: "Task created successfully",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
