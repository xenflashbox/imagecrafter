import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Support — ImageCrafter",
  description:
    "Answers to the things that actually go wrong: download links, print problems, refunds, credits, and getting a portrait taken down.",
  alternates: { canonical: `https://${LEGAL.site}/support` },
};

export default function SupportPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Support</h1>
      <p className="mb-10 text-sm text-ink-faint">
        {LEGAL.service}, operated by {LEGAL.operator}
      </p>

      <div className="legal-prose">
        <p>
          One address reaches us and a person reads it:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
          answer within one business day. Most of what goes wrong is on this
          page, so it is worth thirty seconds before you write.
        </p>

        <h2>My download link expired</h2>
        <p>
          Links last 72 hours and allow five downloads. That is deliberate — a
          link in an inbox is a link anyone who reaches that inbox can use.
          Email us from the address you bought with and we will reissue it. This
          is not a refund matter and we do not charge for it.
        </p>

        <h2>I never got the email</h2>
        <p>
          Check spam first, then check the address on your receipt — a typo at
          checkout is the usual cause. Email us the order number from your
          Stripe receipt and we will resend to the right address.
        </p>

        <h2>My print arrived damaged, wrong, or not at all</h2>
        <p>
          Send a photograph of what arrived within <strong>30 days</strong> of
          delivery and we will fix it, usually by reprinting. Prints normally
          take 5&ndash;10 business days; if yours is well past that, tell us and
          we will chase the printer or reprint it. Details are in the{" "}
          <Link href="/refunds">refund policy</Link>.
        </p>

        <h2>The portrait doesn&rsquo;t look like the person</h2>
        <p>
          You see the portrait at full size before you pay, so nothing arrives
          as a surprise. If you have not bought yet, try another photo: a
          straight-on, well-lit face with no sunglasses and no heavy shadow does
          far better than a group shot or a profile. If a paid generation
          failed, we re-run it at no cost, and refund it if it fails again.
        </p>

        <h2>I want a refund</h2>
        <p>
          Email the order number and what went wrong. The short version: we
          refund files that never arrived, files that are not what you
          previewed, duplicate charges, damaged or wrong prints, and unused
          credits within 14 days. We do not refund a delivered file because you
          changed your mind about a portrait you had already seen. The{" "}
          <Link href="/refunds">full policy</Link> has the rest.
        </p>
        <p>
          Please write to us before disputing a charge with your bank. We can
          almost always fix the underlying problem faster than a dispute can.
        </p>

        <h2>Credits</h2>
        <p>
          Credits do not expire and have no cash value. Unused credits are
          refundable within 14 days of purchase; once a credit has been spent on
          a generation we have already paid for that rendering, so it is not
          refundable.
        </p>

        <h2>Take my portrait out of the gallery</h2>
        <p>
          Email us from the address you generated it with and it comes down, no
          questions asked. Buying a portrait also ends the gallery licence
          automatically. We never publish your original photograph, your name or
          your email address — see the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>

        <h2>Delete my data</h2>
        <p>
          <Link href="/data-deletion">Data Deletion</Link> explains exactly what
          gets removed and how to ask. If you asked through Facebook, you can{" "}
          <Link href="/data-deletion-status">check the status</Link> with the
          confirmation code it gave you.
        </p>

        <h2>Still stuck</h2>
        <p>
          Write to{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> with
          your order number and what you were trying to do. Postal address and
          press enquiries are on the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </article>
  );
}
