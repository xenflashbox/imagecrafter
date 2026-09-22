import assert from "node:assert/strict";
import { test } from "node:test";
import { hashReturnToken, newReturnToken, returnUrl, usableReturn, validReturnToken } from "../lib/services/portrait-return-token";

test("return secrets are random, hashed, and confined to the fragment", () => {
  const a = newReturnToken(), b = newReturnToken();
  assert.notEqual(a, b);
  assert(validReturnToken(a));
  assert(!validReturnToken("public-portrait-id"));
  assert.notEqual(hashReturnToken(a), a);
  assert.notEqual(hashReturnToken(a), hashReturnToken(b));
  const url = new URL(returnUrl("qa-portrait", a));
  assert.equal(url.search, "");
  assert(!url.pathname.includes(a));
  assert.equal(new URLSearchParams(url.hash.slice(1)).get("token"), a);
});

test("access is portrait scoped and fails closed for expiry, deletion and revocation", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const row = { portraitId: "qa-portrait", expiresAt: new Date("2026-09-29T12:00:00Z"), revokedAt: null };
  assert(usableReturn(row, "qa-portrait", now));
  assert(!usableReturn(row, "unrelated", now));
  assert(!usableReturn(null, "qa-portrait", now));
  assert(!usableReturn({ ...row, expiresAt: now }, "qa-portrait", now));
  assert(!usableReturn({ ...row, revokedAt: now }, "qa-portrait", now));
});
