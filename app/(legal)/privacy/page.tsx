import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — ImageCrafter",
  description:
    "What ImageCrafter collects, who processes it, how long we keep your photo, and how to have it deleted.",
  alternates: { canonical: `https://${LEGAL.site}/privacy` },
};

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Privacy Policy</h1>
      <p className="mb-10 text-sm text-ink-faint">
        Effective {LEGAL.effective}
      </p>

      <div className="legal-prose">
        <p>
          {LEGAL.operator} operates {LEGAL.service} at {LEGAL.site}. This page
          says what we collect, who else touches it, and how to get rid of it.
          It is written to be read, not to be survived.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>The photo you upload</strong>, and the portrait generated
            from it.
          </li>
          <li>
            <strong>Your email address</strong> — so we can send you the
            portrait, the receipt and the download link.
          </li>
          <li>
            <strong>Account details</strong> if you create one: name and email,
            held by our sign-in provider. We never see or store your password.
          </li>
          <li>
            <strong>Order details</strong> if you buy: what you bought, the
            amount, and — for prints — the shipping address you give us.
          </li>
          <li>
            <strong>Usage data</strong>: pages viewed, portraits generated,
            approximate location from your IP address, browser and device type.
          </li>
        </ul>
        <p>
          We do not collect your card number. Stripe does, on their own systems.
        </p>

        <h2>What we do with your photo</h2>
        <p>
          We send it to an AI model, which reads it in order to paint a portrait
          from it. That analysis includes facial characteristics — it has to, or
          the portrait would not look like the subject. The result is a written
          description used to steer the generator; we do not build or keep a
          biometric template, and we do not use it to identify you anywhere
          else.
        </p>
        <p>
          <strong>We do not use your photo to train AI models</strong> — not
          ours, and our providers are contractually barred from training on it
          either. We do not sell your photo or your email address to anyone.
        </p>

        <h2>Free previews and the public gallery</h2>
        <p>
          Portraits generated for free and <strong>not purchased</strong> may be
          shown publicly as examples of the work — see our{" "}
          <Link href="/terms">terms</Link> for the licence you grant. Buying the
          portrait ends that licence and removes it from the gallery.
        </p>
        <p>
          We publish only what we have picked by hand. We never publish your
          original photograph, your name or your email address. If you want a
          free preview taken down, email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> and
          we will remove it.
        </p>

        <h2>Who else processes your data</h2>
        <p>
          We run on other people&rsquo;s infrastructure. Each of these sees only
          the part it needs:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> — hosting and delivery of this website.
          </li>
          <li>
            <strong>Neon</strong> — the database holding orders and portrait
            records.
          </li>
          <li>
            <strong>Cloudflare R2</strong> — storage for uploaded photos and
            generated portraits.
          </li>
          <li>
            <strong>Clerk</strong> — accounts and sign-in.
          </li>
          <li>
            <strong>Stripe</strong> — payments, and card data we never see.
          </li>
          <li>
            <strong>Anthropic</strong> — reads the uploaded photo to describe
            it.
          </li>
          <li>
            <strong>Replicate, Higgsfield and Kling</strong> — generate the
            portrait from that description and your photo.
          </li>
          <li>
            <strong>Prodigi</strong> — prints and ships physical orders,
            receives your shipping address.
          </li>
          <li>
            <strong>Brevo</strong> — sends our transactional email.
          </li>
          <li>
            <strong>Mautic</strong> — our own marketing-email system, holds your
            email address if you sign up for updates.
          </li>
        </ul>

        <h2>Cookies and tracking</h2>
        <p>
          We use Google Analytics and Ahrefs Analytics to understand traffic,
          and Meta and TikTok advertising pixels to measure whether our ads
          work. These set cookies and report page views and purchases back to
          those companies. We also send Meta and TikTok a hashed version of your
          email address on purchase so they can match the conversion — hashed,
          never in the clear.
        </p>
        <p>
          A browser-level &ldquo;Do Not Track&rdquo; or tracker-blocking
          extension will stop most of this. We do not serve behavioural ads on
          this site itself.
        </p>

        <h2>How long we keep things</h2>
        <p>
          Uploaded photos and generated portraits are kept while your portrait
          is live so you can come back to it, and so we can honour a purchase or
          a reprint. Order records are kept for as long as tax and accounting
          law requires. Ask us to delete your data and we will, except where we
          are legally required to keep a record of the sale.
        </p>

        <h2>Your rights</h2>
        <p>
          Wherever you are, you can ask us to show you what we hold, correct it,
          delete it, or stop emailing you. If you are in the UK or EU, that is
          your right under GDPR; in California, under the CCPA. We do not sell
          personal information as those laws define it.
        </p>
        <p>
          To exercise any of this, email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. We
          answer within 30 days, usually much sooner.
        </p>

        <h2>Children</h2>
        <p>
          {LEGAL.service} is not for people under 18, and we do not knowingly
          collect their data. Do not upload a photo of a child who is not in
          your care. If you believe a child&rsquo;s photo has been uploaded,
          email us and we will delete it.
        </p>

        <h2>Security</h2>
        <p>
          Traffic is encrypted in transit. Files live in access-controlled
          storage, and download links are signed and expire. No system is
          perfect; if we ever have a breach affecting your data, we will tell
          you.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy. The effective date at the top changes when
          we do.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions, deletion requests, anything else:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, or
          see our <Link href="/contact">contact page</Link>.
        </p>
      </div>
    </article>
  );
}
