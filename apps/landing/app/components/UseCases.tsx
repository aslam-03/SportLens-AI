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
        className="mb-12 text-center md:mb-16"
      >
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mb-4">
          For every athlete
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Whether you&apos;re perfecting your cricket technique or mastering fitness fundamentals.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Cricket */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="text-2xl font-bold text-slate-950 mb-6">Cricket coaching</h3>
          <div className="space-y-4">
            {cricketUseCases.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex gap-4">
                <div className="h-6 w-6 text-sky-500 flex-shrink-0 mt-1">
                  <item.icon />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.text}</p>
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
        >
          <h3 className="text-2xl font-bold text-slate-950 mb-6">Fitness coaching</h3>
          <div className="space-y-4">
            {fitnessUseCases.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-6 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex gap-4">
                <div className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-1">
                  <item.icon />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
