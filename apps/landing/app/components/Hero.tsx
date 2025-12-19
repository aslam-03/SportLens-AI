"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.25 7.25a1 1 0 01-1.415 0l-3.25-3.25a1 1 0 011.415-1.415l2.542 2.542 6.542-6.542a1 1 0 011.415 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MockCoachingView() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_80px_-40px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-cyan" />
          <p className="text-xs font-semibold text-slate-700">Live coaching</p>
          <span className="text-[11px] text-slate-500">1080p • 30fps</span>
        </div>
        <div className="text-[11px] text-slate-500">Webcam</div>
      </div>

      <div className="relative aspect-[4/3]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
        <Image
          src="https://static.vecteezy.com/system/resources/previews/055/913/265/non_2x/cricket-player-silhouette-in-action-for-sports-website-graphics-vector.jpg"
          alt="Cricket player silhouette"
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" />

        {/* Overlay callouts */}
        <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
          Pose locked • 17 keypoints
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
          Timing: <span className="text-brand-cyan">Good</span>
        </div>

        <div className="absolute left-4 bottom-16 grid gap-2">
          <div className="w-fit rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white ring-1 ring-white/15 backdrop-blur">
            Front knee: <span className="font-semibold text-brand-cyan">stable</span>
          </div>
          <div className="w-fit rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white ring-1 ring-white/15 backdrop-blur">
            Hip angle: <span className="font-semibold">42°</span>
          </div>
        </div>

        {!reduceMotion && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-cyan/20 to-transparent"
            animate={{ y: [0, 220, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-900">Session feedback</p>
          <p className="text-xs text-slate-500">Last 30s</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500">Form</p>
            <p className="text-sm font-semibold text-slate-900">92%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500">Stability</p>
            <p className="text-sm font-semibold text-slate-900">Good</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] text-slate-500">Cue</p>
            <p className="text-sm font-semibold text-slate-900">+2</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex items-start justify-center overflow-hidden bg-brand-paper min-h-[74vh] pt-2 pb-10 md:pt-6 md:pb-12">
      {/* Keep the hero background clean: push decorative radials higher + smaller so the space down to the scroll arrow stays mostly plain. */}
      <div className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 h-[22rem] bg-[radial-gradient(closest-side,rgba(7,207,246,0.18),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[-7rem] -z-10 h-[18rem] bg-[radial-gradient(closest-side,rgba(25,65,98,0.08),transparent)]" />

      <div className="mx-auto max-w-6xl px-6 w-full">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center justify-center text-center md:items-start md:text-left"
          >
            <motion.p
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
              Real-time coaching from your webcam
            </motion.p>
            
            <motion.h1
              className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-brand-ink leading-[1.05]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Your AI Coach for Cricket &amp; Fitness
            </motion.h1>
            
            <motion.p
              className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Real-time posture and technique feedback from your webcam—so you can fix form, faster.
            </motion.p>

            <motion.div
              className="mt-6 flex flex-wrap gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.8 }}
            >
              {[
                "Live coaching overlays",
                "Biomechanics cues",
                "Cricket + fitness modes",
              ].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-700"
                >
                  <span className="text-brand-blue"><CheckIcon /></span>
                  {t}
                </span>
              ))}
            </motion.div>
            
            <motion.div
              className="mt-7 flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <Link
                href="https://app.sportlens.ai"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-gradient-to-br from-brand-blue to-brand-cyan hover:shadow-lg hover:from-brand-blue hover:to-brand-cyan hover:opacity-95 text-white font-semibold rounded-xl transition-all duration-200 text-base shadow-sm"
              >
                Download App
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center px-7 py-3.5 border border-slate-300 hover:border-slate-400 bg-white/80 text-brand-ink font-semibold rounded-xl transition-colors duration-200 text-base shadow-sm"
              >
                See How It Works
              </Link>
            </motion.div>

            <p className="mt-4 text-xs text-slate-500">Runs in your browser. No hardware required.</p>
          </motion.div>

          {/* Right: Product mock */}
          <motion.div
            className="relative md:ml-auto md:max-w-[520px] lg:max-w-[560px] w-full"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <div className="relative origin-top md:-translate-y-1 md:scale-[0.92] lg:translate-y-0 lg:scale-[0.96]">
              {!reduceMotion && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-brand-cyan/10 blur-2xl"
                  animate={{ opacity: [0.35, 0.55, 0.35] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <MockCoachingView />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      {!reduceMotion && (
        <motion.div
          className="absolute bottom-5 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      )}
    </section>
  );
}
