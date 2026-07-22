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