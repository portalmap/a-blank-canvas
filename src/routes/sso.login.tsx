import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const HUB_BASE_URL = import.meta.env.VITE_HUB_BASE_URL as string | undefined;
const APP_SLUG = "map-flow";

/** Only allow internal relative paths; reject any absolute / cross-origin URL. */
function safeRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/"; // protocol-relative
  return raw;
}

function SsoLogin() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = safeRedirect(params.get("redirect"));
    try {
      sessionStorage.setItem("sso:redirect", redirect);
    } catch {
      /* ignore */
    }

    const callback = `${window.location.origin}/sso/callback`;
    if (!HUB_BASE_URL) {
      console.error("VITE_HUB_BASE_URL is not configured");
      return;
    }
    const url =
      `${HUB_BASE_URL.replace(/\/$/, "")}/sso/login` +
      `?app=${encodeURIComponent(APP_SLUG)}` +
      `&redirect=${encodeURIComponent(callback)}`;
    window.location.replace(url);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          Redirecionando para o login central…
        </p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/sso/login")({
  component: SsoLogin,
});