"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const frontend = ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "Vite (app)"];
const backend = ["FastAPI", "Python 3.11", "Uvicorn", "CORS-ready" ];
const vision = ["MediaPipe", "MoveNet", "WebRTC" ];

export default function TechStackPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Tech Stack</p>
        <h1 className="text-4xl font-bold text-slate-50">What powers SportLens AI</h1>
        <p className="mt-3 max-w-3xl text-slate-200/80">
          Modern web tooling on the front, FastAPI on the back. Designed to stay lean, open-source friendly, and deployable on edge or cloud.
        </p>
      </motion.div>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        {[{ title: "Frontend", items: frontend }, { title: "Backend", items: backend }, { title: "Vision", items: vision }].map((stack) => (
          <motion.div
            key={stack.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card h-full rounded-2xl p-6"
          >
            <h3 className="text-lg font-semibold text-slate-50">{stack.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200/80">
              {stack.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </section>

      <section className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-slate-900 to-sky-500/20 p-8 ring-1 ring-emerald-500/30">
        <h2 className="text-2xl font-semibold text-slate-50">Developer experience</h2>
        <p className="mt-3 max-w-3xl text-slate-200/80">
          Use npm for frontends and uvicorn for the backend. Env files stay local with provided .env.example templates. ESLint and Prettier keep the codebase tidy.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200/90">
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">Vercel-ready landing</span>
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">Vite SPA for live coaching</span>
          <span className="rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">FastAPI with CORS</span>
        </div>
        <div className="mt-6 flex gap-4">
          <Link
            className="rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
            href="https://github.com/"
          >
            View source (placeholder)
          </Link>
          <Link
            className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40"
            href="/"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}
