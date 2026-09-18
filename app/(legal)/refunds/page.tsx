import { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy — ImageCrafter",
  description:
    "When ImageCrafter refunds a digital portrait, a print or a credit pack, and how to ask for one.",
  alternates: { canonical: `https://${LEGAL.site}/refunds` },
};

export default function RefundsPage() {
  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Refund Policy</h1>
      <p className="mb-10 text-sm text-ink-faint">
        Effective {LEGAL.effective}
      </p>

      <div className="legal-prose">
        <p>
          You see the portrait before you pay. That is the whole point of the
          free preview — nobody buys a surprise here. So the rules below are
          about things going wrong, not about changing your mind on a portrait
          you have already looked at.
        </p>
        <p>
          If something went wrong, email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> with
          your order number and what happened. We would rather fix it than argue
          about it.
        </p>

        <h2>Digital portraits</h2>
        <p>
          A digital purchase is delivered immediately as a download link. We
          refund in full when:
        </p>
        <ul>
          <li>the file never arrived, or the link never worked;</li>
          <li>
            the file we delivered is not the portrait you previewed and bought;
          </li>
          <li>
            you were charged twice, or charged for something you did not order.
          </li>
        </ul>
        <p>
          We do not refund a delivered file simply because you have changed your
          mind about it — you saw it at full size before paying. If your link
          expired before you downloaded it, that is not a refund matter: email
          us and we will reissue it.
        </p>

        <h2>Prints</h2>
        <p>
          Prints are made to order, so we cannot restock them. We will replace
          or refund a print that arrives damaged, defective, or wrong — wrong
          size, wrong finish, wrong image. Send us a photograph of the problem
          within <strong>30 days</strong> of delivery and we will sort it,
          usually by reprinting it.
        </p>
        <p>
          If a print has not arrived well past the estimated 5&ndash;10 business
          days, tell us and we will chase it or reprint it. We do not refund a
          correctly-produced print because you decided you would rather have had
          a different size or style.
        </p>

        <h2>Credit packs</h2>
        <p>
          Unused credits are refundable within <strong>14 days</strong> of
          purchase. Once credits have been spent on a generation we have paid
          for that rendering, so spent credits are not refundable. Credits do
          not expire and have no cash value.
        </p>

        <h2>Failed generations</h2>
        <p>
          If a paid generation fails, we re-run it at no cost. If it fails
          again, we refund it. You are never charged for a portrait we could not
          produce.
        </p>

        <h2>How refunds are paid</h2>
        <p>
          Refunds go back to the original payment method through Stripe. Once we
          issue one it usually lands within 5&ndash;10 business days, depending
          on your bank. We cannot refund to a different card or account.
        </p>

        <h2>Chargebacks</h2>
        <p>
          Please email us before disputing a charge with your bank. A chargeback
          costs us the fee whether or not it succeeds, and we can almost always
          resolve the underlying problem faster than the dispute process can.
          Accounts used to dispute legitimate, delivered purchases may be
          closed.
        </p>

        <h2>Contact</h2>
        <p>
          Refund requests and anything else:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, or
          see our <Link href="/contact">contact page</Link>. Our full{" "}
          <Link href="/terms">terms</Link> also apply.
        </p>
      </div>
    </article>
  );
}
