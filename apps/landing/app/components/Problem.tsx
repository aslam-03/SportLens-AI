"use client";

import { motion } from "framer-motion";
import { problems } from "../constants";

export default function Problem() {
  return (
    <section>
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
            The problem
          </p>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
            Training is noisy.
            <span className="text-slate-400"> Coaching time isn&apos;t.</span>
          </h2>
          <p className="mt-5 text-lg text-slate-600">
            Without real-time feedback, small mistakes compound into bad habits.
            SportLens AI closes the loop with clear cues and measurable technique.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">What changes with SportLens</p>
            <p className="mt-2 text-sm text-slate-600">
              You get an objective coaching layer that stays consistent rep after rep—so improvement doesn&apos;t depend on perfect timing or availability.
            </p>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {problems.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-9 w-9 rounded-xl bg-slate-50 text-sky-600 ring-1 ring-slate-200 flex items-center justify-center">
                  <div className="h-5 w-5">
                    <item.icon />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
