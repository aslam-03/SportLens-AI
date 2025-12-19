"use client";

import { motion } from "framer-motion";
import { features } from "../constants";

export default function Features() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 md:mb-16"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">Capabilities</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-brand-ink">
                Product-grade coaching tools.
              </h2>
              <p className="mt-2 text-balance text-3xl font-semibold tracking-tight text-brand-blue/95 sm:text-4xl">
                Athlete-friendly UX.
              </p>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Designed for clarity and confidence—so you can focus on the rep, not the interface.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-xl bg-gradient-to-br from-brand-cyan/10 to-white text-brand-blue ring-1 ring-slate-200 flex items-center justify-center">
                <span className="text-sm font-bold">{idx + 1}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
