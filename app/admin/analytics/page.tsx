import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  CircleAlert,
  Eye,
  ImagePlus,
  MousePointerClick,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import { AdminAnalyticsRefresh } from "@/components/admin-analytics-refresh";
import {
  getAdminAnalytics,
  type AnalyticsRange,
} from "@/lib/services/admin-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const ACTIVITY_LABELS: Record<string, string> = {
  upload_completed: "Upload completed",
  preview_created: "Preview created",
  checkout_started: "Cart created",
  stripe_checkout_session_created: "Stripe checkout opened",
  checkout_expired: "Checkout expired",
  payment_failed: "Payment failed",
  payment_completed: "Payment completed",
  meta_capi_rejected: "Meta event rejected",
  meta_capi_failed: "Meta event failed",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: typeof Users;
  tone?: "neutral" | "positive" | "warning";
}) {
  const color =
    tone === "positive" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : "text-white";
  return (
    <div className="min-w-0 border-b border-white/10 px-1 py-5 sm:border-b-0 sm:border-r sm:px-5 last:border-r-0">
      <div className="flex items-center gap-2 text-xs text-white/45">
        <Icon className="size-4" />
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
      {note && <div className="mt-1 text-xs text-white/35">{note}</div>}
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {detail && <p className="text-xs text-white/35">{detail}</p>}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range: AnalyticsRange = ["24h", "7d", "30d"].includes(params.range || "")
    ? (params.range as AnalyticsRange)
    : "24h";
  const data = await getAdminAnalytics(range);
  const maxFunnel = Math.max(data.funnel[0]?.value || 0, 1);
  const metaReceiptCount =
    data.tracking.metaAccepted +
    data.tracking.metaRejected +
    data.tracking.metaFailed +
    data.tracking.metaSkipped;
  const metaHealthy = data.tracking.metaRejected === 0 && data.tracking.metaFailed === 0;

  return (
    <main className="pb-12">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-violet-300">
            <Activity className="size-4" />
            Live operations
          </div>
          <h1 className="mt-2 text-2xl font-semibold">ImageCrafter analytics</h1>
          <p className="mt-1 text-sm text-white/45">
            Updated {formatTime(data.generatedAt)} · from {formatTime(data.start)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-md border border-white/10 p-1">
            {RANGES.map((item) => (
              <Link
                key={item.value}
                href={`/admin/analytics?range=${item.value}`}
                className={`rounded px-3 py-1.5 text-xs transition-colors ${
                  range === item.value ? "bg-white text-black" : "text-white/45 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <AdminAnalyticsRefresh />
        </div>
      </header>

      <section className="grid grid-cols-2 border-b border-white/10 sm:grid-cols-4 xl:grid-cols-8">
        <Metric label="Visitors" value={data.overview.visitors} icon={Users} />
        <Metric label="Page views" value={data.overview.pageViews} icon={Eye} />
        <Metric label="Signups" value={data.overview.signups} icon={UserPlus} />
        <Metric label="Uploads" value={data.overview.completedUploads} icon={ImagePlus} />
        <Metric
          label="Previews"
          value={data.overview.previewsCreated}
          note={`${data.overview.previewsSeen} seen`}
          icon={MousePointerClick}
        />
        <Metric label="Carts" value={data.overview.checkoutStarts} icon={ShoppingCart} />
        <Metric
          label="Payments"
          value={data.overview.payments}
          icon={BadgeDollarSign}
          tone={data.overview.payments ? "positive" : "neutral"}
        />
        <Metric
          label="Revenue"
          value={formatMoney(data.overview.revenueCents)}
          icon={BadgeDollarSign}
          tone={data.overview.revenueCents ? "positive" : "neutral"}
        />
      </section>

      <div className="grid gap-10 py-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle title="Conversion funnel" detail="Distinct visitors or records at each step" />
          <div className="space-y-4">
            {data.funnel.map((step) => {
              const width = Math.max((step.value / maxFunnel) * 100, step.value ? 3 : 0);
              return (
                <div key={step.label} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3">
                  <span className="text-xs text-white/55">{step.label}</span>
                  <div className="h-7 overflow-hidden rounded bg-white/5">
                    <div
                      className="h-full bg-violet-500/75 transition-[width]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-medium tabular-nums">{step.value}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle title="Acquisition" detail={`${data.devices[0]?.name || "Unknown"} leads this range`} />
          <div className="divide-y divide-white/10 border-y border-white/10">
            {data.sources.map((source) => (
              <div key={source.name} className="flex items-center justify-between py-3 text-sm">
                <span className="text-white/55">{source.name}</span>
                <span className="font-medium tabular-nums">{source.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-5 text-xs text-white/40">
            {data.devices.map((device) => (
              <span key={device.name}>{device.name}: {device.count}</span>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-10 border-t border-white/10 py-8 lg:grid-cols-3">
        <section>
          <SectionTitle title="Generation health" />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <Stat label="Successful" value={data.generations.successful} tone="positive" />
            <Stat label="Failed" value={data.generations.failed} tone={data.generations.failed ? "warning" : undefined} />
            <Stat label="Uploaded, not started" value={data.generations.pending} />
            <Stat label="Processing now" value={data.generations.processing} />
            <Stat label="Stale over 15m" value={data.generations.stale} tone={data.generations.stale ? "warning" : undefined} />
            <Stat
              label="Average render"
              value={data.generations.averageSeconds ? `${Math.floor(data.generations.averageSeconds / 60)}m ${data.generations.averageSeconds % 60}s` : "—"}
            />
          </dl>
        </section>

        <section>
          <SectionTitle title="Commerce health" />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <Stat label="Cart creations" value={data.commerce.carts} />
            <Stat label="Stripe checkouts" value={data.commerce.stripeSessions} />
            <Stat label="Expired" value={data.commerce.expired} tone={data.commerce.expired ? "warning" : undefined} />
            <Stat label="Likely abandoned" value={data.commerce.likelyAbandoned} tone={data.commerce.likelyAbandoned ? "warning" : undefined} />
            <Stat label="Payment failures" value={data.commerce.paymentFailures} tone={data.commerce.paymentFailures ? "warning" : undefined} />
            <Stat label="Completed payments" value={data.commerce.payments} tone="positive" />
          </dl>
        </section>

        <section>
          <SectionTitle title="Meta event delivery" detail="First-party CAPI receipts" />
          <div className={`mb-4 flex items-center gap-2 text-sm ${metaReceiptCount && metaHealthy ? "text-emerald-300" : "text-amber-300"}`}>
            {metaReceiptCount && metaHealthy ? <Activity className="size-4" /> : <CircleAlert className="size-4" />}
            {!metaReceiptCount
              ? "Awaiting the first recorded CAPI receipt"
              : metaHealthy
                ? "No recorded delivery failures"
                : "Meta delivery needs attention"}
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <Stat label="Accepted" value={data.tracking.metaAccepted} tone="positive" />
            <Stat label="Rejected" value={data.tracking.metaRejected} tone={data.tracking.metaRejected ? "warning" : undefined} />
            <Stat label="Network failures" value={data.tracking.metaFailed} tone={data.tracking.metaFailed ? "warning" : undefined} />
            <Stat label="Not configured" value={data.tracking.metaSkipped} tone={data.tracking.metaSkipped ? "warning" : undefined} />
            <Stat label="Meta visitors" value={data.tracking.metaAttributedVisitors} />
            <Stat label="TikTok visitors" value={data.tracking.tiktokAttributedVisitors} />
          </dl>
        </section>
      </div>

      <div className="grid gap-10 border-t border-white/10 py-8 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionTitle title="Sharing and gallery" />
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
            <Stat label="Share clicks" value={data.engagement.shareClicks} />
            <Stat label="Shared-page views" value={data.engagement.sharePageViews} />
            <Stat label="Image downloads" value={data.engagement.downloads} />
            <Stat label="Gallery views" value={data.engagement.galleryViews} />
            <Stat label="Gallery votes" value={data.engagement.galleryVotes} />
            <Stat label="New gallery items" value={data.engagement.galleryAdded} />
          </dl>
          <p className="mt-5 text-xs text-white/35">{data.engagement.galleryTotal} unpaid pet previews currently qualify for the public gallery.</p>
        </section>

        <section>
          <SectionTitle title="Recent funnel activity" detail="No customer PII shown" />
          {data.recentActivity.length ? (
            <div className="divide-y divide-white/10 border-y border-white/10">
              {data.recentActivity.map((item, index) => (
                <div key={`${item.at.toISOString()}-${index}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                  <div>
                    <div className="text-white/70">{ACTIVITY_LABELS[item.kind] || item.kind}</div>
                    {item.detail && <div className="mt-0.5 text-xs text-white/30">{item.detail}</div>}
                  </div>
                  <time className="text-xs text-white/35">{formatTime(item.at)}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-y border-white/10 py-8 text-sm text-white/35">No funnel activity in this range.</div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "positive" | "warning";
}) {
  const color = tone === "positive" ? "text-emerald-300" : tone === "warning" ? "text-amber-300" : "text-white";
  return (
    <div>
      <dt className="text-xs text-white/35">{label}</dt>
      <dd className={`mt-1 text-lg font-medium tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
