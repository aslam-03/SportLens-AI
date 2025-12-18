"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-white to-slate-50 flex items-center justify-center overflow-hidden py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6 w-full">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-start justify-center"
          >
            <motion.p
              className="inline-block rounded-full bg-sky-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-sky-600 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
            >
              AI-Powered Coaching
            </motion.p>
            
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-950 leading-tight mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Your AI coach in every move
            </motion.h1>
            
            <motion.p
              className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed max-w-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Real-time feedback on posture, technique, and form. Master cricket and fitness with instant AI-powered coaching.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <Link
                href="https://app.sportlens.ai"
                className="inline-flex items-center justify-center px-6 py-3 md:px-8 md:py-4 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors duration-200 text-base md:text-lg"
              >
                Launch App
              </Link>
              <Link
                href="#solution"
                className="inline-flex items-center justify-center px-6 py-3 md:px-8 md:py-4 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg transition-colors duration-200 text-base md:text-lg"
              >
                See How It Works
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            className="relative aspect-square md:aspect-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 w-full h-64 md:h-96">
              <Image
                src="https://static.vecteezy.com/system/resources/previews/055/913/265/non_2x/cricket-player-silhouette-in-action-for-sports-website-graphics-vector.jpg"
                alt="Cricket batsman in action"
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
}
