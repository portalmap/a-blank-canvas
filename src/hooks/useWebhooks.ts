import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface WebhookEndpoint {
  id: string;
  workspace_id: string;
  created_by: string;
  url: string;
  events: string[];
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempt_count: number;
  next_attempt_at: string;
  last_status_code: number | null;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}

export interface WebhookInboxItem {
  id: string;
  workspace_id: string | null;
  source: string;
  headers: Record<string, string> | null;
  payload: Record<string, unknown>;
  status: string;
  error: string | null;
  received_at: string;
  processed_at: string | null;
}

// Available webhook events
export const WEBHOOK_EVENTS = [
  { value: "task.created", label: "Task Created" },
  { value: "task.updated", label: "Task Updated" },
  { value: "task.deleted", label: "Task Deleted" },
  { value: "task.status_changed", label: "Task Status Changed" },
  { value: "comment.created", label: "Comment Created" },
  { value: "list.created", label: "List Created" },
  { value: "list.updated", label: "List Updated" },
  { value: "space.created", label: "Space Created" },
  { value: "*", label: "All Events" },
];

// Fetch endpoints for a workspace
export function useWebhookEndpoints(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["webhook-endpoints", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("id, workspace_id, created_by, url, events, is_active, description, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WebhookEndpoint[];
    },
    enabled: !!workspaceId,
  });
}

// Fetch deliveries for endpoints in a workspace
export function useWebhookDeliveries(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["webhook-deliveries", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      // First get endpoint IDs for this workspace
      const { data: endpoints } = await supabase
        .from("webhook_endpoints")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (!endpoints || endpoints.length === 0) return [];

      const endpointIds = endpoints.map(e => e.id);
      
      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .in("endpoint_id", endpointIds)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WebhookDelivery[];
    },
    enabled: !!workspaceId,
  });
}

// Fetch inbox items for a workspace
export function useWebhookInbox(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["webhook-inbox", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("webhook_inbox")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WebhookInboxItem[];
    },
    enabled: !!workspaceId,
  });
}

// Create endpoint mutation
export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      url,
      events,
      description,
    }: {
      workspaceId: string;
      url: string;
      events: string[];
      description?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("webhook_endpoints")
        .insert({
          workspace_id: workspaceId,
          created_by: user.user.id,
          url,
          events,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints", variables.workspaceId] });
      toast({ title: "Webhook endpoint created" });
    },
    onError: (error) => {
      console.error("Error creating endpoint:", error);
      toast({ title: "Error creating endpoint", variant: "destructive" });
    },
  });
}

// Update endpoint mutation
export function useUpdateWebhookEndpoint() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      url,
      events,
      description,
      is_active,
    }: {
      id: string;
      url?: string;
      events?: string[];
      description?: string;
      is_active?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (url !== undefined) updates.url = url;
      if (events !== undefined) updates.events = events;
      if (description !== undefined) updates.description = description;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from("webhook_endpoints")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints", data.workspace_id] });
      toast({ title: "Webhook endpoint updated" });
    },
    onError: (error) => {
      console.error("Error updating endpoint:", error);
      toast({ title: "Error updating endpoint", variant: "destructive" });
    },
  });
}

// Delete endpoint mutation
export function useDeleteWebhookEndpoint() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints", data.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", data.workspaceId] });
      toast({ title: "Webhook endpoint deleted" });
    },
    onError: (error) => {
      console.error("Error deleting endpoint:", error);
      toast({ title: "Error deleting endpoint", variant: "destructive" });
    },
  });
}

// Regenerate secret mutation
export function useRegenerateWebhookSecret() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Generate new secret on client (will be stored securely)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const newSecret = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

      const { data, error } = await supabase
        .from("webhook_endpoints")
        .update({ secret: newSecret })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints", data.workspace_id] });
      toast({ title: "Secret regenerated" });
    },
    onError: (error) => {
      console.error("Error regenerating secret:", error);
      toast({ title: "Error regenerating secret", variant: "destructive" });
    },
  });
}

// Send test webhook
export function useSendTestWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ endpointId, workspaceId }: { endpointId: string; workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("webhook-enqueue", {
        body: {
          event_type: "webhook.test",
          workspace_id: workspaceId,
          payload: {
            message: "This is a test webhook",
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", variables.workspaceId] });
      toast({ title: "Test webhook sent" });
    },
    onError: (error) => {
      console.error("Error sending test webhook:", error);
      toast({ title: "Error sending test webhook", variant: "destructive" });
    },
  });
}

// Trigger dispatcher manually
export function useTriggerDispatcher() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      const { data, error } = await supabase.functions.invoke("webhooks-dispatcher");
      if (error) throw error;
      return { ...data, workspaceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries", data.workspaceId] });
      toast({ title: `Dispatcher processed ${data.processed || 0} deliveries` });
    },
    onError: (error) => {
      console.error("Error triggering dispatcher:", error);
      toast({ title: "Error triggering dispatcher", variant: "destructive" });
    },
  });
}
