"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const roadmap = [
  {
    title: "Live Pose Guidance",
    detail: "Real-time keypoint tracking with overlays for stance, stride, and swing.",
  },
  {
    title: "Session Summaries",
    detail: "Automatic tagging of drills, rep counts, and highlight clips.",
  },
  {
    title: "Coach Collaboration",
    detail: "Share sessions securely, leave comments, and assign drills.",
  },
  {
    title: "Fitness Foundations",
    detail: "Mobility & strength templates personalized to your goals.",
  },
];

export default function ProductPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Product</p>
        <h1 className="text-4xl font-bold text-slate-50">SportLens AI Overview</h1>
        <p className="mt-3 max-w-2xl text-slate-200/80">
          A multi-sport coaching system starting with cricket. Built for real-time feedback, collaboration, and privacy-friendly analytics.
        </p>
      </motion.div>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {roadmap.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className="card h-full rounded-2xl p-6"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/30">
              {idx + 1}
            </div>
            <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-200/80">{item.detail}</p>
          </motion.div>
        ))}
      </section>

      <section className="mt-12 rounded-3xl bg-gradient-to-r from-sky-600/30 via-slate-900 to-emerald-500/20 p-8 ring-1 ring-sky-500/30">
        <h2 className="text-2xl font-semibold text-slate-50">Built to be deployable anywhere</h2>
        <p className="mt-3 max-w-3xl text-slate-200/80">
          Deploy to Vercel for the landing site, serve the web app via modern edge CDNs, and run FastAPI behind a lightweight GPU or CPU cluster.
          The frontends are optimized for static generation and client-side hydration, while the backend exposes lean REST endpoints.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200/90">
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">Zero-cost local dev</span>
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">Privacy-first processing</span>
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">API-first architecture</span>
        </div>
        <div className="mt-6 flex gap-4">
          <Link
            className="rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
            href="https://app.sportlens.ai"
          >
            Try the web app
          </Link>
          <Link
            className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40"
            href="/tech-stack"
          >
            Explore tech stack
          </Link>
        </div>
      </section>
    </main>
  );
}
