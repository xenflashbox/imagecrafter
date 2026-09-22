import { createHash, randomBytes } from "node:crypto";

export const RETURN_COOKIE = "ic_portrait_access";
export const RETURN_SECONDS = 7 * 24 * 60 * 60;
export const validReturnToken = (token: string) => /^[a-f0-9]{64}$/.test(token);
export const hashReturnToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newReturnToken = () => randomBytes(32).toString("hex");
export function returnUrl(portraitId: string, token: string) {
  return `https://imagecrafter.app/api/portraits/return#${new URLSearchParams({ id: portraitId, token })}`;
}
export function usableReturn(row: { portraitId: string; expiresAt: Date; revokedAt: Date | null } | null,
  portraitId: string, now = new Date()) {
  return !!row && row.portraitId === portraitId && !row.revokedAt && row.expiresAt > now;
}
