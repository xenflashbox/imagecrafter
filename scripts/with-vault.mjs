#!/usr/bin/env node
/**
 * Run a command with the Infisical vault injected as environment variables.
 *
 *   node scripts/with-vault.mjs next dev
 *
 * Local dev and local builds need the same secrets Vercel holds, but writing
 * them to a .env is what put a live key for another merchant account in this
 * repo. So they are fetched and handed straight to the child process — they
 * never touch disk.
 *
 * Vercel does NOT use this: its build reads Vercel project environment
 * variables, and the vault is LAN-only. The `build` script stays vault-free
 * for that reason.
 */

import { spawn } from "node:child_process";

import { fetchVaultSecrets } from "./_infisical.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-vault.mjs <command> [args...]");
  process.exit(1);
}

const secrets = await fetchVaultSecrets();
console.error(`[with-vault] injected ${Object.keys(secrets).length} secrets`);

// An explicitly-set variable wins, so an isolated DATABASE_URL survives.
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...secrets, ...process.env },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
