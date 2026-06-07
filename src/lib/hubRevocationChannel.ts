import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const HUB_URL = import.meta.env.VITE_HUB_SUPABASE_URL as string | undefined;
const HUB_KEY = import.meta.env.VITE_HUB_ANON_KEY as string | undefined;

let hubClient: SupabaseClient | null = null;

function getHubClient(): SupabaseClient | null {
  if (!HUB_URL || !HUB_KEY) return null;
  if (hubClient) return hubClient;
  hubClient = createClient(HUB_URL, HUB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 2 } },
  });
  return hubClient;
}

export type RevocationPayload = {
  subject_hash?: string;
  revoked_at?: string;
};

export function subscribeToHubRevocations(
  onRevocation: (payload: RevocationPayload) => void,
): () => void {
  const client = getHubClient();
  if (!client) return () => {};

  const channel = client.channel("session-revocations");
  channel
    .on("broadcast", { event: "revoked" }, (msg) => {
      const payload = (msg?.payload ?? {}) as RevocationPayload;
      onRevocation(payload);
    })
    .subscribe();

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}