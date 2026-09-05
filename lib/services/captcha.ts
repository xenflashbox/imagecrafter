/**
 * Cloudflare Turnstile verification for the preview gate's escalation layer.
 *
 * Only reached once the velocity signal has already flagged the caller, so this
 * is never in front of a normal visitor.
 *
 * Fail-closed throughout: a network error, a malformed response, or an
 * unverifiable token all return false. The caller refuses outright when no keys
 * are provisioned rather than treating "unconfigured" as "passed" — an
 * unconfigured captcha must never widen the gate it was added to narrow.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function captchaConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyCaptcha(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") form.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      console.error(`[captcha] Turnstile returned ${res.status}`);
      return false;
    }

    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.error(`[captcha] Token rejected: ${(data["error-codes"] || []).join(", ")}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[captcha] Verification failed:", err);
    return false;
  }
}
