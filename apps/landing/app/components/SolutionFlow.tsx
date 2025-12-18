"use client";

import { motion } from "framer-motion";
import { solutionFlow, flowVisual } from "../constants";

export default function SolutionFlow() {
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
          How it works
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Five simple steps from webcam to instant coaching feedback.
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* Desktop Flow */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {solutionFlow.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="flex-1"
            >
              <div className="relative">
                {/* Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center hover:border-slate-300 hover:shadow-md transition-all duration-200">
                  <div className="mb-4 h-10 w-10 text-sky-500 mx-auto">
                    <item.icon />
                  </div>
                  <h3 className="font-semibold text-slate-950 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.text}</p>
                </div>
                {/* Arrow */}
                {idx < solutionFlow.length - 1 && (
                  <svg className="absolute -right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </motion.div>
          ))}
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
              <div className="rounded-xl border border-slate-200 bg-white p-6 flex gap-4">
                <div className="h-10 w-10 text-sky-500 flex-shrink-0">
                  <item.icon />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-950 mb-1">{item.title}</h3>
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
