"use client";

import { motion } from "framer-motion";
import { trustSignals } from "../constants";

export default function TrustStrip() {
  return (
    <section>
      <div className="grid gap-8 md:grid-cols-4">
        {trustSignals.map((item, idx) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="h-6 w-6 text-sky-500 flex-shrink-0">
              <item.icon />
            </div>
            <p className="text-sm font-medium text-slate-700">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
