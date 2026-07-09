import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { computeDeviceFingerprint } from "@/lib/deviceFingerprint";

function safeRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function SsoCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isStaleCode, setIsStaleCode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Helper: read stored redirect target once.
      const readRedirect = (): string => {
        try {
          const target = safeRedirect(sessionStorage.getItem("sso:redirect"));
          sessionStorage.removeItem("sso:redirect");
          return target;
        } catch {
          return "/";
        }
      };

      // 1. If a Supabase session already exists (e.g. user refreshed the
      //    callback URL after a successful login), skip the exchange.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionData?.session) {
          try {
            window.history.replaceState({}, "", "/sso/callback");
          } catch {
            /* ignore */
          }
          navigate(readRedirect(), { replace: true });
          return;
        }
      } catch {
        /* fall through to code exchange */
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) {
        setError("Código de autorização ausente.");
        return;
      }

      const fingerprint = await computeDeviceFingerprint();
      const { data, error: fnErr } = await supabase.functions.invoke(
        "sso-exchange",
        { body: { code, fingerprint } },
      );
      if (cancelled) return;

      // 2. Consume the code from the URL exactly once — regardless of the
      //    outcome — so an accidental F5 does not retry with a stale code.
      try {
        window.history.replaceState({}, "", "/sso/callback");
      } catch {
        /* ignore */
      }

      if (fnErr || !data?.email || !data?.token_hash) {
        const rawMsg =
          (fnErr as any)?.message ??
            (data as any)?.error ??
            "Falha ao validar a sessão com o Hub.";
        // Hub returns 401 when the code was already used or expired. The
        // edge function surfaces that as "Hub rejected code (401)".
        const stale =
          /rejected code \(401\)/i.test(String(rawMsg)) ||
          /invalid_grant/i.test(String(rawMsg)) ||
          (fnErr as any)?.context?.status === 401;
        if (stale) {
          setIsStaleCode(true);
          setError(
            "Este código de login já foi utilizado ou expirou. Gere um novo login.",
          );
        } else {
          setError(rawMsg);
        }
        return;
      }

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: data.token_hash,
      });
      if (cancelled) return;
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }

      navigate(readRedirect(), { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {error ? (
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold">Não foi possível entrar</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            className="text-sm underline"
            onClick={() => navigate("/sso/login", { replace: true })}
          >
            {isStaleCode ? "Fazer login novamente" : "Tentar novamente"}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">
            Validando sua sessão…
          </p>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/sso/callback")({
  component: SsoCallback,
});