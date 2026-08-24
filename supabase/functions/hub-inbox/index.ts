// hub-inbox: porta de entrada do MAP Flow para mensagens do Hub.
// Público (verify_jwt=false). Auth manual via Authorization: Bearer <HUB_INBOX_TOKEN>.
// Trata apenas o assunto "diagnostico.ping". Qualquer outro assunto responde 422.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

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

// ==========================================================================
// calendario.publicar — recebe o calendário do Hub (Social Flow) e cria as
// tarefas correspondentes, uma por post, de forma idempotente.
// Módulo isolado: não altera diagnostico.ping nem tarefa.listar_para_aprovacao.
// ==========================================================================

const AnexoSchema = z.object({
  url: z.string().min(1),
  file_name: z.string().min(1).optional(),
  file_type: z.string().optional(),
  file_size: z.number().optional(),
});

const PostSchema = z.object({
  external_post_ref: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  social_channel: z.string().nullish(),
  format: z.string().nullish(),
  due_date: z.string().nullish(),
  attachments: z.array(AnexoSchema).optional(),
});

const CalendarioSchema = z.object({
  name: z.string().nullish(),
  cliente_chave: z.string().min(1),
  tasks: z.array(PostSchema).min(1),
});

// Normalização usada para casar o nome do cliente: minúsculo, sem acento
// (qualquer diacrítico, via NFD), espaços aparados e colapsados.
function normalizarNome(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Variante tolerante a pontuação: "Plan. de Criativos" == "plan de criativos".
function normalizarSemPontuacao(valor: string): string {
  return normalizarNome(valor)
    .replace(/[.,;:!?'"`´^~/\\|_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Prefixos canônicos (o sufixo "| Cliente" dos nomes reais é ignorado).
const FOLDER_DESTINO = "tarefas demandas";
const LISTA_DESTINO = "plan de criativos";

// Remove o prefixo visual "MAP |" do nome do space.
function semPrefixoMap(valor: string): string {
  return normalizarSemPontuacao(valor).replace(/^map\s+/, "").trim();
}

async function resolverAutor(admin: any, workspace: any): Promise<string | null> {
  if (workspace.created_by_user_id) return workspace.created_by_user_id;
  const { data } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "global_owner")
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

// Cliente = Space. Chave oficial: spaces.client_name.
// Reserva: spaces.name sem o prefixo "MAP |".
async function resolverCliente(
  admin: any,
  nomeRecebido: string,
): Promise<{
  space?: { id: string; name: string; client_name: string | null; workspace_id: string };
  erro?: string;
  clientes?: string[];
}> {
  const alvo = normalizarSemPontuacao(nomeRecebido);
  const alvoSemMap = semPrefixoMap(nomeRecebido);

  const { data: spaces, error } = await admin
    .from("spaces")
    .select("id, name, client_name, workspace_id, archived_at");
  if (error) throw error;

  const ativos = (spaces ?? []).filter((s: any) => !s.archived_at);

  const porClientName = ativos.filter(
    (s: any) =>
      s.client_name &&
      (normalizarSemPontuacao(s.client_name) === alvo ||
        normalizarSemPontuacao(s.client_name) === alvoSemMap),
  );

  const candidatos =
    porClientName.length > 0
      ? porClientName
      : ativos.filter(
          (s: any) =>
            semPrefixoMap(s.name) === alvoSemMap ||
            normalizarSemPontuacao(s.name) === alvo,
        );

  const disponiveis = ativos.map((s: any) => s.client_name ?? s.name);

  if (candidatos.length === 0) {
    return { erro: "cliente_nao_encontrado", clientes: disponiveis };
  }
  if (candidatos.length > 1) {
    return {
      erro: "cliente_ambiguo",
      clientes: candidatos.map((s: any) => s.client_name ?? s.name),
    };
  }
  return { space: candidatos[0] };
}

// Lista canônica dentro do Space do cliente:
// pasta "Tarefas & Demandas ..." -> lista "Plan. de Criativos ...".
async function resolverListaDestino(
  admin: any,
  spaceId: string,
): Promise<{
  listId?: string;
  erro?: string;
  pastas?: string[];
  listas?: string[];
  pasta?: string;
}> {
  const { data: pastas, error: pastasErr } = await admin
    .from("folders")
    .select("id, name")
    .eq("space_id", spaceId);
  if (pastasErr) throw pastasErr;

  const pastasDisponiveis = pastas ?? [];
  const alvoPastas = pastasDisponiveis.filter((f: any) =>
    normalizarSemPontuacao(f.name).startsWith(FOLDER_DESTINO),
  );
  if (alvoPastas.length === 0) {
    return {
      erro: "pasta_destino_nao_encontrada",
      pastas: pastasDisponiveis.map((f: any) => f.name),
    };
  }
  if (alvoPastas.length > 1) {
    return {
      erro: "pasta_destino_ambigua",
      pastas: alvoPastas.map((f: any) => f.name),
    };
  }
  const pasta = alvoPastas[0];

  const { data: listas, error: listasErr } = await admin
    .from("lists")
    .select("id, name")
    .eq("folder_id", pasta.id);
  if (listasErr) throw listasErr;

  const listasDisponiveis = listas ?? [];
  const alvoListas = listasDisponiveis.filter((l: any) =>
    normalizarSemPontuacao(l.name).startsWith(LISTA_DESTINO),
  );
  if (alvoListas.length === 0) {
    return {
      erro: "lista_destino_nao_encontrada",
      pasta: pasta.name,
      listas: listasDisponiveis.map((l: any) => l.name),
    };
  }
  if (alvoListas.length > 1) {
    return {
      erro: "lista_destino_ambigua",
      pasta: pasta.name,
      listas: alvoListas.map((l: any) => l.name),
    };
  }

  return { listId: alvoListas[0].id };
}

// Conjunto de status aplicáveis à lista, na hierarquia list -> space -> workspace.
async function carregarStatusesDaLista(
  admin: any,
  workspaceId: string,
  listId: string,
  spaceId: string | null,
): Promise<Array<{ id: string; name: string }>> {
  const { data: statuses, error } = await admin
    .from("statuses")
    .select("id, name, scope_type, scope_id, order_index")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const doEscopo = (scope: string, scopeId: string | null) =>
    (statuses ?? []).filter(
      (s: any) =>
        s.scope_type === scope && (scopeId === null || s.scope_id === scopeId),
    );

  const escolhidos =
    (doEscopo("list", listId).length > 0 && doEscopo("list", listId)) ||
    (spaceId && doEscopo("space", spaceId).length > 0 && doEscopo("space", spaceId)) ||
    doEscopo("workspace", null);

  return (escolhidos as any[]).map((s: any) => ({ id: s.id, name: s.name }));
}

// Status = status cujo nome corresponde ao canal do post (normalizado).
function resolverStatusDoCanal(
  statuses: Array<{ id: string; name: string }>,
  canal: string | null | undefined,
): string | null {
  if (!canal) return null;
  const alvo = normalizarSemPontuacao(canal);
  const achou = statuses.find((s) => normalizarSemPontuacao(s.name) === alvo);
  return achou?.id ?? null;
}

async function handleCalendarioPublicar(
  admin: any,
  modo: string | null,
  payload: unknown,
  mensagemId: string | null,
  origin: string | null,
) {
  if (modo !== "consulta") {
    return json({ error: "modo_nao_suportado", modo }, 422, origin);
  }

  const parsed = CalendarioSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return json(
      {
        error: "payload_invalido",
        detalhes: parsed.error.issues.map((i) => ({
          campo: i.path.join("."),
          motivo: i.message,
        })),
      },
      422,
      origin,
    );
  }
  const dados = parsed.data;

  try {
    // Idempotência por mensagem: mesma id => devolve a resposta guardada.
    if (mensagemId) {
      const { data: jaProcessada } = await admin
        .from("hub_inbox_processed")
        .select("resposta")
        .eq("mensagem_id", mensagemId)
        .maybeSingle();
      if (jaProcessada?.resposta) {
        return json(jaProcessada.resposta, 200, origin);
      }
    }

    // 1. Resolver o cliente (Space) uma única vez, pelo nome recebido.
    const clienteRes = await resolverCliente(admin, dados.cliente_chave);
    if (!clienteRes.space) {
      return json(
        {
          error: clienteRes.erro,
          cliente_chave: dados.cliente_chave,
          clientes_disponiveis: clienteRes.clientes ?? [],
        },
        422,
        origin,
      );
    }
    const space = clienteRes.space;

    const { data: workspaceRow, error: wsError } = await admin
      .from("workspaces")
      .select("id, name, created_by_user_id")
      .eq("id", space.workspace_id)
      .maybeSingle();
    if (wsError) throw wsError;
    if (!workspaceRow) {
      return json({ error: "workspace_do_cliente_nao_encontrado" }, 422, origin);
    }
    const workspace = workspaceRow;

    // 2. Lista de destino dentro do Space: "Tarefas & Demandas" -> "Plan. de Criativos".
    const lista = await resolverListaDestino(admin, space.id);
    if (!lista.listId) {
      return json(
        {
          error: lista.erro,
          workspace_id: workspace.id,
          pasta_esperada: "Tarefas & Demandas",
          lista_esperada: "Plan. de Criativos",
          pasta_encontrada: lista.pasta ?? null,
          pastas_disponiveis: lista.pastas ?? [],
          listas_disponiveis: lista.listas ?? [],
        },
        422,
        origin,
      );
    }

    const { data: listaInfo, error: listaErr } = await admin
      .from("lists")
      .select("id, name, space_id")
      .eq("id", lista.listId)
      .maybeSingle();
    if (listaErr) throw listaErr;

    // 3. Status aplicáveis à lista (o status de cada post vem do canal).
    const statusesDaLista = await carregarStatusesDaLista(
      admin,
      workspace.id,
      lista.listId,
      listaInfo?.space_id ?? null,
    );
    const nomesStatus = statusesDaLista.map((s) => s.name);


    // 4. Autor técnico.
    const autorId = await resolverAutor(admin, workspace);
    if (!autorId) {
      return json({ error: "autor_tecnico_indefinido" }, 422, origin);
    }

    // 5. Uma tarefa por post, idempotente por external_post_ref.
    const resultados: Array<Record<string, unknown>> = [];

    for (const post of dados.tasks) {
      const { data: existente, error: buscaErr } = await admin
        .from("tasks")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("external_post_ref", post.external_post_ref)
        .maybeSingle();
      if (buscaErr) throw buscaErr;

      if (existente) {
        resultados.push({
          external_post_ref: post.external_post_ref,
          task_id: existente.id,
          status: "ja_existia",
        });
        continue;
      }

      // Status = status da lista cujo nome corresponde ao canal do post.
      const statusId = resolverStatusDoCanal(statusesDaLista, post.social_channel);
      if (!statusId) {
        resultados.push({
          external_post_ref: post.external_post_ref,
          task_id: null,
          status: "erro",
          error: "status_do_canal_nao_encontrado",
          canal: post.social_channel ?? null,
          status_disponiveis: nomesStatus,
        });
        continue;
      }

      const insercao = await admin
        .from("tasks")
        .insert({
          workspace_id: workspace.id,
          list_id: lista.listId,
          status_id: statusId,
          title: post.title,
          description: post.description ?? null,
          social_channel: post.social_channel ?? null,
          format: post.format ?? null,
          due_date: post.due_date ?? null,
          external_post_ref: post.external_post_ref,
          created_by_user_id: autorId,
        })
        .select("id")
        .single();

      let taskId = insercao.data?.id ?? null;
      let criada = true;

      if (insercao.error) {
        // Corrida no índice único parcial: relê a tarefa existente.
        if (insercao.error.code === "23505") {
          const { data: reLido } = await admin
            .from("tasks")
            .select("id")
            .eq("workspace_id", workspace.id)
            .eq("external_post_ref", post.external_post_ref)
            .maybeSingle();
          taskId = reLido?.id ?? null;
          criada = false;
        }
        if (!taskId) throw insercao.error;
      }

      // Anexos apenas para tarefas criadas agora (evita duplicar).
      if (criada && post.attachments?.length) {
        const linhas = post.attachments.map((a) => ({
          task_id: taskId,
          file_name: a.file_name ?? a.url.split("/").pop() ?? "arquivo",
          file_url: a.url,
          file_type: a.file_type ?? null,
          file_size: a.file_size ?? null,
          uploaded_by: autorId,
        }));
        const anexoRes = await admin.from("task_attachments").insert(linhas);
        if (anexoRes.error) {
          console.error(
            "calendario.publicar anexo falhou",
            post.external_post_ref,
            anexoRes.error.message,
          );
        }
      }

      resultados.push({
        external_post_ref: post.external_post_ref,
        task_id: taskId,
        status: criada ? "criada" : "ja_existia",
      });
    }

    const resposta = {
      cliente: { workspace_id: workspace.id, name: workspace.name },
      list_id: lista.listId,
      list_name: listaInfo?.name ?? null,
      resultados,
    };

    if (mensagemId) {
      try {
        await admin.from("hub_inbox_processed").insert({
          mensagem_id: mensagemId,
          assunto: "calendario.publicar",
          resposta,
        });
      } catch (e) {
        console.error("hub_inbox_processed insert failed", e);
      }
    }

    return json(resposta, 200, origin);
  } catch (e) {
    console.error(
      "calendario.publicar falhou",
      e instanceof Error ? e.message : JSON.stringify(e),
    );
    return json({ error: "erro_processamento" }, 500, origin);
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