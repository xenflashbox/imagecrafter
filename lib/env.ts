/**
 * Centralized env-var accessors.
 *
 * Prefer these over reading process.env directly with silent || fallbacks —
 * fallbacks to dead/wrong hosts caused the 2026-06-25 ResumeCoach outage.
 * Failing loud at first call surfaces config gaps in seconds, not days.
 */

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} env var is required but not set. ` +
        `Set it in your Vercel project (or .env for local dev) before retrying.`
    );
  }
  return v;
}

export const getAiGatewayUrl = (): string => requireEnv("AI_GATEWAY_URL");

export const getMauticApiUrl = (): string => requireEnv("MAUTIC_API_URL");
