"use client";

import { motion } from "framer-motion";
import { trustSignals } from "../constants";

export default function TrustStrip() {
  return (
    <section>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
          Built with computer vision + sport-specific biomechanics. Designed for calm, consistent feedback.
        </p>

        <div className="flex flex-wrap gap-3">
          {trustSignals.map((item, idx) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04, duration: 0.35 }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm"
            >
              <div className="h-5 w-5 text-sky-600">
                <item.icon />
              </div>
              <p className="text-sm font-semibold text-slate-800">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
