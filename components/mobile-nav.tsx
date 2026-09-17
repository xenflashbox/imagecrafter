"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type NavLink = { href: string; label: string };

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-9 items-center justify-center rounded-xl border border-rim text-ink-muted transition-colors hover:text-ink"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Opaque, not chrome-veil: the veil is tuned for a 64px bar, and at
          panel height the display type underneath stays legible through it. */}
      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-rim bg-canvas shadow-lg">
          <div className="flex flex-col px-6 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-rim py-3 text-base text-ink-muted transition-colors last:border-0 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
