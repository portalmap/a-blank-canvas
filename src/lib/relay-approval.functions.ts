import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendApprovalRelayToHub } from "@/lib/relay-approval.server";

// Ao marcar a tag "enviar aprovação" numa tarefa, envia calendario.aprovacao
// ao Hub com destino portal-map. Segredos do Hub ficam só no servidor.

export const relayApprovalSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ task_id: z.string().uuid(), tag_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => sendApprovalRelayToHub(data));
