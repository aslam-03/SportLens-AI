"use client";

import { motion } from "framer-motion";
import { previews } from "../constants";

function PreviewMock({ variant }: { variant: "live" | "tracking" | "insights" }) {
  if (variant === "insights") {
    return (
      <div className="absolute inset-0 p-4">
        <div className="h-full rounded-xl border border-slate-200 bg-white/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold text-slate-900">Performance</p>
            <p className="text-[11px] text-slate-500">Last 7 days</p>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] text-slate-500">Sessions</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">6</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] text-slate-500">Form avg</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">89%</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-[11px] text-slate-500">Cues</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">14</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-[11px] font-semibold text-slate-700">Trend</p>
              <div className="mt-3 grid grid-cols-7 items-end gap-1.5">
                {[28, 36, 33, 45, 52, 60, 58].map((h, i) => (
                  <div
                    key={i}
                    className="rounded-sm bg-sky-500/70"
                    style={{ height: `${h}%` }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "tracking") {
    return (
      <div className="absolute inset-0 p-4">
        <div className="relative h-full rounded-xl border border-slate-200 bg-slate-950 shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950" />
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_30%,rgba(14,165,233,0.35),transparent_40%)]" />

          <svg className="absolute inset-0" viewBox="0 0 600 360" fill="none" aria-hidden>
            <path d="M300 90 L300 170" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M300 170 L250 230" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M300 170 L350 230" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M250 230 L235 300" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M350 230 L365 300" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M300 120 L240 150" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            <path d="M300 120 L360 150" stroke="rgba(148,163,184,0.55)" strokeWidth="3" />
            {["300,90","300,120","300,170","250,230","350,230","235,300","365,300","240,150","360,150"].map((p, i) => (
              <circle key={i} cx={p.split(",")[0]} cy={p.split(",")[1]} r="7" fill="rgba(14,165,233,0.95)" />
            ))}
          </svg>

          <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            Skeleton overlay
          </div>
          <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            Angle: 38°
          </div>
        </div>
      </div>
    );
  }

  // live
  return (
    <div className="absolute inset-0 p-4">
      <div className="relative h-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-900 shadow-sm overflow-hidden">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_30%_30%,rgba(14,165,233,0.25),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:22px_22px]" />

        <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
          Live cues
        </div>

        <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-white">Cue</p>
            <p className="text-[11px] text-white/75">Now</p>
          </div>
          <p className="mt-1 text-sm font-semibold text-white">Keep head steady through contact</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductPreview() {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 md:mb-16"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">Product</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
              See your technique.
              <span className="text-slate-400"> Fix it instantly.</span>
            </h2>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Live overlays, tracking, and insights—organized so coaches and athletes can move faster.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {previews.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: idx * 0.05 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.20),transparent_38%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:22px_22px]" />

              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-slate-200 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-xs font-semibold text-slate-800">{item.badge}</span>
              </div>

              <PreviewMock
                variant={idx === 0 ? "live" : idx === 1 ? "tracking" : "insights"}
              />
            </div>
            <div className="p-7">
              <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.caption}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
