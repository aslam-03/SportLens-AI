"use client";

import { motion } from "framer-motion";

export default function VisionQuote() {
  return (
    <section aria-label="Product vision">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-6xl px-6"
      >
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-12 md:px-12 md:py-16 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(7,207,246,0.14),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(25,65,98,0.10),transparent_46%)]" />

          <div className="relative max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">
              Product vision
            </p>
            <blockquote className="mt-5 text-2xl md:text-3xl font-semibold tracking-tight text-brand-ink leading-snug">
              “Coaching shouldn’t depend on access, cost, or location.”
            </blockquote>
            <p className="mt-4 text-base md:text-lg text-slate-600">
              SportLens AI exists to make quality feedback feel available every session—whether you’re refining a cricket technique or learning fitness fundamentals.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
