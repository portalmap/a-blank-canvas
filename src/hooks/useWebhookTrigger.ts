import { supabase } from "@/integrations/supabase/client";

type WebhookEventType = 
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "task.status_changed"
  | "comment.created"
  | "comment.updated"
  | "list.created"
  | "list.updated"
  | "list.deleted"
  | "space.created"
  | "space.updated"
  | "webhook.test";

interface TriggerWebhookParams {
  eventType: WebhookEventType;
  workspaceId: string;
  payload: Record<string, unknown>;
}

export async function triggerWebhook({ eventType, workspaceId, payload }: TriggerWebhookParams) {
  try {
    const { data, error } = await supabase.functions.invoke("webhook-enqueue", {
      body: {
        event_type: eventType,
        workspace_id: workspaceId,
        payload,
      },
    });

    if (error) {
      console.error("Error triggering webhook:", error);
      return { success: false, error };
    }

    console.log(`Webhook ${eventType} triggered:`, data);
    return { success: true, data };
  } catch (err) {
    console.error("Error triggering webhook:", err);
    return { success: false, error: err };
  }
}

// Helper to use in React components
export function useWebhookTrigger() {
  return { triggerWebhook };
}
