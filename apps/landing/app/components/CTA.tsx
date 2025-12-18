"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-12 md:p-16 text-center"
      >
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950 mb-6">
          Ready to train smarter?
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
          Launch SportLens AI, enable your webcam, and get instant AI-powered coaching for every rep.
        </p>
        <Link
          href="https://app.sportlens.ai"
          className="inline-flex items-center justify-center px-8 py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors duration-200 text-lg"
        >
          Launch App
        </Link>
      </motion.div>
    </section>
  );
}
