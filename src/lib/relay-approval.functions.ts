import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Ao marcar a tag "enviar aprovação" numa tarefa, envia calendario.aprovacao
// ao Hub com destino portal-map. Segredos do Hub ficam só no servidor.

const TAG_ENVIAR_APROVACAO_ID = "78b84f6c-b619-40bd-94f8-c1c2a63842c0";
const ASSUNTO = "calendario.aprovacao";
const SIGNED_URL_TTL = 3888000; // 45 dias — mesma validade usada no app

function extractStoragePath(fileUrl: string, bucket: string): string {
  if (!fileUrl.startsWith("http")) return fileUrl;
  const marker = `/${bucket}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx !== -1) return fileUrl.substring(idx + marker.length);
  return fileUrl;
}

export const relayApprovalSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ task_id: z.string().uuid(), tag_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    // Proteção: só dispara para a tag oficial "enviar aprovação"
    if (data.tag_id !== TAG_ENVIAR_APROVACAO_ID) {
      return { skipped: true as const, reason: "tag_diferente" };
    }

    const hubRelayUrl = (process.env["HUB_RELAY_URL"] ?? "").replace(/\/$/, "");
    const hubRelayToken = process.env["HUB_RELAY_TOKEN"] ?? "";
    if (!hubRelayUrl || !hubRelayToken) {
      return { success: false as const, error: "relay_nao_configurado" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Deduplicação: mesmo task_id + assunto no mesmo minuto = duplo disparo acidental
    const umMinutoAtras = new Date(Date.now() - 60_000).toISOString();
    const { data: recente } = await supabaseAdmin
      .from("relay_diagnostico_log")
      .select("id")
      .eq("direcao", "enviado")
      .eq("assunto", ASSUNTO)
      .gte("criado_em", umMinutoAtras)
      .filter("payload->>task_id", "eq", data.task_id)
      .limit(1)
      .maybeSingle();

    if (recente) {
      return { skipped: true as const, reason: "duplicado_mesmo_minuto" };
    }

    // Dados atuais da tarefa
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("id, title, description, social_channel, format, due_date, workspace_id, list_id")
      .eq("id", data.task_id)
      .single();

    if (taskError || !task) {
      return { success: false as const, error: "tarefa_nao_encontrada" };
    }

    // Nome do cliente: spaces.client_name (fallback spaces.name) via lists.space_id;
    // fallback final: workspaces.name
    let clienteNome: string | null = null;
    if (task.list_id) {
      const { data: list } = await supabaseAdmin
        .from("lists")
        .select("space_id")
        .eq("id", task.list_id)
        .maybeSingle();
      if (list?.space_id) {
        const { data: space } = await supabaseAdmin
          .from("spaces")
          .select("name, client_name")
          .eq("id", list.space_id)
          .maybeSingle();
        clienteNome = space?.client_name || space?.name || null;
      }
    }
    if (!clienteNome && task.workspace_id) {
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("name")
        .eq("id", task.workspace_id)
        .maybeSingle();
      clienteNome = ws?.name || null;
    }

    // Anexos com URL assinada (falha em um não quebra os demais)
    const { data: attachmentsRows } = await supabaseAdmin
      .from("task_attachments")
      .select("id, file_name, file_url")
      .eq("task_id", task.id);

    const attachments: Array<{ file_name: string; file_url: string }> = [];
    for (const att of attachmentsRows ?? []) {
      try {
        const path = extractStoragePath(att.file_url, "task-attachments");
        const { data: signed } = await supabaseAdmin.storage
          .from("task-attachments")
          .createSignedUrl(path, SIGNED_URL_TTL);
        if (signed?.signedUrl) {
          attachments.push({ file_name: att.file_name, file_url: signed.signedUrl });
        }
      } catch (e) {
        console.error("signed url failed for attachment", att.id, e);
      }
    }

    const envelope = {
      destinos: ["portal-map"],
      assunto: ASSUNTO,
      modo: "entrega",
      referencia_origem: task.id,
      payload: {
        name: clienteNome,
        tasks: [
          {
            id: task.id,
            title: task.title,
            description: task.description,
            social_channel: task.social_channel,
            format: task.format,
            due_date: task.due_date,
            attachments,
          },
        ],
      },
    };

    let hubStatus = 0;
    let hubBody: unknown = null;
    try {
      const resp = await fetch(`${hubRelayUrl}/api/public/relay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${hubRelayToken}`,
        },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(20000),
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

    // Log de saída (sem token). Inclui task_id no payload para deduplicação.
    try {
      await supabaseAdmin.from("relay_diagnostico_log").insert({
        direcao: "enviado",
        destino: "portal-map",
        assunto: ASSUNTO,
        modo: "entrega",
        payload: { task_id: task.id, ...envelope.payload },
        status_code: hubStatus || null,
        observacao: (() => {
          try { return JSON.stringify(hubBody); } catch { return String(hubBody); }
        })(),
      });
    } catch (e) {
      console.error("relay_diagnostico_log insert failed", e);
    }

    const ok = hubStatus >= 200 && hubStatus < 300;
    return {
      success: ok,
      enviado_para: "portal-map",
      assunto: ASSUNTO,
      task_id: task.id,
      anexos_enviados: attachments.length,
      hub_status: hubStatus,
    };
  });
