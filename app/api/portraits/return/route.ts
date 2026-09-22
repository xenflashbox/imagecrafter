import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allowRecoveryRequest, issuePortraitReturn } from "@/lib/services/portrait-return";
import { hashReturnToken, RETURN_COOKIE, RETURN_SECONDS, returnUrl, usableReturn, validReturnToken } from "@/lib/services/portrait-return-token";
import { capturePreviewer, pushContact } from "@/lib/services/mautic";
import { deliverMauticCapture } from "@/lib/services/mautic-delivery";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };

// Standalone response intentionally bypasses the site layout and its analytics.
export async function GET() {
  const nonce = randomBytes(18).toString("base64");
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to your portrait | ImageCrafter</title><style>body{font:17px/1.6 Arial,sans-serif;color:#1c1714;background:#faf7f2;margin:0}main{max-width:480px;margin:48px auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;font:inherit}button{background:#a4442a;color:white;border:0;border-radius:6px;cursor:pointer}a{color:#a4442a}label{display:block}#recover{margin-top:32px}</style></head><body><main><h1>ImageCrafter</h1><h2>Your saved portrait</h2><p id="message">Open your preview on this device. Nothing will be purchased.</p><button id="open">Open my portrait</button><form id="recover"><h3>Need a new link?</h3><label>Portrait reference<input id="portrait" required autocomplete="off"></label><label>Email used for this preview<input id="email" type="email" required autocomplete="email"></label><button>Send a new link</button></form><p><a href="/contact">Contact support</a> &middot; <a href="/privacy">Privacy</a></p></main><script nonce="${nonce}">
const params=new URLSearchParams(location.hash.slice(1));const token=params.get('token')||'';const id=params.get('id')||'';history.replaceState(null,'',location.pathname);document.querySelector('#portrait').value=id;const message=document.querySelector('#message');const open=document.querySelector('#open');open.disabled=!token;
async function post(body){const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to continue. Please try again.');return data;}
open.onclick=async()=>{open.disabled=true;try{const d=await post({action:'confirm',id,token});location.replace(d.path);}catch(e){message.textContent=e.message;}};
document.querySelector('#recover').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const d=await post({action:'recover',id:document.querySelector('#portrait').value,email:document.querySelector('#email').value});message.textContent=d.message;}catch(e){message.textContent=e.message;}finally{button.disabled=false;}};
</script></body></html>`, { headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` } });
}

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), id: z.string().min(1).max(80), token: z.string().length(64) }),
  z.object({ action: z.literal("recover"), id: z.string().min(1).max(80), email: z.string().trim().email().max(254) }),
]);

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Please open the link in your browser." }, { status: 403, headers: privateHeaders });
  }
  const data = input.safeParse(await request.json().catch(() => null));
  if (!data.success) return NextResponse.json({ error: "Check your link or portrait reference." }, { status: 400, headers: privateHeaders });
  const body = data.data;
  if (body.action === "recover") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!await allowRecoveryRequest(ip)) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: privateHeaders });
    const email = body.email.toLowerCase();
    const old = await prisma.portraitReturn.findUnique({ where: { portraitId_email: { portraitId: body.id, email } }, include: { portrait: { select: { status: true } } } });
    if (old && !old.revokedAt && old.portrait.status === "preview") {
      try { await issuePortraitReturn(body.id, email, old.marketingRequested); }
      catch (error) { console.error("[portrait-return] Recovery notification failed", error); }
    }
    return NextResponse.json({ message: "If those details match an available preview, a new link will arrive by email. For a purchased or removed portrait, contact support." }, { headers: privateHeaders });
  }
  const row = validReturnToken(body.token) ? await prisma.portraitReturn.findUnique({ where: { tokenHash: hashReturnToken(body.token) }, include: { portrait: true } }) : null;
  if (!usableReturn(row, body.id) || !row || !["preview", "purchased"].includes(row.portrait.status)) {
    return NextResponse.json({ error: "This link has expired or is no longer available. Request a new link below, or contact support." }, { status: 410, headers: privateHeaders });
  }
  await prisma.$transaction(async tx => {
    await tx.portraitReturn.update({ where: { id: row.id }, data: { verifiedAt: row.verifiedAt ?? new Date() } });
    if (row.marketingRequested && !row.verifiedAt) {
      await tx.marketingConsent.upsert({ where: { email: row.email },
        create: { email: row.email, granted: true, confirmedAt: new Date(), source: "preview-optional-checkbox-v1-email-confirmed" }, update: {},
      });
    }
  });
  await capturePreviewer({ email: row.email, subjectType: row.portrait.subjectType, style: row.portrait.stylePackSlug,
    previewUrl: row.portrait.previewImageUrl, returnUrl: returnUrl(body.id, body.token) });
  // Confirmation may happen after checkout; refresh consent without replaying payment.
  const buyer = await prisma.mauticCapture.findFirst({ where: { email: { equals: row.email, mode: "insensitive" }, stage: "buyer" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  if (buyer) {
    await prisma.mauticCapture.update({ where: { id: buyer.id }, data: { status: "failed" } });
    try { await deliverMauticCapture(prisma, pushContact, buyer.id); }
    catch (error) { console.error("[portrait-return] Buyer consent refresh retained for retry", error); }
  }
  const response = NextResponse.json({ path: `/portraits/${encodeURIComponent(body.id)}/preview` }, { headers: privateHeaders });
  response.cookies.set(RETURN_COOKIE, body.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.min(RETURN_SECONDS, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000)) });
  return response;
}
