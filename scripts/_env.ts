/**
 * Load ImageCrafter's secrets from the Infisical vault into process.env.
 *
 * Every script used to parse a local .env. That file drifts the moment it is
 * written, and a real key once rode it into a public repo — so the vault is now
 * the only source, and the only thing .env may hold is the credentials that
 * open it.
 *
 * Synchronous because callers load env at module scope, before anything they
 * import can touch a database. Shelling out is what makes an async fetch
 * available to sync code.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";

export function vaultSecrets(): Record<string, string> {
  const script = path.resolve(__dirname, "_infisical.mjs");
  const raw = execFileSync(process.execPath, [script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(raw);
}

/** Inject the vault into process.env, never overriding what the caller set. */
export function loadVaultEnv(): Record<string, string> {
  const secrets = vaultSecrets();
  for (const [key, value] of Object.entries(secrets)) {
    if (!(key in process.env)) process.env[key] = value;
  }
  return secrets;
}
