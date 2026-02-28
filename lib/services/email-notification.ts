/**
 * Email Notification Service
 *
 * Sends transactional emails via Brevo SMTP (nodemailer).
 *
 * DUAL-FLOW:
 * - Guest: email collected at Stripe Checkout
 * - Subscriber: email from Clerk user record
 *
 * Both flows use the same email functions — callers pass email/name.
 */

import nodemailer from "nodemailer";

// =============================================================================
// SMTP TRANSPORT
// =============================================================================

const transport = nodemailer.createTransport({
  host: process.env.SMTP_SERVER || "smtp-relay.brevo.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // STARTTLS
  auth: {
    user: process.env.LOGIN || process.env.SMTP_USER || "",
    pass: process.env.BREVO_PAYLOAD_SMTP_API_KEY || process.env.SMTP_PASS || "",
  },
});

const EMAIL_FROM =
  process.env.EMAIL_FROM || "ImageCrafter <hello@imagecrafter.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#db2777);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🎨 ImageCrafter
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Portrait Studio</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} ImageCrafter · 
                <a href="${APP_URL}" style="color:#6d28d9;text-decoration:none;">imagecrafter.app</a>
              </p>
              <p style="margin:8px 0 0;color:#d1d5db;font-size:11px;">
                If you didn't make this purchase, please contact us immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// PURCHASE CONFIRMATION + DOWNLOAD LINK
// =============================================================================

export interface DigitalPurchaseEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  downloadUrl: string;
  downloadExpiresHours: number;
  maxDownloads: number;
  stylePackName: string;
  styleVariantName: string;
  previewImageUrl?: string;
  amount: number; // in cents
  currency: string;
}

export async function sendDigitalPurchaseEmail(
  params: DigitalPurchaseEmailParams
): Promise<void> {
  const {
    to, name, orderRef, downloadUrl, downloadExpiresHours,
    maxDownloads, stylePackName, styleVariantName, previewImageUrl,
    amount, currency,
  } = params;

  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const expiryDate = new Date(Date.now() + downloadExpiresHours * 3600 * 1000);
  const expiryStr = expiryDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your portrait is ready! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Thank you for your purchase. Your high-resolution portrait is ready to download.
    </p>

    ${previewImageUrl ? `
    <div style="text-align:center;margin-bottom:24px;border-radius:8px;overflow:hidden;">
      <img src="${previewImageUrl}" alt="Your portrait" style="max-width:100%;border-radius:8px;" />
    </div>` : ""}

    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your portrait</p>
      <p style="margin:0;color:#111827;font-size:15px;font-weight:500;">${stylePackName} — ${styleVariantName}</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${downloadUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#db2777);color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;">
        ⬇️ Download Your Portrait
      </a>
    </div>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⏰ <strong>Link expires:</strong> ${expiryStr}<br/>
        ⬇️ <strong>Download limit:</strong> ${maxDownloads} times
      </p>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:4px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}<br/>
        <strong>Amount charged:</strong> ${amountFormatted}
      </p>
    </div>

    <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
      Having trouble with the download button? Copy and paste this link into your browser:<br/>
      <span style="color:#6d28d9;word-break:break-all;font-size:12px;">${downloadUrl}</span>
    </p>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Your portrait is ready to download — ImageCrafter`,
    html: baseLayout("Your Portrait Download", body),
  });
}

// =============================================================================
// PRINT ORDER CONFIRMATION
// =============================================================================

export interface PrintPurchaseEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  stylePackName: string;
  styleVariantName: string;
  printSize: string;
  amount: number;
  currency: string;
  shippingName: string;
  shippingAddress: string;
  previewImageUrl?: string;
}

export async function sendPrintPurchaseEmail(
  params: PrintPurchaseEmailParams
): Promise<void> {
  const {
    to, name, orderRef, stylePackName, styleVariantName,
    printSize, amount, currency, shippingName, shippingAddress, previewImageUrl,
  } = params;

  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Print order confirmed! 🖼️</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Your museum-quality print is on its way to production. We'll email you tracking info when it ships.
    </p>

    ${previewImageUrl ? `
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${previewImageUrl}" alt="Your portrait" style="max-width:100%;border-radius:8px;" />
    </div>` : ""}

    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your order</p>
      <p style="margin:0 0 4px;color:#111827;font-size:15px;font-weight:500;">${stylePackName} — ${styleVariantName}</p>
      <p style="margin:0;color:#6b7280;font-size:14px;">Print size: ${printSize}</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#14532d;">
        📦 <strong>Shipping to:</strong><br/>
        ${shippingName}<br/>
        ${shippingAddress}
      </p>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}<br/>
        <strong>Amount charged:</strong> ${amountFormatted}<br/>
        <strong>Estimated delivery:</strong> 5–10 business days
      </p>
    </div>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Print order confirmed — ImageCrafter`,
    html: baseLayout("Print Order Confirmed", body),
  });
}

// =============================================================================
// TRACKING UPDATE (Phase 4 — called from Prodigi webhook)
// =============================================================================

export interface ShippingUpdateEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
}

