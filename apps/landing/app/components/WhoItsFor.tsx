"use client";

import { motion } from "framer-motion";

type Audience = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const audiences: Audience[] = [
  {
    title: "Athletes & Students",
    subtitle: "Build repeatable technique with instant cues.",
    bullets: [
      "Train with confidence, even without a coach present",
      "Fix posture errors before they become habits",
      "Track progress session-to-session",
    ],
  },
  {
    title: "Fitness Learners",
    subtitle: "Learn the fundamentals safely and correctly.",
    bullets: [
      "Form correction for foundational movements",
      "Reduce injury risk with alignment guidance",
      "Clear feedback you can apply immediately",
    ],
  },
  {
    title: "Coaches & Academies",
    subtitle: "Scale feedback without losing quality.",
    bullets: [
      "Consistent coaching layer across athletes",
      "Faster review with visible cues and structure",
      "Supports cricket + general fitness programs",
    ],
  },
];

function AudienceIcon({ index }: { index: number }) {
  // Simple inline icon (kept minimal and brand-safe).
  const classes = "h-5 w-5";
  if (index === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden>
        <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z" stroke="currentColor" strokeWidth="2" />
        <path d="M4 22c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden>
        <path d="M7 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 13h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 22c3-2 6-5 6-9a6 6 0 10-12 0c0 4 3 7 6 9Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={classes} aria-hidden>
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7v13h12V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function WhoItsFor() {
  return (
    <section aria-label="Who it's for">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 md:mb-16"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-blue">Who it’s for</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
              Built for real training.
              <span className="text-slate-400"> Not demos.</span>
            </h2>
          </div>
          <p className="text-base md:text-lg text-slate-600 max-w-xl">
            Whether you’re learning form, refining technique, or coaching groups—SportLens AI keeps feedback clear and consistent.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {audiences.map((a, idx) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-10 w-10 rounded-2xl bg-gradient-to-br from-brand-cyan/10 to-white text-brand-blue ring-1 ring-slate-200 flex items-center justify-center">
                <AudienceIcon index={idx} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-950">{a.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{a.subtitle}</p>
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              {a.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-cyan flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
