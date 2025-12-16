const stats = [
  { label: "Today's focus", value: "Batting stance + Core" },
  { label: "Camera", value: "1080p @ 30fps" },
  { label: "AI model", value: "MoveNet (planned)" },
];

export default function Dashboard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-50">Home / Dashboard</h3>
        <span className="text-xs text-slate-400">Preview</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-sm text-slate-100">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-300/80">
        Use the Live Coaching tab to activate your webcam. Session summaries and analytics will appear under History when implemented.
      </p>
    </div>
  );
}
