"use client";

import { motion } from "framer-motion";
import { solutionFlow } from "../constants";

export default function SolutionFlow() {
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
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">How it works</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
              From camera to coaching,
              <span className="text-slate-400"> in five steps.</span>
            </h2>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Enable your camera, then get live overlays and cues—clear enough to apply mid-move.
          </p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Desktop Flow */}
        <div className="hidden md:block">
          <div className="relative">
            <div className="pointer-events-none absolute left-8 right-8 top-8 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="grid grid-cols-5 gap-4 items-stretch">
              {solutionFlow.map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04, duration: 0.4 }}
                  className="relative group h-full"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                    <div className="h-7 w-7 text-brand-blue">
                      <item.icon />
                    </div>
                  </div>
                  <div className="mt-5 h-[176px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-slate-300">
                    <p className="text-xs font-semibold text-slate-500">Step {idx + 1}</p>
                    <h3 className="mt-2 text-sm font-semibold text-brand-ink">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Flow */}
        <div className="md:hidden space-y-4">
          {solutionFlow.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 flex gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300">
                <div className="h-10 w-10 rounded-xl bg-slate-50 text-brand-blue ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                  <item.icon />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-ink mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
