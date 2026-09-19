"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, ArrowRight } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";

interface CreditsState {
  loading: boolean;
  balance: number | null;
  error: string | null;
}

export function SettingsClient({ packCards }: { packCards: React.ReactNode }) {
  const { user } = useUser();
  const [credits, setCredits] = useState<CreditsState>({
    loading: true,
    balance: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/credits")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setCredits({ loading: false, balance: data.balance, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCredits({
            loading: false,
            balance: null,
            error: err instanceof Error ? err.message : "Failed to load",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="border-b border-rim">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-light mb-1 text-ink">Settings</h1>
          <p className="text-ink-muted">Manage your account and portrait credits</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile */}
        <div className="bg-surface-raised rounded-xl border border-rim p-6">
          <h3 className="font-medium mb-4 text-ink">Profile</h3>
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-16 h-16",
                },
              }}
            />
            <div>
              <div className="font-medium text-ink">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-sm text-ink-muted">
                {user?.emailAddresses[0]?.emailAddress}
              </div>
              <p className="text-xs text-ink-subtle mt-1">
                Click your avatar to manage sign-in, security, or delete your account.
              </p>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="bg-surface-raised rounded-xl border border-rim p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium flex items-center gap-2 text-ink">
              <Coins className="w-4 h-4 text-accent" />
              Portrait Credits
            </h3>
            {credits.loading ? (
              <span className="text-sm text-ink-subtle">Loading…</span>
            ) : credits.error ? (
              <span className="text-sm text-danger">
                Couldn&apos;t load balance ({credits.error})
              </span>
            ) : (
              <span className="text-2xl font-light text-ink">{credits.balance}</span>
            )}
          </div>
          <p className="text-sm text-ink-muted mb-6">
            Each credit unlocks one full 4K portrait download, no watermark. Credits
            never expire.
          </p>
          {packCards}
          <div className="mt-6 text-center">
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-2 transition-colors"
            >
              Create a portrait
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
