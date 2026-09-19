#!/usr/bin/env node
/**
 * Fetch ImageCrafter's secrets from Infisical.
 *
 * Secrets are not kept in this repo. A .env full of keys goes stale the moment
 * it is written, and one of ours ended up on a public GitHub for nine months.
 * So the vault is the only source: tooling authenticates with a machine
 * identity and holds the values in memory for the life of the process.
 *
 * Used two ways:
 *   import { fetchVaultSecrets } from "./_infisical.mjs"
 *   node scripts/_infisical.mjs            # prints JSON, for sync callers
 *
 * Bootstrap creds come from the environment, or from the INFRISCAL_* lines of
 * .env — the only thing that file is allowed to contain. Needs VPN/Tailscale
 * access to the xenco LAN.
 */
import { readFileSync } from "node:fs";

const API = process.env.INFISICAL_API_URL || "http://10.8.8.18:8085";
const PROJECT_SLUG =
  process.env.INFISICAL_PROJECT_SLUG || "imagecrafter-production-67f-a";
const ENVIRONMENT = process.env.INFISICAL_ENVIRONMENT || "prod";

function bootstrapCreds() {
  const fromEnv = (k) => process.env[`INFRISCAL_${k}`] || process.env[`INFISICAL_${k}`];
  let clientId = fromEnv("CLIENT_ID");
  let clientSecret = fromEnv("CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    let text = "";
    try {
      text = readFileSync(".env", "utf8");
    } catch {
      // handled by the throw below
    }
    const get = (k) =>
      text
        .match(new RegExp(`^(?:INFRISCAL|INFISICAL)_${k}=(.*)$`, "m"))?.[1]
        .trim()
        .replace(/^["']|["']$/g, "");
    clientId ||= get("CLIENT_ID");
    clientSecret ||= get("CLIENT_SECRET");
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      "No Infisical bootstrap credentials. Set INFRISCAL_CLIENT_ID and " +
        "INFRISCAL_CLIENT_SECRET in the environment or in .env — see .env.example."
    );
  }
  return { clientId, clientSecret };
}

async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Infisical at ${API} (${err.message}). The vault is LAN-only — ` +
        "connect to the VPN or Tailscale."
    );
  }
  if (!res.ok) {
    throw new Error(
      `Infisical ${opts.method || "GET"} ${path} → HTTP ${res.status}: ${(
        await res.text()
      ).slice(0, 300)}`
    );
  }
  return res.json();
}

export async function fetchVaultSecrets() {
  const { clientId, clientSecret } = bootstrapCreds();

  const { accessToken } = await api("/api/v1/auth/universal-auth/login", {
    method: "POST",
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const auth = { Authorization: `Bearer ${accessToken}` };

  // The secrets API rejects the project slug and needs the workspace UUID, so
  // resolve it rather than hardcoding one — and enumerating also proves which
  // identity is actually in play when a project appears to be "missing".
  const { workspaces } = await api("/api/v1/workspace", { headers: auth });
  const workspace = workspaces.find((w) => w.slug === PROJECT_SLUG);
  if (!workspace) {
    throw new Error(
      `This identity (client ${clientId.slice(0, 8)}…) cannot see project ` +
        `${PROJECT_SLUG}. It can see: ${workspaces.map((w) => w.slug).join(", ")}`
    );
  }

  const { secrets } = await api(
    `/api/v3/secrets/raw?workspaceId=${workspace.id}&environment=${ENVIRONMENT}&secretPath=/`,
    { headers: auth }
  );
  return Object.fromEntries(secrets.map((s) => [s.secretKey, s.secretValue]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Piping secrets to a terminal is how they end up pasted into a chat log.
  if (process.stdout.isTTY) {
    console.error(
      "Refusing to print secrets to a terminal. This mode exists for programs " +
        "that capture stdout; import fetchVaultSecrets() instead."
    );
    process.exit(1);
  }
  fetchVaultSecrets()
    .then((secrets) => process.stdout.write(JSON.stringify(secrets)))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
