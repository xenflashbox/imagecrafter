"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RedeemButton({
  portraitId,
  balance,
}: {
  portraitId: string;
  balance: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portraitId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/portraits/${portraitId}/success?orderId=${data.orderId}`);
        return;
      }
      if (res.status === 409 && data.orderId) {
        router.push(`/portraits/${portraitId}/success?orderId=${data.orderId}`);
        return;
      }
      setError(data.error || "Redemption failed. Please try again.");
      setBusy(false);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={redeem}
        disabled={busy}
        className="block w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors"
      >
        {busy
          ? "Redeeming…"
          : `Use 1 Credit — Free Download (${balance} left)`}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
