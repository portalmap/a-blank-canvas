// SSO exchange: trades a Hub authorization code for a local Supabase session.
// Public function (verify_jwt=false). client_secret only used server-to-server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ROLES = new Set([
  "administrador_global",
  "administrador",
  "gestor",
  "membro",
  "convidado",
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUB_SSO_REDEEM_URL = Deno.env.get("HUB_SSO_REDEEM_URL") ?? "";
const SSO_CLIENT_SECRET = Deno.env.get("SSO_CLIENT_SECRET") ?? "";
const APP_SLUG = Deno.env.get("APP_SLUG") ?? "map-flow";

function corsHeaders(origin: string | null): HeadersInit {
  // Restrict CORS to the project's own origins (preview + published).
  // We accept the origin if it matches the Lovable preview/published pattern
  // for this project. Fallback to "*" only when no Origin header was sent.
  const allowed =
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /\.lovable\.app$/.test(new URL(origin).hostname);
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

// Find a user by email reliably. Avoids relying on listUsers() first page.
async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();

  // 1. Direct lookup by email via the profiles table (cheapest, exact).
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", target)
    .maybeSingle();
  if (profile?.id) {
    return { id: profile.id as string, email: target };
  }

  // 2. Fallback: paginate auth admin users until we either find the email
  //    or exhaust the list. Never trust just the first page.
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return { id: hit.id, email: target };
    if (users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  if (!HUB_SSO_REDEEM_URL || !SSO_CLIENT_SECRET) {
    return json(
      { error: "SSO not configured (HUB_SSO_REDEEM_URL / SSO_CLIENT_SECRET missing)" },
      500,
      origin,
    );
  }

  let body: { code?: unknown; redirect_to?: unknown; fingerprint?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const redirectTo =
    typeof body.redirect_to === "string" ? body.redirect_to : undefined;
  const fingerprint =
    typeof body.fingerprint === "string" ? body.fingerprint : "";
  if (!code) return json({ error: "Missing code" }, 400, origin);

  // Capture external IP from the request (browser cannot know this).
  const xff = req.headers.get("x-forwarded-for");
  const baselineIp =
    (xff ? xff.split(",")[0]!.trim() : "") ||
    req.headers.get("x-real-ip") ||
    null;

  // 1. Redeem code at the Hub (server-to-server).
  let hubResp: Response;
  try {
    hubResp = await fetch(HUB_SSO_REDEEM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_secret: SSO_CLIENT_SECRET,
        app: APP_SLUG,
      }),
    });
  } catch (e) {
    console.error("Hub redeem network error", e);
    return json({ error: "Hub unreachable" }, 502, origin);
  }

  if (!hubResp.ok) {
    const txt = await hubResp.text().catch(() => "");
    console.error("Hub redeem failed", hubResp.status, txt);
    return json(
      { error: `Hub rejected code (${hubResp.status})` },
      401,
      origin,
    );
  }

  let payload: {
    user?: { id?: string; email?: string; name?: string; avatar_url?: string };
    role?: string;
    app?: string;
  };
  try {
    payload = await hubResp.json();
  } catch {
    return json({ error: "Invalid Hub response" }, 502, origin);
  }

  const hubUser = payload.user ?? {};
  const email = (hubUser.email ?? "").trim().toLowerCase();
  const fullName = (hubUser.name ?? "").trim();
  const avatarUrl = (hubUser.avatar_url ?? "").trim() || null;
  const role = (payload.role ?? "").trim();

  if (!email) return json({ error: "Hub did not return email" }, 502, origin);
  if (payload.app && payload.app !== APP_SLUG) {
    return json({ error: `Wrong app slug: ${payload.app}` }, 400, origin);
  }
  if (!ALLOWED_ROLES.has(role)) {
    // Loud failure: never create a session for an unknown role.
    return json({ error: `Invalid role from Hub: "${role}"` }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Reliable lookup by email; create only if truly absent.
  let existing = await findUserByEmail(admin, email);
  if (!existing) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
        avatar_url: avatarUrl,
      },
    });
    if (createErr || !created?.user) {
      // Race: someone else may have just created them. Re-query.
      existing = await findUserByEmail(admin, email);
      if (!existing) {
        console.error("createUser failed", createErr);
        return json(
          { error: createErr?.message ?? "Could not create user" },
          500,
          origin,
        );
      }
    } else {
      existing = { id: created.user.id, email };
    }
  }

  // 3. Upsert profile (id-based to keep FK happy; email is the natural key).
  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: existing.id,
        email,
        full_name: fullName || null,
        avatar_url: avatarUrl,
        role_slug: role,
      },
      { onConflict: "id" },
    );
  if (upsertErr) {
    console.error("profile upsert failed", upsertErr);
    return json({ error: "Could not upsert profile" }, 500, origin);
  }

  // 4. Generate a magic-link OTP for the client to verify -> establishes session.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("generateLink failed", linkErr);
    return json({ error: "Could not issue session token" }, 500, origin);
  }

  // 5. Upsert session_context baseline (IP + fingerprint + login_at).
  try {
    await admin
      .from("session_context")
      .upsert(
        {
          user_id: existing.id,
          email,
          baseline_ip: baselineIp,
          baseline_fingerprint: fingerprint || null,
          login_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
  } catch (e) {
    console.error("session_context upsert failed", e);
    // Non-fatal: continue issuing the session.
  }

  return json(
    {
      email,
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    },
    200,
    origin,
  );
});