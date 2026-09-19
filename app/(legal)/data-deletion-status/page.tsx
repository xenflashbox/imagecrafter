"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LEGAL } from "@/lib/legal";

interface DeletionStatus {
  confirmation_code: string;
  status: string;
  platform: string;
  requested_at: string;
  completed_at: string | null;
  error_message: string | null;
}

const STATUS_COPY: Record<string, { label: string; detail: string; tone: string }> = {
  pending: {
    label: "Received",
    detail: "We have your request and it is queued for processing.",
    tone: "text-ink-faint",
  },
  processing: {
    label: "In progress",
    detail: "We are removing the data now. This usually takes seconds.",
    tone: "text-warning",
  },
  completed: {
    label: "Complete",
    detail: "The Facebook sign-in link and the profile details Facebook passed us have been removed.",
    tone: "text-positive",
  },
  failed: {
    label: "Failed",
    detail: "Something went wrong on our side. Email us and we will finish it by hand.",
    tone: "text-danger",
  },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function DataDeletionStatusContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [result, setResult] = useState<DeletionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (lookupCode: string) => {
    const trimmed = lookupCode.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/facebook/data-deletion/status?code=${encodeURIComponent(trimmed)}`
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "We could not look that code up.");
        return;
      }
      setResult(body as DeletionStatus);
    } catch {
      setError("We could not reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  const initialCode = searchParams.get("code");
  useEffect(() => {
    if (initialCode) void lookup(initialCode);
  }, [initialCode, lookup]);

  const copy = result ? STATUS_COPY[result.status] : null;

  return (
    <article>
      <h1 className="font-display mb-3 text-3xl font-light">Deletion Request Status</h1>
      <p className="mb-10 text-sm text-ink-faint">
        Enter the confirmation code Facebook gave you when you removed ImageCrafter.
      </p>

      <form
        className="mb-10 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(code);
        }}
      >
        <label className="sr-only" htmlFor="deletion-code">
          Confirmation code
        </label>
        <input
          id="deletion-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="IC-DEL-..."
          className="flex-1 rounded-lg border border-rim bg-surface-raised px-4 py-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-accent px-6 py-3 font-medium text-canvas transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check status"}
        </button>
      </form>

      {error && (
        <p className="mb-10 rounded-lg border border-rim bg-surface px-4 py-3 text-danger">
          {error}
        </p>
      )}

      {result && copy && (
        <div className="mb-10 rounded-lg border border-rim bg-surface p-6">
          <p className={`font-display text-2xl font-light ${copy.tone}`}>{copy.label}</p>
          <p className="mt-2 text-ink-faint">{copy.detail}</p>

          <dl className="mt-6 flex flex-col gap-3 border-t border-rim pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-faint">Confirmation code</dt>
              <dd className="font-mono">{result.confirmation_code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-faint">Requested</dt>
              <dd>{formatDate(result.requested_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-faint">Completed</dt>
              <dd>{formatDate(result.completed_at)}</dd>
            </div>
          </dl>

          {result.error_message && (
            <p className="mt-6 border-t border-rim pt-6 text-sm text-danger">
              {result.error_message}
            </p>
          )}
        </div>
      )}

      <div className="legal-prose">
        <h2>What this removes</h2>
        <p>
          Removing ImageCrafter from Facebook unlinks Facebook sign-in and deletes
          the name and email address Facebook passed to us. Your ImageCrafter
          account, your uploaded photo and your portraits stay — you may have paid
          for them, and you can still sign in with Google or email.
        </p>
        <p>
          To delete the account and everything in it, see{" "}
          <Link href="/data-deletion">Data Deletion</Link> or email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </div>
    </article>
  );
}

export default function DataDeletionStatusPage() {
  return (
    <Suspense fallback={<p className="text-ink-faint">Loading…</p>}>
      <DataDeletionStatusContent />
    </Suspense>
  );
}
