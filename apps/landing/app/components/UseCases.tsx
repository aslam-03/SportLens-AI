"use client";

import { motion } from "framer-motion";
import { cricketUseCases, fitnessUseCases } from "../constants";

export default function UseCases() {
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
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">Use cases</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
              Built for cricket.
              <span className="text-slate-400"> Useful for fitness.</span>
            </h2>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Two modes, one coaching philosophy: make feedback obvious, actionable, and repeatable.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cricket */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-8 shadow-sm"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-950">Cricket coaching</h3>
              <p className="mt-2 text-sm text-slate-600">
                Technique cues tuned for batting and bowling—so athletes get feedback that feels cricket-native.
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 text-sky-700 shadow-sm">
              <span className="text-sm font-bold">C</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {cricketUseCases.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <div className="flex gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-sky-50 text-sky-700 ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                    <div className="h-5 w-5">
                      <item.icon />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Fitness */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-8 shadow-sm"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-950">Fitness coaching</h3>
              <p className="mt-2 text-sm text-slate-600">
                Lock fundamentals with posture checks and alignment cues—great for strength, mobility, and rehab-style work.
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 text-emerald-700 shadow-sm">
              <span className="text-sm font-bold">F</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {fitnessUseCases.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <div className="flex gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                    <div className="h-5 w-5">
                      <item.icon />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
