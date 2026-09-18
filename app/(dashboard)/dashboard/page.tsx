"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Camera,
  Coins,
  Download,
  Loader2,
  Package,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface Portrait {
  id: string;
  previewImageUrl: string | null;
  status: string;
  stylePackSlug: string | null;
  styleVariantSlug: string | null;
  createdAt: string;
  order: { id: string; type: string; status: string } | null;
}

interface Order {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  downloadCount: number;
  maxDownloads: number;
  prodigiStatus: string | null;
  printSize: string | null;
  downloadable: boolean;
  portrait: {
    id: string;
    previewImageUrl: string | null;
    stylePackSlug: string | null;
    styleVariantSlug: string | null;
  } | null;
}

interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  packSku: string | null;
  createdAt: string;
}

const IN_PROGRESS = ["pending", "analyzing", "generating"];

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ledgerLabel(e: LedgerEntry) {
  switch (e.reason) {
    case "pack_grant":
      return e.packSku ? `${e.packSku.replace("PACK_", "")}-portrait pack` : "Credit pack";
    case "portrait_redeem":
      return "Portrait unlocked";
    case "refund":
      return "Refunded";
    case "admin_adjust":
      return "Adjustment";
    default:
      return e.reason;
  }
}

export default function DashboardPage() {
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [styleNames, setStyleNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fail = (what: string) => (err: unknown) => {
      console.error(`[dashboard] ${what} failed:`, err);
      setErrors((prev) => [...prev, what]);
      return null;
    };

    const json = (r: Response) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    Promise.all([
      fetch("/api/portraits?limit=24").then(json).catch(fail("Your portraits")),
      fetch("/api/orders").then(json).catch(fail("Your purchases")),
      fetch("/api/credits?history=1").then(json).catch(fail("Your credits")),
      fetch("/api/portraits/style-packs").then(json).catch(() => null),
    ]).then(([p, o, c, s]) => {
      if (p?.success) setPortraits(p.portraits);
      if (o?.success) setOrders(o.orders);
      if (c?.success) {
        setBalance(c.balance);
        setLedger(c.history ?? []);
      }
      if (s?.success) {
        const map: Record<string, string> = {};
        for (const pack of s.stylePacks) {
          map[pack.slug] = pack.name;
          for (const v of pack.variants) map[v.slug] = v.name;
        }
        setStyleNames(map);
      }
      setLoading(false);
    });
  }, []);

  const styleLabel = (p: { stylePackSlug: string | null; styleVariantSlug: string | null }) =>
    (p.styleVariantSlug && styleNames[p.styleVariantSlug]) ||
    (p.stylePackSlug && styleNames[p.stylePackSlug]) ||
    p.styleVariantSlug ||
    p.stylePackSlug ||
    "Portrait";

  const unbought = portraits.filter((p) => p.status === "preview");

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)" }}>
      <div
        className="border-b"
        style={{ borderColor: "var(--rim)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl">Your studio</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                Every portrait you have made, and everything you own.
              </p>
            </div>
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <Sparkles className="w-4 h-4" />
              New portrait
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-10">
        {errors.length > 0 && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--accent-soft)", color: "var(--ink)" }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {errors.join(", ")} could not be loaded. Everything else on this page is
              current — refresh to try again.
            </span>
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={Coins}
            label="Portrait credits"
            value={loading ? null : String(balance ?? 0)}
            foot={
              <Link href="/settings" className="hover:underline" style={{ color: "var(--accent)" }}>
                Buy a pack
              </Link>
            }
          />
          <SummaryCard
            icon={Camera}
            label="Portraits made"
            value={loading ? null : String(portraits.length)}
            foot={
              unbought.length > 0 ? (
                <span style={{ color: "var(--ink-muted)" }}>
                  {unbought.length} waiting to be unlocked
                </span>
              ) : null
            }
          />
          <SummaryCard
            icon={ShoppingBag}
            label="Purchases"
            value={loading ? null : String(orders.length)}
          />
        </div>

        {/* Portraits */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl">Your portraits</h2>

          {loading ? (
            <Loading />
          ) : portraits.length === 0 ? (
            <Empty
              icon={Camera}
              title="No portraits yet"
              body="Upload a photo and pick a style — the first preview is free."
              cta={{ href: "/portraits/create", label: "Make one" }}
            />
          ) : (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {portraits.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--rim)", background: "var(--surface)" }}
                >
                  <div className="relative aspect-[3/4]" style={{ background: "var(--surface-raised)" }}>
                    {p.previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.previewImageUrl}
                        alt={styleLabel(p)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xs"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {IN_PROGRESS.includes(p.status) ? "Rendering…" : "No preview"}
                      </div>
                    )}
                    {p.status === "purchased" && (
                      <span
                        className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--positive)", color: "#06060a" }}
                      >
                        Owned
                      </span>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-2">
                    <div className="text-sm truncate">{styleLabel(p)}</div>
                    <div className="text-xs" style={{ color: "var(--ink-subtle)" }}>
                      {formatDate(p.createdAt)}
                    </div>

                    {p.status === "preview" && (
                      <Link
                        href={`/portraits/${p.id}/preview`}
                        className="mt-1 inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        Unlock <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {p.status === "purchased" && (
                      <Link
                        href={`/portraits/${p.id}/success`}
                        className="mt-1 text-xs hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        View order
                      </Link>
                    )}
                    {p.status === "failed" && (
                      <span className="text-xs" style={{ color: "var(--danger)" }}>
                        Did not render — you were not charged
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Purchases */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl">Your purchases</h2>

          {loading ? (
            <Loading />
          ) : orders.length === 0 ? (
            <Empty
              icon={ShoppingBag}
              title="Nothing purchased yet"
              body="Unlock a portrait to download the full-resolution file or order a print."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-4 rounded-xl border p-3"
                  style={{ borderColor: "var(--rim)", background: "var(--surface)" }}
                >
                  <div
                    className="w-14 h-[74px] shrink-0 overflow-hidden rounded-lg"
                    style={{ background: "var(--surface-raised)" }}
                  >
                    {o.portrait?.previewImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.portrait.previewImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      {o.type === "print" ? (
                        <Package className="w-4 h-4 shrink-0" style={{ color: "var(--ink-subtle)" }} />
                      ) : (
                        <Download className="w-4 h-4 shrink-0" style={{ color: "var(--ink-subtle)" }} />
                      )}
                      <span className="truncate">
                        {o.portrait ? styleLabel(o.portrait) : "Portrait"}
                        {o.type === "print" && o.printSize ? ` · ${o.printSize}` : ""}
                      </span>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--ink-subtle)" }}>
                      {formatDate(o.createdAt)} · {formatMoney(o.amount, o.currency)}
                      {o.type === "print" && o.prodigiStatus ? ` · ${o.prodigiStatus}` : ""}
                      {o.status === "refunded" ? " · refunded" : ""}
                      {o.type === "digital" && o.status !== "refunded"
                        ? ` · ${o.maxDownloads - o.downloadCount} of ${o.maxDownloads} downloads left`
                        : ""}
                    </div>
                  </div>

                  <Link
                    href={`/portraits/${o.portrait?.id ?? ""}/success`}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{
                      border: "1px solid var(--rim-strong)",
                      color: o.downloadable ? "var(--accent)" : "var(--ink-muted)",
                    }}
                  >
                    {o.downloadable ? "Download" : "Details"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Credits */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Credit history</h2>
            <Link href="/settings" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
              Buy credits
            </Link>
          </div>

          {loading ? (
            <Loading />
          ) : ledger.length === 0 ? (
            <Empty
              icon={Coins}
              title="No credits yet"
              body="Packs let you unlock several portraits at a lower price per portrait. They never expire."
              cta={{ href: "/settings", label: "See packs" }}
            />
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--rim)" }}>
              {ledger.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                  style={{
                    background: "var(--surface)",
                    borderTop: i === 0 ? undefined : "1px solid var(--rim)",
                  }}
                >
                  <span>{ledgerLabel(e)}</span>
                  <span className="flex items-center gap-4">
                    <span className="text-xs" style={{ color: "var(--ink-subtle)" }}>
                      {formatDate(e.createdAt)}
                    </span>
                    <span
                      className="w-10 text-right tabular-nums"
                      style={{ color: e.delta > 0 ? "var(--positive)" : "var(--ink-muted)" }}
                    >
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  foot,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  foot?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--rim)", background: "var(--surface)" }}
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl">
        {value === null ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
      {foot && <div className="mt-1 text-xs">{foot}</div>}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-3 py-8 text-sm" style={{ color: "var(--ink-subtle)" }}>
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading…
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div
      className="rounded-xl border px-6 py-12 text-center"
      style={{ borderColor: "var(--rim)", background: "var(--surface)" }}
    >
      <Icon className="w-9 h-9 mx-auto mb-3" style={{ color: "var(--ink-faint)" }} />
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {body}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
