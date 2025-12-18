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
        className="mb-12 text-center md:mb-16"
      >
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mb-4">
          Built for performance
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Every feature designed to help you train smarter, not just harder.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {features.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-lg transition-all duration-200 group"
          >
            <h3 className="text-lg font-semibold text-slate-950 mb-3 group-hover:text-sky-600 transition-colors">
              {item.title}
            </h3>
            <p className="text-slate-600 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
