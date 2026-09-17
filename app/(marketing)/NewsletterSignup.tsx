"use client";

import { useState, FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-rim text-positive text-sm">
        <Check className="w-4 h-4 shrink-0" />
        You&apos;re subscribed! Check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          disabled={status === "loading"}
          className="flex-1 px-3 py-2 rounded-xl bg-surface border border-rim text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-accent-rim transition-colors disabled:opacity-50"
          aria-label="Email address for newsletter"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email}
          className="px-4 py-2 rounded-xl bg-accent text-canvas hover:bg-accent transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Subscribe
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-danger">{errorMsg}</p>
      )}
    </form>
  );
}
