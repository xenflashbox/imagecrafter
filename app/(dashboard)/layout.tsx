"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Images,
  FolderKanban,
  History,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

// ============================================================================
// NAVIGATION CONFIG
// ============================================================================

const navItems = [
  { href: "/generate", label: "Create", icon: Wand2, accent: true },
  { href: "/gallery", label: "Gallery", icon: Images },
  { href: "/projects", label: "Projects", icon: FolderKanban, badge: "Pro" },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ============================================================================
// LAYOUT COMPONENT
// ============================================================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mock usage data - replace with real data from API
  const usage = {
    used: 3,
    limit: 5,
    plan: "Free",
  };

  const usagePercent = (usage.used / usage.limit) * 100;

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c12] border-r border-white/5 hidden lg:flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/generate" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight">ImageCrafter</span>
              <span className="block text-[10px] text-white/40 uppercase tracking-wider">
                AI Image Studio
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                } ${item.accent && !isActive ? "text-violet-400 hover:text-violet-300" : ""}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-r-full"
                  />
                )}
                <Icon className={`w-5 h-5 ${item.accent && !isActive ? "text-violet-400" : ""}`} />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {item.badge}
                  </span>
                )}
                {item.accent && !isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Usage Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/60">Monthly Usage</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                {usage.plan}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-2xl font-light">{usage.used}</span>
              <span className="text-white/40 text-sm"> / {usage.limit}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                className={`h-full rounded-full ${
                  usagePercent > 80
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                }`}
              />
            </div>
            <Link
              href="/settings/billing"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              Upgrade Plan
            </Link>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Account</p>
              <p className="text-xs text-white/40 truncate">Manage profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0c0c12]/90 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-between px-4">
        <Link href="/generate" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">ImageCrafter</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white/5"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-[#0c0c12]/95 backdrop-blur-xl z-40 p-4"
          >
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Usage */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">Usage</span>
                <span className="text-sm">
                  {usage.used}/{usage.limit}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
