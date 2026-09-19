"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Images,
  LayoutDashboard,
  History,
  Settings,
  Menu,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ArchMark } from "@/components/arch-mark";

// ============================================================================
// NAVIGATION CONFIG
// ============================================================================

const navItems = [
  { href: "/portraits/create", label: "New portrait", icon: Wand2, accent: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gallery", label: "Gallery", icon: Images },
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

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-rim hidden lg:flex flex-col z-50">
        {/* Logo */}
        <div className="p-6 border-b border-rim">
          <Link href="/dashboard" className="flex items-center gap-3">
            <ArchMark className="size-10 rounded-xl" />
            <div>
              <span className="font-semibold text-lg tracking-tight">ImageCrafter</span>
              <span className="block text-[10px] text-ink-subtle uppercase tracking-wider">
                Portrait Studio
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
                    ? "bg-accent-soft text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface-raised"
                } ${item.accent && !isActive ? "text-accent hover:text-accent-2" : ""}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full"
                  />
                )}
                <Icon className={`w-5 h-5 ${item.accent && !isActive ? "text-accent" : ""}`} />
                <span className="font-medium">{item.label}</span>
                {item.accent && !isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade CTA */}
        <div className="p-4">
          <Link
            href="/settings"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent text-canvas hover:bg-accent-2 transition-colors text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            Buy credits
          </Link>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-rim">
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
              <p className="text-xs text-ink-subtle truncate">Manage profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden chrome-veil fixed top-0 left-0 right-0 h-16 border-b border-rim z-50 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ArchMark className="size-8 rounded-lg" />
          <span className="font-semibold">ImageCrafter</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-surface border border-rim"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
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
            className="lg:hidden chrome-veil fixed top-16 left-0 right-0 bottom-0 z-40 p-4"
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
                        ? "bg-accent-soft text-ink"
                        : "text-ink-muted hover:text-ink hover:bg-surface-raised"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Upgrade */}
            <div className="mt-6">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent text-canvas hover:bg-accent-2 transition-colors text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                Buy credits
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
