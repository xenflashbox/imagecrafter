import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions — ImageCrafter",
  description:
    "The terms you agree to when you use ImageCrafter, including how free previews may be displayed and what you own when you buy.",
  alternates: { canonical: `https://${LEGAL.site}/terms` },
};

export default function TermsPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">
        Terms &amp; Conditions
      </h1>
      <p className="mb-10 text-sm text-ink-faint">
        Effective {LEGAL.effective}
      </p>

      <div className="legal-prose">
        <p>
          These terms are the agreement between you and {LEGAL.operator} (“we”,
          “us”), who operate {LEGAL.service} at {LEGAL.site}. By uploading a
          photo or buying a portrait you accept them. If you do not accept them,
          do not use the service.
        </p>

        <h2>What ImageCrafter does</h2>
        <p>
          You upload one photograph. We generate a painted portrait from it and
          show it to you. If you like it, you can buy the full-resolution file
          or order a printed copy. Generation is automated and its output
          varies; we do not promise any particular likeness, style or result.
        </p>

        <h2>The photo you upload</h2>
        <p>
          You must have the right to upload the photo. By uploading it you tell
          us that you own it or have permission to use it, and that any
          identifiable person in it has agreed to appear in a portrait made from
          it. Do not upload photos of other people without their agreement, and
          do not upload photos of children who are not in your care.
        </p>
        <p>
          You keep ownership of your photo. We do not sell it, and we do not use
          it to train models.
        </p>

        <h2>Free previews</h2>
        <p>
          Generating a preview is free, and we pay the rendering cost every
          time. In exchange, you grant {LEGAL.operator} a non-exclusive,
          royalty-free, worldwide licence to display, reproduce and promote
          portraits you generate but <strong>do not purchase</strong> — in our
          public gallery, on this website, and in our marketing — with no
          attribution and no payment to you.
        </p>
        <p>
          <strong>Buying the portrait ends that licence.</strong> When you
          purchase a portrait it becomes private: we remove it from the public
          gallery and stop using it to promote the service. Paying is how you
          buy privacy; free is public.
        </p>
        <p>
          Two limits we hold ourselves to. We only publish what we have chosen
          by hand — nothing appears automatically. And we never publish your
          original photograph, your name, or your email address; only the
          generated portrait.
        </p>
        <p>
          If you would rather a free preview never appeared, email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> and
          we will take it down.
        </p>

        <h2>What you get when you buy</h2>
        <p>
          A purchased portrait is yours to use personally and commercially:
          print it, frame it, put it on a card, use it as a profile picture,
          sell the physical print you bought. We keep the right to make and
          improve the service itself.
        </p>
        <p>
          Digital purchases are delivered as a download link that is valid for{" "}
          <strong>72 hours</strong> and allows up to{" "}
          <strong>five downloads</strong>. Save the file when you get it. If
          your link expires before you managed to download it, email us and we
          will reissue it.
        </p>

        <h2>Payment</h2>
        <p>
          Payments are processed by Stripe. We never see or store your card
          number. Prices are shown before you pay and are charged in US dollars
          unless stated otherwise. Refunds are covered by our{" "}
          <Link href="/refunds">refund policy</Link>.
        </p>

        <h2>Accounts and credit packs</h2>
        <p>
          Credit packs require an account, apply to digital downloads, and do
          not expire. Credits have no cash value and cannot be transferred or
          redeemed for money.
        </p>

        <h2>Acceptable use</h2>
        <p>You may not use ImageCrafter to:</p>
        <ul>
          <li>
            create sexual content, content involving minors in any sexual or
            suggestive context, or content that harasses or defames someone;
          </li>
          <li>
            impersonate a real person in a way meant to deceive, or create
            material for fraud;
          </li>
          <li>
            upload a photo you have no right to use, including copyrighted
            portraits and stock images;
          </li>
          <li>
            automate, scrape or resell access to the generator, or work around
            the free-preview limits.
          </li>
        </ul>
        <p>
          We can refuse or remove a generation and close an account for any of
          these, without refunding credits spent in breach of this section.
        </p>

        <h2>Availability</h2>
        <p>
          The service depends on third-party AI providers and can be slow,
          degraded or unavailable. We do not guarantee uptime or turnaround
          time. Where a paid generation fails outright, we re-run it or refund
          it.
        </p>

        <h2>Liability</h2>
        <p>
          We provide the service “as is”. To the extent the law allows, our
          total liability to you is limited to what you have paid us in the
          twelve months before the claim, and we are not liable for indirect or
          consequential loss.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms. The effective date at the top changes when
          we do. Material changes do not apply retroactively to portraits you
          have already purchased.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, or
          see our <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </article>
  );
}
