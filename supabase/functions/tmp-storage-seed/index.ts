// TEMPORARIO: sobe um PDF minimo no bucket task-attachments para validar signed URLs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;

Deno.serve(async (req) => {
  if (req.headers.get("x-access-key") !== Deno.env.get("HUB_INBOX_TOKEN")) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { path } = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const up = await admin.storage.from("task-attachments").upload(
    path,
    new Blob([PDF], { type: "application/pdf" }),
    { contentType: "application/pdf", upsert: true },
  );
  const signed = await admin.storage.from("task-attachments").createSignedUrl(path, 3888000);
  return new Response(JSON.stringify({
    upload_error: up.error?.message ?? null,
    signed_ok: !!signed.data?.signedUrl,
    signed_error: signed.error?.message ?? null,
  }), { headers: { "Content-Type": "application/json" } });
});
