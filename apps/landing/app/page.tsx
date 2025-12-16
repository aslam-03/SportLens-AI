"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Motion Insights",
    description: "Computer-vision powered feedback on stance, swing, and posture.",
  },
  {
    title: "Sport-Specific Coaching",
    description: "Cricket drills, strength & conditioning, and mobility programs.",
  },
  {
    title: "Real-Time Guidance",
    description: "Live overlays and cues to correct form as you train.",
  },
];

const steps = [
  "Open the web app and allow camera access.",
  "Pick a drill or workout routine.",
  "Get instant AI cues and session summaries.",
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12 md:py-16">
      <header className="flex flex-col gap-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-fit rounded-full bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200"
        >
          AI Coaching for Cricket & Fitness
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-4xl font-bold text-slate-50 sm:text-5xl md:text-6xl"
        >
          Train smarter with <span className="text-sky-400">SportLens AI</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto max-w-2xl text-lg text-slate-200/80"
        >
          Real-time AI cues, posture tracking, and session insights built for cricket athletes and fitness enthusiasts.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="flex justify-center gap-4"
        >
          <Link
            className="rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-sky-400"
            href="https://app.sportlens.ai"
          >
            Launch Coaching App
          </Link>
          <Link
            className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-sky-500 hover:text-sky-200"
            href="/product"
          >
            View Product Overview
          </Link>
        </motion.div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.1 }}
            className="card h-full rounded-2xl p-6"
          >
            <div className="mb-4 h-10 w-10 rounded-full bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30" />
            <h3 className="mb-2 text-lg font-semibold text-slate-50">{feature.title}</h3>
            <p className="text-sm text-slate-300/80">{feature.description}</p>
          </motion.div>
        ))}
      </section>

      <section className="card grid gap-10 rounded-3xl p-8 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">How it works</p>
          <h2 className="mb-4 text-3xl font-bold text-slate-50">AI in the loop for every rep</h2>
          <p className="text-slate-200/80">
            We pair computer vision with coaching heuristics. Your camera feed stays on-device while we generate overlays and cues in real time.
          </p>
        </motion.div>
        <motion.ol
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-3 text-slate-200/80"
        >
          {steps.map((step, idx) => (
            <li key={step} className="flex gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-100 ring-1 ring-sky-500/30">
                {idx + 1}
              </span>
              <div className="pt-2 text-sm leading-relaxed">{step}</div>
            </li>
          ))}
        </motion.ol>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card rounded-2xl p-6"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Built for teams & individuals</p>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">Cricket focus, fitness fundamentals</h3>
          <p className="text-sm text-slate-200/80">
            Batting stance, bowling stride, fielding agility, and general mobility. SportLens AI guides you with contextual tips and visual overlays.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card rounded-2xl p-6"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Privacy-first</p>
          <h3 className="mb-3 text-xl font-semibold text-slate-50">Your camera, your data</h3>
          <p className="text-sm text-slate-200/80">
            Live processing happens in-browser. Export summaries to share with coaches or keep your training data local.
          </p>
        </motion.div>
      </section>

      <section className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-sky-500/20 via-slate-900 to-emerald-500/20 p-10 text-center ring-1 ring-sky-500/30">
        <h3 className="text-2xl font-bold text-slate-50">Ready to level up your training?</h3>
        <p className="max-w-2xl text-slate-200/80">
          Start with the web app to see live overlays, or explore the product overview to understand the roadmap.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-emerald-400"
            href="https://app.sportlens.ai"
          >
            Start a Session
          </Link>
          <Link
            className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40"
            href="/tech-stack"
          >
            See the Tech Stack
          </Link>
        </div>
      </section>
    </main>
  );
}
