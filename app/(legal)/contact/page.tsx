import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact — ImageCrafter",
  description:
    "How to reach ImageCrafter about an order, a download, a refund, or a portrait you want taken down.",
  alternates: { canonical: `https://${LEGAL.site}/contact` },
};

export default function ContactPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Contact</h1>
      <p className="mb-10 text-sm text-ink-faint">
        {LEGAL.service} is operated by {LEGAL.operator}
      </p>

      <div className="legal-prose">
        <p>
          One address reaches us, and a person reads it:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
          answer within one business day.
        </p>

        <h2>Include this and it gets solved faster</h2>
        <ul>
          <li>
            <strong>Order problems</strong> — your order number, from the
            confirmation email.
          </li>
          <li>
            <strong>Download trouble</strong> — the email address you bought
            with. Links last 72 hours and allow five downloads; if yours has
            lapsed we will reissue it.
          </li>
          <li>
            <strong>A damaged or wrong print</strong> — a photograph of what
            arrived.
          </li>
          <li>
            <strong>A portrait you want removed from the gallery</strong> — the
            email you generated it with. We take it down, no questions.
          </li>
          <li>
            <strong>Privacy and deletion requests</strong> — say what you want
            and we will do it. See the{" "}
            <Link href="/privacy">privacy policy</Link>.
          </li>
        </ul>

        {LEGAL.postalAddress.length > 0 && (
          <>
            <h2>Postal address</h2>
            <p>
              {LEGAL.operator}
              {LEGAL.postalAddress.map((line) => (
                <span key={line}>
                  <br />
                  {line}
                </span>
              ))}
            </p>
          </>
        )}

        <h2>What we cannot help with</h2>
        <p>
          We cannot recover a photo you uploaded and then deleted, and we cannot
          undo a purchase once the file has been downloaded — see the{" "}
          <Link href="/refunds">refund policy</Link> for where we can. We do not
          take generation requests by email; the{" "}
          <Link href="/portraits/create">portrait tool</Link> is the only way in.
        </p>

        <h2>Press and partnerships</h2>
        <p>
          Same address. Put &ldquo;press&rdquo; or &ldquo;partnership&rdquo; in
          the subject line and it gets routed.
        </p>
      </div>
    </article>
  );
}
