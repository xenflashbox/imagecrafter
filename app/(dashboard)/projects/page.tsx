"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-violet-400" />
        </div>
        <h1 className="text-2xl font-light mb-3">Projects are coming soon</h1>
        <p className="text-white/50 mb-8">
          Character-consistent projects for children&apos;s books, storyboards, and
          presentations are in development.
        </p>

        <Link
          href="/portraits/create"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all font-medium"
        >
          <Zap className="w-4 h-4" />
          Create a Portrait Instead
        </Link>
      </motion.div>
    </div>
  );
}
