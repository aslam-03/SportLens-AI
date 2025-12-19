"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 md:p-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(7,207,246,0.18),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(25,65,98,0.10),transparent_42%)]" />

        <div className="relative">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">Final CTA</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
                Train with clarity.
                <span className="text-slate-400"> Improve with confidence.</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-slate-600 max-w-xl">
                The best training sessions feel coached. SportLens AI helps you get there—using only your webcam and calm, real-time feedback.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Start in seconds</p>
              <p className="mt-2 text-sm text-slate-600">
                Launch the app, enable your camera, and begin training.
              </p>
              <div className="mt-6">
                <Link
                  href="https://app.sportlens.ai"
                  className="inline-flex w-full items-center justify-center px-6 py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-semibold rounded-xl transition-colors duration-200 text-base shadow-sm"
                >
                  Start Training with SportLens AI
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Webcam-only. No wearables required.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
