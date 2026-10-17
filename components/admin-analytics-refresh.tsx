"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function AdminAnalyticsRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = useCallback(
    () => startTransition(() => router.refresh()),
    [router],
  );

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-2 text-xs text-white/50">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(event) => setAutoRefresh(event.target.checked)}
          className="size-4 accent-violet-500"
        />
        Auto-refresh
      </label>
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        title="Refresh analytics"
        aria-label="Refresh analytics"
        className="grid size-9 place-items-center rounded-md border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
      >
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
