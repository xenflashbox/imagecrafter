import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import net from "net";
import nodemailer from "nodemailer";

/**
 * SMTP reachability probe for the production runtime.
 *
 * Vercel runtime logs are unreachable with the available API token and both
 * SMTP secrets are stored `sensitive` (unreadable via the API), so a send that
 * fails inside a webhook leaves no trace anywhere. This returns the error the
 * runtime actually saw, plus digests of the credentials it actually holds —
 * enough to tell a wrong secret apart from blocked egress without printing
 * either secret.
 *
 * GET /api/health/smtp        — env digests, raw TCP dial, transport verify
 * GET /api/health/smtp?send=1 — additionally attempt a real message
 * Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";

function digest(value: string | undefined) {
  if (!value) return { present: false };
  return {
    present: true,
    length: value.length,
    sha256: crypto.createHash("sha256").update(value).digest("hex").slice(0, 12),
    quoted: value.startsWith('"') || value.startsWith("'"),
    whitespace: value !== value.trim(),
  };
}

function describe(err: unknown) {
  const e = err as Record<string, unknown>;
  return {
    name: e?.name,
    message: e?.message,
    code: e?.code,
    command: e?.command,
    responseCode: e?.responseCode,
    response: e?.response,
    errno: e?.errno,
    syscall: e?.syscall,
  };
}

function dial(host: string, port: number, timeoutMs: number) {
  return new Promise<Record<string, unknown>>((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    const done = (result: Record<string, unknown>) => {
      socket.destroy();
      resolve({ ...result, ms: Date.now() - started });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done({ connected: true }));
    socket.once("timeout", () => done({ connected: false, reason: "timeout" }));
    socket.once("error", (err) =>
      done({ connected: false, reason: describe(err) })
    );
    socket.connect(port, host);
  });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("Authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.SMTP_SERVER || "smtp-relay.brevo.com";
  const port = parseInt(process.env.SMTP_PORT || "587");

  const result: Record<string, unknown> = {
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    host,
    port,
    env: {
      SMTP_LOGIN: digest(process.env.SMTP_LOGIN),
      BREVO_SMTP_API_KEY: digest(process.env.BREVO_SMTP_API_KEY),
      EMAIL_FROM: digest(process.env.EMAIL_FROM),
      SMTP_SERVER: digest(process.env.SMTP_SERVER),
      SMTP_PORT: digest(process.env.SMTP_PORT),
    },
  };

  result.tcp = await dial(host, port, 10_000);

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user: process.env.SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_API_KEY,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const verifyStarted = Date.now();
  try {
    await transport.verify();
    result.verify = { ok: true, ms: Date.now() - verifyStarted };
  } catch (err) {
    result.verify = {
      ok: false,
      ms: Date.now() - verifyStarted,
      error: describe(err),
    };
  }

  const to = request.nextUrl.searchParams.get("send");
  if (to) {
    const sendStarted = Date.now();
    try {
      const info = await transport.sendMail({
        from: process.env.EMAIL_FROM || "ImageCrafter <hello@imagecrafter.app>",
        to,
        subject: "ImageCrafter SMTP probe (production runtime)",
        text: `Sent from deployment ${process.env.VERCEL_DEPLOYMENT_ID} at ${new Date().toISOString()}.`,
      });
      result.send = {
        ok: true,
        ms: Date.now() - sendStarted,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (err) {
      result.send = {
        ok: false,
        ms: Date.now() - sendStarted,
        error: describe(err),
      };
    }
  }

  return NextResponse.json(result);
}
