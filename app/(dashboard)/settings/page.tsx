"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, ArrowRight } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { CreditPackCards } from "@/components/credit-pack-cards";

interface CreditsState {
  loading: boolean;
  balance: number | null;
  error: string | null;
}

export default function SettingsPage() {
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
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-light mb-1">Settings</h1>
          <p className="text-white/40">Manage your account and portrait credits</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Profile */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="font-medium mb-4">Profile</h3>
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-16 h-16",
                },
              }}
            />
            <div>
              <div className="font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-sm text-white/40">
                {user?.emailAddresses[0]?.emailAddress}
              </div>
              <p className="text-xs text-white/30 mt-1">
                Click your avatar to manage sign-in, security, or delete your account.
              </p>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium flex items-center gap-2">
              <Coins className="w-4 h-4 text-violet-400" />
              Portrait Credits
            </h3>
            {credits.loading ? (
              <span className="text-sm text-white/40">Loading…</span>
            ) : credits.error ? (
              <span className="text-sm text-red-400">
                Couldn&apos;t load balance ({credits.error})
              </span>
            ) : (
              <span className="text-2xl font-light">{credits.balance}</span>
            )}
          </div>
          <p className="text-sm text-white/40 mb-6">
            Each credit unlocks one full 4K portrait download, no watermark. Credits
            never expire.
          </p>
          <CreditPackCards theme="dark" />
          <div className="mt-6 text-center">
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
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
