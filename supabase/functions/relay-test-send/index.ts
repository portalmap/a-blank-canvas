// relay-test-send: dispara um diagnostico.ping para o Portal MAP via Hub.
// Público (verify_jwt=false). Auth manual via header x-diag-key.
// Nunca expõe HUB_RELAY_TOKEN ao chamador.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUB_RELAY_URL = (Deno.env.get("HUB_RELAY_URL") ?? "").replace(/\/$/, "");
const HUB_RELAY_TOKEN = Deno.env.get("HUB_RELAY_TOKEN") ?? "";
const DIAG_KEY = Deno.env.get("DIAG_KEY") ?? "";

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "x-diag-key, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  const diagHeader = req.headers.get("x-diag-key") ?? "";
  if (!DIAG_KEY || !timingSafeEqualStr(diagHeader, DIAG_KEY)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!HUB_RELAY_URL || !HUB_RELAY_TOKEN) {
    return json(
      { error: "Relay not configured (HUB_RELAY_URL / HUB_RELAY_TOKEN missing)" },
      500,
    );
  }

  const url = new URL(req.url);
  const modo = (url.searchParams.get("modo") ?? "consulta").toLowerCase();
  if (modo !== "consulta" && modo !== "entrega") {
    return json({ error: "modo_invalido", modo }, 400);
  }

  const envelope = {
    destinos: ["portal-map"],
    assunto: "diagnostico.ping",
    modo,
    referencia_origem: `teste-${Date.now()}`,
    payload: {
      echo: "ping de map-flow",
      quando: new Date().toISOString(),
    },
  };

  const hubPath = modo === "consulta" ? "/api/public/relay-query" : "/api/public/relay";
  const hubUrl = `${HUB_RELAY_URL}${hubPath}`;

  let hubStatus = 0;
  let hubBody: unknown = null;

  try {
    const resp = await fetch(hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HUB_RELAY_TOKEN}`,
      },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(15000),
    });
    hubStatus = resp.status;
    const text = await resp.text();
    try {
      hubBody = text ? JSON.parse(text) : null;
    } catch {
      hubBody = text;
    }
  } catch (e) {
    hubStatus = 0;
    hubBody = { error: "hub_unreachable", detail: String((e as Error)?.message ?? e) };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    await admin.from("relay_diagnostico_log").insert({
      direcao: "enviado",
      destino: "portal-map",
      assunto: "diagnostico.ping",
      modo,
      payload: envelope.payload,
      status_code: hubStatus || null,
      observacao: (() => {
        try { return JSON.stringify(hubBody); } catch { return String(hubBody); }
      })(),
    });
  } catch (e) {
    console.error("relay_diagnostico_log insert (enviado) failed", e);
  }

  return json(
    {
      enviado_para: "portal-map",
      modo,
      hub_status: hubStatus,
      resposta_do_hub: hubBody,
    },
    200,
  );
});