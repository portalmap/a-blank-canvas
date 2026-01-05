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

    // Get list info to verify workspace and get default status
    const { data: listData, error: listError } = await supabase
      .from("lists")
      .select("workspace_id, space_id")
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

    // Determine status_id
    let statusId = payload.status_id || tokenData.default_status_id;
    if (!statusId) {
      // Get default status for workspace
      const { data: defaultStatus } = await supabase
        .from("statuses")
        .select("id")
        .eq("workspace_id", tokenData.workspace_id)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      if (defaultStatus) {
        statusId = defaultStatus.id;
      } else {
        // Fallback: get first status
        const { data: firstStatus } = await supabase
          .from("statuses")
          .select("id")
          .eq("workspace_id", tokenData.workspace_id)
          .limit(1)
          .maybeSingle();

        if (firstStatus) {
          statusId = firstStatus.id;
        } else {
          return new Response(
            JSON.stringify({ error: "No status available for this workspace" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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
