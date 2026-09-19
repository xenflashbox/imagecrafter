import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Data Deletion — ImageCrafter",
  description:
    "How to delete your ImageCrafter account, your uploaded photos and your portraits — and what happens when you remove ImageCrafter from Facebook.",
  alternates: { canonical: `https://${LEGAL.site}/data-deletion` },
};

export default function DataDeletionPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Data Deletion</h1>
      <p className="mb-10 text-sm text-ink-faint">Effective {LEGAL.effective}</p>

      <div className="legal-prose">
        <p>
          Your photo is yours. You can have everything we hold about you removed,
          and you do not have to explain why.
        </p>

        <h2>Delete everything</h2>
        <p>
          Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>{" "}
          from the address on your account and ask us to delete it. We remove
          your account, the photos you uploaded, every portrait generated from
          them and your credit balance, normally within a few days and always
          within 30 days.
        </p>
        <p>
          Two things survive on purpose: the payment records our accountant and
          the card networks require us to keep, and any portrait you gave us
          written permission to show in the public gallery. Tell us in the same
          email if you want that gallery permission withdrawn and we will pull
          the image down.
        </p>
        <p>
          Deleting is not reversible. If you have bought a full-resolution
          download, save the file first — we cannot re-send it afterwards.
        </p>

        <h2>Remove Facebook sign-in only</h2>
        <p>
          If you signed in with Facebook and only want that connection gone, open
          Facebook&apos;s <strong>Settings &amp; Privacy → Settings → Apps and
          Websites</strong>, find ImageCrafter and remove it. Facebook notifies
          us automatically and we unlink the account.
        </p>
        <p>
          That removes the sign-in link and the name and email address Facebook
          passed to us with it. It does <em>not</em> delete your ImageCrafter
          account or your portraits, because you may have paid for them — you can
          still sign in with Google or email. If you want the account gone too,
          email us as described above.
        </p>
        <p>
          Facebook gives you a confirmation code when you remove the app. You can{" "}
          <Link href="/data-deletion-status">check the status of that request</Link>{" "}
          with it at any time.
        </p>

        <h2>What we hold in the first place</h2>
        <ul>
          <li>Your email address, and your name if your sign-in provider gave us one.</li>
          <li>The photo you uploaded, and the portraits generated from it.</li>
          <li>Your order history and your credit balance.</li>
        </ul>
        <p>
          We never read your Facebook content, never post on your behalf and
          never import photos from any social account. The only photo we hold is
          the one you deliberately uploaded. There is more detail in the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Questions</h2>
        <p>
          Write to <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>{" "}
          and a person will answer.
        </p>
      </div>
    </article>
  );
}
