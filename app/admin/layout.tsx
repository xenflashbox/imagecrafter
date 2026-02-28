/**
 * Admin Layout
 *
 * All /admin/* pages require:
 * 1. Clerk authentication (Middleware enforces this — /admin is not public)
 * 2. Admin role (userId must be in ADMIN_USER_IDS env var)
 *
 * Non-admin authenticated users see a 403 screen.
 */

import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/blog");
  }

  if (!ADMIN_USER_IDS.includes(userId)) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-light text-white mb-2">Access Denied</h1>
          <p className="text-white/50 mb-6">
            This area is restricted to ImageCrafter administrators.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      {/* Admin nav bar */}
      <div className="border-b border-white/10 bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">Admin</span>
            <Link href="/admin/blog" className="text-sm text-white/60 hover:text-white transition-colors">
              Blog Posts
            </Link>
          </div>
          <Link href="/dashboard" className="text-xs text-white/40 hover:text-white transition-colors">
            ← Back to App
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
