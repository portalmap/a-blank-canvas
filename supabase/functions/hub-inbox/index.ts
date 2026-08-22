// hub-inbox: porta de entrada do MAP Flow para mensagens do Hub.
// Público (verify_jwt=false). Auth manual via Authorization: Bearer <HUB_INBOX_TOKEN>.
// Trata apenas o assunto "diagnostico.ping". Qualquer outro assunto responde 422.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUB_INBOX_TOKEN = Deno.env.get("HUB_INBOX_TOKEN") ?? "";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // server-to-server
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const h = url.hostname;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (/\.lovable\.app$/.test(h)) return true;
  if (/\.lovableproject\.com$/.test(h)) return true;
  return false;
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

// Helper replicado do api-gateway (edge functions nao compartilham modulos):
// resolve paths do bucket task-attachments em signed URLs.
async function resolveAttachmentUrls(supabase: any, attachments: any[]) {
  if (!attachments?.length) return attachments;
  const toResolve = attachments.filter(
    (a: any) => a.file_url && !a.file_url.startsWith("http"),
  );
  if (toResolve.length === 0) return attachments;

  const paths = toResolve.map((a: any) => a.file_url);
  let signed: any[] | null = null;
  try {
    const res = await supabase.storage
      .from("task-attachments")
      .createSignedUrls(paths, 3888000);
    if (res.error) {
      console.error("signed url batch failed:", res.error.message);
    }
    signed = res.data ?? null;
  } catch (e) {
    console.error(
      "signed url batch threw:",
      e instanceof Error ? e.message : String(e),
    );
  }

  let failures = 0;
  toResolve.forEach((a: any, i: number) => {
    const item = signed?.[i];
    const url = item?.signedUrl;
    if (url) {
      a.file_url = url;
    } else {
      // Nunca devolver o path do bucket: sem signed URL, o campo vira null.
      a.file_url = null;
      failures++;
    }
  });
  if (failures > 0) {
    console.error(`signed url unresolved for ${failures} attachment(s)`);
  }
  return attachments;
}

async function resolveTasksAttachments(supabase: any, tasks: any[]) {
  if (!tasks?.length) return tasks;
  for (const task of tasks) {
    if (task.task_attachments?.length) {
      await resolveAttachmentUrls(supabase, task.task_attachments);
    }
  }
  return tasks;
}

const TAG_APROVACAO = "enviar cliente";

async function handleListarParaAprovacao(
  admin: any,
  modo: string | null,
  payload: unknown,
  origin: string | null,
) {
  if (modo !== "consulta") {
    return json({ error: "modo_nao_suportado" }, 422, origin);
  }

  const raw = (payload ?? {}) as Record<string, unknown>;
  const listIds = Array.isArray(raw.list_ids)
    ? (raw.list_ids as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
  if (listIds.length === 0) {
    return json({ error: "list_ids_obrigatorio" }, 422, origin);
  }

  try {
    // 1. Workspace a partir das listas
    const { data: lists, error: listsError } = await admin
      .from("lists")
      .select("id, workspace_id")
      .in("id", listIds);
    if (listsError) throw listsError;
    if (!lists || lists.length === 0) return json({ tarefas: [] }, 200, origin);

    const workspaces = [...new Set(lists.map((l: any) => l.workspace_id))];
    if (workspaces.length > 1) {
      return json({ error: "listas_de_workspaces_distintos" }, 422, origin);
    }
    const ws = workspaces[0];

    // 2. Tag no workspace
    const { data: tag, error: tagError } = await admin
      .from("task_tags")
      .select("id")
      .eq("workspace_id", ws)
      .ilike("name", TAG_APROVACAO)
      .maybeSingle();
    if (tagError) throw tagError;
    if (!tag) return json({ tarefas: [] }, 200, origin);

    // 3. Relacoes tag -> tarefa
    const { data: relations, error: relError } = await admin
      .from("task_tag_relations")
      .select("task_id")
      .eq("tag_id", tag.id);
    if (relError) throw relError;
    const taskIds = (relations ?? []).map((r: any) => r.task_id);
    if (taskIds.length === 0) return json({ tarefas: [] }, 200, origin);

    // 4. Filtro combinado: tag E conjunto de listas
    const { data: tasks, error: tasksError } = await admin
      .from("tasks")
      .select(`
        id, title, description,
        lists!inner(workspace_id, name, space_id, space:spaces(id, name)),
        task_attachments(id, file_url, file_name, file_type, file_size)
      `)
      .in("id", taskIds)
      .in("list_id", listIds)
      .eq("lists.workspace_id", ws)
      .is("parent_id", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (tasksError) throw tasksError;

    // 5. Resolver anexos (path -> signed URL)
    await resolveTasksAttachments(admin, tasks ?? []);

    const tarefas = (tasks ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      list_name: t.lists?.name ?? null,
      space_name: t.lists?.space?.name ?? null,
      attachments: (t.task_attachments ?? []).map((a: any) => ({
        attachment_id: a.id,
        url: a.file_url,
        title: a.file_name,
      })),
    }));

    return json({ tarefas }, 200, origin);
  } catch (e) {
    console.error(
      "tarefa.listar_para_aprovacao query failed",
      e instanceof Error ? e.message : String(e),
    );
    return json({ error: "erro_consulta" }, 500, origin);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  // Auth
  const authHeader = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!HUB_INBOX_TOKEN || !authHeader.startsWith(prefix) ||
      !timingSafeEqualStr(authHeader.slice(prefix.length).trim(), HUB_INBOX_TOKEN)) {
    return json({ error: "Unauthorized" }, 401, origin);
  }

  // Parse body
  let body: {
    id?: unknown;
    origem?: unknown;
    assunto?: unknown;
    modo?: unknown;
    referencia_origem?: unknown;
    payload?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  const mensagemId = typeof body.id === "string" ? body.id : null;
  const origem = typeof body.origem === "string" ? body.origem : null;
  const assunto = typeof body.assunto === "string" ? body.assunto : null;
  const modo = typeof body.modo === "string" ? body.modo : null;
  const payload = (body.payload ?? null) as unknown;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Log-and-continue: erro no insert não deve quebrar a resposta funcional.
  try {
    await admin.from("relay_diagnostico_log").insert({
      direcao: "recebido",
      mensagem_id: mensagemId,
      origem,
      assunto,
      modo,
      payload,
    });
  } catch (e) {
    console.error("relay_diagnostico_log insert (recebido) failed", e);
  }

  if (assunto === "tarefa.listar_para_aprovacao") {
    return await handleListarParaAprovacao(admin, modo, payload, origin);
  }

  if (assunto === "calendario.publicar") {
    return await handleCalendarioPublicar(admin, modo, payload, mensagemId, origin);
  }


  if (assunto !== "diagnostico.ping") {
    return json(
      { error: "assunto_nao_suportado", assunto },
      422,
      origin,
    );
  }

  if (modo === "consulta") {
    const echo =
      payload && typeof payload === "object" && "echo" in (payload as Record<string, unknown>)
        ? (payload as Record<string, unknown>).echo ?? null
        : null;
    return json(
      {
        pong: true,
        recebido_de: origem,
        sou_eu: "map-flow",
        echo,
        processado_em: new Date().toISOString(),
      },
      200,
      origin,
    );
  }

  if (modo === "entrega") {
    return json({ ok: true, recebido_de: origem }, 200, origin);
  }

  return json({ error: "modo_invalido", modo }, 400, origin);
});