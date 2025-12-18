"use client";

import { motion } from "framer-motion";
import { previews } from "../constants";

export default function ProductPreview() {
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
          See it in action
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Real-time coaching overlays that guide every movement.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {previews.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: idx * 0.05 }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 group"
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5">
                  <div className="h-2 w-2 rounded-full bg-sky-500" />
                  <span className="text-xs font-semibold text-sky-700">{item.badge}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-950 mb-2 group-hover:text-sky-600 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600">{item.caption}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
