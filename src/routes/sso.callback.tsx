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

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      if (fnErr || !data?.email || !data?.token_hash) {
        setError(
          (fnErr as any)?.message ??
            (data as any)?.error ??
            "Falha ao validar a sessão com o Hub.",
        );
        return;
      }

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token_hash,
        type: "magiclink",
      });
      if (cancelled) return;
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }

      let target = "/";
      try {
        target = safeRedirect(sessionStorage.getItem("sso:redirect"));
        sessionStorage.removeItem("sso:redirect");
      } catch {
        /* ignore */
      }
      navigate(target, { replace: true });
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
            onClick={() => navigate("/sso/login")}
          >
            Tentar novamente
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