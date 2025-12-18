"use client";

import { motion } from "framer-motion";
import { problems } from "../constants";

export default function Problem() {
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
          The coaching gap
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Without real-time feedback, small mistakes compound into bad habits. Most athletes train in the dark.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {problems.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-8 hover:border-slate-300 hover:shadow-md transition-all duration-200"
          >
            <div className="mb-4 h-8 w-8 text-slate-900">
              <item.icon />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-2">{item.title}</h3>
            <p className="text-slate-600">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
