// Stable-ish device fingerprint based on common browser attributes.
// Hashed with SHA-256 -> hex. Best-effort; falls back to "unknown".

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function computeDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const parts = [
    safe(() => navigator.userAgent, ""),
    safe(() => (navigator as any).platform ?? "", ""),
    safe(() => navigator.language ?? "", ""),
    safe(() => `${window.screen.width}x${window.screen.height}`, ""),
    safe(() => String(window.screen.colorDepth ?? ""), ""),
    safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "", ""),
  ];
  const raw = parts.join("|");
  try {
    const buf = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "unknown";
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}