export async function sendShippingUpdateEmail(
  params: ShippingUpdateEmailParams
): Promise<void> {
  const { to, name, orderRef, trackingNumber, trackingUrl, carrier } = params;

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your print is on its way! 📦</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Your museum-quality portrait print has shipped.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${trackingUrl}"
         style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;">
        📦 Track Your Package
      </a>
    </div>

    <p style="text-align:center;color:#6b7280;font-size:13px;margin-top:8px;">
      Carrier: ${carrier} · Tracking #: ${trackingNumber}
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}
      </p>
    </div>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Your portrait print is on the way — ImageCrafter`,
    html: baseLayout("Your Print Has Shipped", body),
  });
}

// =============================================================================
// DOWNLOAD LINK REMINDER (sent 48 hrs before expiry)
// =============================================================================

export interface DownloadReminderEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  downloadUrl: string;
  expiresAt: Date;
  maxDownloads: number;
  downloadsUsed: number;
}

export async function sendDownloadReminderEmail(
  params: DownloadReminderEmailParams
): Promise<void> {
  const { to, name, orderRef, downloadUrl, expiresAt, maxDownloads, downloadsUsed } = params;

  const expiryStr = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const downloadsLeft = maxDownloads - downloadsUsed;

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">⏰ Your download link expires soon</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Your portrait download link will expire in <strong>48 hours</strong>. Make sure to save your file before it expires.
    </p>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⏰ <strong>Expires:</strong> ${expiryStr}<br/>
        ⬇️ <strong>Downloads remaining:</strong> ${downloadsLeft} of ${maxDownloads}
      </p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${downloadUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#db2777);color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;">
        ⬇️ Download Your Portrait Now
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;">
      After the link expires, it cannot be recovered. If you need help, reply to this email with your order reference.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:4px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}
      </p>
    </div>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `⏰ Your portrait download expires in 48 hours — ImageCrafter`,
    html: baseLayout("Download Expiry Reminder", body),
  });
}

// =============================================================================
// GENERATION FAILED (auto-refund notification)
// =============================================================================

export interface GenerationFailedEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  stylePackName: string;
  styleVariantName: string;
  refundAmount: number;
  currency: string;
}

export async function sendGenerationFailedEmail(
  params: GenerationFailedEmailParams
): Promise<void> {
  const { to, name, orderRef, stylePackName, styleVariantName, refundAmount, currency } = params;

  const refundFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(refundAmount / 100);

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">We're sorry — portrait generation failed</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Unfortunately, we were unable to generate your portrait. This is a rare technical issue on our end,
      and we sincerely apologize for the inconvenience.
    </p>

    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Failed order</p>
      <p style="margin:0;color:#111827;font-size:15px;font-weight:500;">${stylePackName} — ${styleVariantName}</p>
    </div>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">
        ✅ Automatic refund issued: ${refundFormatted}
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#b91c1c;">
        Your refund has been automatically processed and will appear on your statement within 5–10 business days.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/portraits"
         style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#db2777);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
        🎨 Try Again — Portrait Studio
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;">
      We've been notified of this failure and our team is investigating. If you try again and experience the same
      issue, please reply to this email and we'll assist you directly.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:4px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}
      </p>
    </div>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `We're sorry — automatic refund issued for order ${orderRef}`,
    html: baseLayout("Portrait Generation Failed", body),
  });
}

// =============================================================================
// DELIVERY CONFIRMATION (print delivered)
// =============================================================================

export interface DeliveryConfirmationEmailParams {
  to: string;
  name?: string;
  orderRef: string;
  stylePackName: string;
  styleVariantName: string;
  previewImageUrl?: string;
}

export async function sendDeliveryConfirmationEmail(
  params: DeliveryConfirmationEmailParams
): Promise<void> {
  const { to, name, orderRef, stylePackName, styleVariantName, previewImageUrl } = params;

  const body = `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your portrait print has arrived! 🎉</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
      Hi ${name ? name : "there"},<br/>
      Great news! Your museum-quality portrait print has been delivered. We hope you love it!
    </p>

    ${previewImageUrl ? `
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${previewImageUrl}" alt="Your portrait" style="max-width:100%;border-radius:8px;" />
    </div>` : ""}

    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Delivered</p>
      <p style="margin:0;color:#111827;font-size:15px;font-weight:500;">${stylePackName} — ${styleVariantName}</p>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#14532d;">
        ✅ Your print has been delivered successfully.
      </p>
    </div>

    <p style="color:#6b7280;font-size:15px;margin-bottom:20px;">
      <strong>Loving your portrait?</strong> Share it with friends and family — 
      tag us on social with <strong>#ImageCrafter</strong> and we may feature your art!
    </p>

    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <a href="https://twitter.com/intent/tweet?text=Just+received+my+AI+portrait+from+%40ImageCrafter+%F0%9F%8E%A8+%23ImageCrafter&url=${encodeURIComponent(APP_URL)}"
         target="_blank"
         style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;">
        Share on Twitter
      </a>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/portraits"
         style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#db2777);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;">
        🎨 Create Another Portrait
      </a>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:4px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;">
        <strong>Order reference:</strong> ${orderRef}
      </p>
    </div>
  `;

  await transport.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `Your portrait print has arrived! 🎉 — ImageCrafter`,
    html: baseLayout("Print Delivered", body),
  });
}
