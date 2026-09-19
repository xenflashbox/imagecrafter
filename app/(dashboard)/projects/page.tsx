"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="size-20 rounded-2xl bg-accent-soft border border-accent-rim flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-accent" />
        </div>
        <h1 className="font-display text-2xl mb-3">Projects are coming soon</h1>
        <p className="text-ink-muted mb-8">
          Character-consistent projects for children&apos;s books, storyboards, and
          presentations are in development.
        </p>

        <Link
          href="/portraits/create"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-canvas hover:bg-accent-2 transition-colors font-medium"
        >
          <Zap className="w-4 h-4" />
          Create a Portrait Instead
        </Link>
      </motion.div>
    </div>
  );
}
