"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export type NavLink = { href: string; label: string };

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const resize = () => { if (window.innerWidth >= 1024) setOpen(false); };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex size-11 items-center justify-center rounded-lg border border-rim text-ink-muted transition-colors hover:text-ink"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Opaque, not chrome-veil: the veil is tuned for a 64px bar, and at
          panel height the display type underneath stays legible through it. */}
      {open && (
        <div id={id} className="absolute left-0 right-0 top-full max-h-[calc(100dvh-80px)] overflow-y-auto border-b border-rim bg-canvas shadow-lg">
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
