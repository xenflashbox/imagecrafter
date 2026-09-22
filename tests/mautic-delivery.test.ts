import assert from "node:assert/strict";
import { test } from "node:test";
import type { MauticCapture } from "@prisma/client";
import { capturePayload, deliverMauticCapture, normalizeCaptureEmail } from "../lib/services/mautic-delivery";

function row(id: string, stage = "previewer", overrides: Partial<MauticCapture> = {}): MauticCapture {
  return { id, dedupeKey: stage === "buyer" ? `stripe:${id}` : "preview:qa@example.test",
    stage, email: "qa@example.test", name: null, status: "failed", contactId: null,
    attempts: 0, lastError: null, purchaseType: stage === "buyer" ? "digital" : null,
    subjectType: "pet", style: "royal", previewUrl: null, returnUrl: null, orderId: null,
    createdAt: new Date("2026-09-22T00:00:00Z"), updatedAt: new Date("2026-09-22T00:00:00Z"), ...overrides };
}

function fixture(rows: MauticCapture[]) {
  const records = new Map(rows.map(r => [r.id, r]));
  const queries: unknown[] = [];
  const model = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = records.get(where.id);
      return record ? { ...record } : null;
    },
    findFirst: async (query: { where: { email: { equals: string; mode: string }; stage: string } }) => {
      queries.push(query);
      return [...records.values()].filter(r => r.stage === query.where.stage && r.email.toLowerCase() === query.where.email.equals)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))[0] || null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const r = records.get(where.id)!;
      const { attempts, ...rest } = data;
      Object.assign(r, rest);
      if (attempts) r.attempts += (attempts as { increment: number }).increment;
      return r;
    },
    updateMany: async ({ where, data }: { where: { id: string; updatedAt: Date }; data: Record<string, unknown> }) => {
      const r = records.get(where.id)!;
      if (r.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      await model.update({ where, data });
      return { count: 1 };
    },
  };
  let tail = Promise.resolve();
  const db = { mauticCapture: model, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await fn({ mauticCapture: model, marketingConsent: { findUnique: async () => null }, $executeRaw: async () => 0 }); }
    finally { release(); }
  } } as unknown as Parameters<typeof deliverMauticCapture>[0];
  return { db, records, queries };
}

test("normalizes email and preserves original event time and field aliases", () => {
  assert.equal(normalizeCaptureEmail(" QA@Example.Test "), "qa@example.test");
  const payload = capturePayload(row("buyer", "buyer"));
  assert.equal(payload.customFields?.ic_purchase_type, "single");
  assert.equal(payload.customFields?.ic_subject, "pet");
  assert.equal(payload.customFields?.ic_purchased_at, "2026-09-22T00:00:00.000Z");
  assert.equal(capturePayload(row("preview")).customFields?.ic_purchased_at, undefined);
});

for (const buyerStatus of ["captured", "failed"]) {
  test(`buyer ${buyerStatus} suppresses a later preview and stale preview retry across email casing`, async () => {
    const f = fixture([row("preview"), row("buyer", "buyer", { email: "QA@EXAMPLE.TEST", status: buyerStatus })]);
    let sends = 0;
    const push = async () => { sends++; return { success: true as const, contactId: 7244 }; };
    assert.equal(await deliverMauticCapture(f.db, push, "preview"), "superseded");
    assert.equal(await deliverMauticCapture(f.db, push, "preview"), "skipped");
    assert.equal(sends, 0);
    assert.equal(f.records.get("preview")?.status, "superseded");
  });
}

test("preview then purchase then new preview ends as the same buyer contact", async () => {
  const f = fixture([row("preview")]);
  const stages: string[] = [];
  const push: Parameters<typeof deliverMauticCapture>[1] = async payload => {
    stages.push(payload.customFields!.ic_stage!);
    return { success: true, contactId: 7244 };
  };
  await deliverMauticCapture(f.db, push, "preview");
  f.records.set("buyer", row("buyer", "buyer"));
  await deliverMauticCapture(f.db, push, "buyer");
  f.records.get("preview")!.status = "failed";
  await deliverMauticCapture(f.db, push, "preview");
  assert.deepEqual(stages, ["previewer", "buyer"]);
  assert.equal(f.records.get("buyer")?.contactId, f.records.get("preview")?.contactId);
});

test("older buyer retry cannot overwrite a newer pack purchase", async () => {
  const f = fixture([row("old", "buyer"), row("new", "buyer", {
    createdAt: new Date("2026-09-22T01:00:00Z"), purchaseType: "pack", status: "captured",
  })]);
  assert.equal(await deliverMauticCapture(f.db, async () => { throw new Error("Must not send"); }, "old"), "superseded");
});

test("failed delivery remains retryable and keeps its original purchase timestamp", async () => {
  const f = fixture([row("buyer", "buyer")]);
  assert.equal(await deliverMauticCapture(f.db, async () => ({ success: false, error: "SMTP unrelated; API down" }), "buyer"), "failed");
  assert.equal(f.records.get("buyer")?.attempts, 1);
  await deliverMauticCapture(f.db, async payload => {
    assert.equal(payload.customFields?.ic_purchased_at, "2026-09-22T00:00:00.000Z");
    return { success: true, contactId: 7244 };
  }, "buyer");
  assert.equal(f.records.get("buyer")?.attempts, 2);
  assert.equal(f.records.get("buyer")?.lastError, null);
});

test("concurrent retry workers reload status under the lock and send once", async () => {
  const f = fixture([row("preview")]);
  let count = 0;
  const push = async () => { count++; return { success: true as const, contactId: 7244 }; };
  const first = deliverMauticCapture(f.db, push, "preview");
  const second = deliverMauticCapture(f.db, push, "preview");
  assert.deepEqual(await Promise.all([first, second]), ["captured", "skipped"]);
  assert.equal(count, 1);
});

test("buyer queued during a preview send is delivered after that preview", async () => {
  const f = fixture([row("preview")]);
  const stages: string[] = [];
  let buyerDelivery: Promise<unknown> | undefined;
  const push: Parameters<typeof deliverMauticCapture>[1] = async payload => {
    stages.push(payload.customFields!.ic_stage!);
    if (payload.customFields!.ic_stage === "previewer") {
      f.records.set("buyer", row("buyer", "buyer"));
      buyerDelivery = deliverMauticCapture(f.db, push, "buyer");
    }
    return { success: true, contactId: 7244 };
  };
  await deliverMauticCapture(f.db, push, "preview");
  await buyerDelivery;
  assert.deepEqual(stages, ["previewer", "buyer"]);
});

test("preview enrichment during a send stays pending until its own payload is sent", async () => {
  const f = fixture([row("preview")]);
  assert.equal(await deliverMauticCapture(f.db, async () => {
    Object.assign(f.records.get("preview")!, { previewUrl: "https://example.test/finished.png", updatedAt: new Date("2026-09-22T01:00:00Z") });
    return { success: true, contactId: 7244 };
  }, "preview"), "failed");
  assert.equal(f.records.get("preview")?.status, "failed");
  await deliverMauticCapture(f.db, async payload => {
    assert.equal(payload.customFields?.ic_preview_url, "https://example.test/finished.png");
    return { success: true, contactId: 7244 };
  }, "preview");
  assert.equal(f.records.get("preview")?.status, "captured");
});
