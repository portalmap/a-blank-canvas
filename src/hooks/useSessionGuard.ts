import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeDeviceFingerprint } from "@/lib/deviceFingerprint";

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Runs session-guard immediately when a session exists, then every 30 min.
 * On action="logout", signs the user out and redirects to /sso/login.
 * All Hub/edge errors are treated as "continue" (fail-open).
 */
export function useSessionGuard(
  isAuthenticated: boolean,
  onLogout: (reason: string) => void,
) {
  const runningRef = useRef(false);
  const cbRef = useRef(onLogout);
  cbRef.current = onLogout;

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        const fingerprint = await computeDeviceFingerprint();
        const { data, error } = await supabase.functions.invoke(
          "session-guard",
          { body: { fingerprint } },
        );
        if (cancelled) return;
        if (error) return; // fail-open
        const action = (data as any)?.action;
        const reason = (data as any)?.reason ?? "unknown";
        if (action === "logout") {
          cbRef.current(reason);
        }
      } catch {
        /* fail-open */
      } finally {
        runningRef.current = false;
      }
    };

    void run();
    const id = setInterval(run, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated]);
}