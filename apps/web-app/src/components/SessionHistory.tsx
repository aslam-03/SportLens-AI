export default function SessionHistory() {
  const sessions: Array<{ id: string; title: string; date: string; status: string }> = [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-50">Session History</h3>
        <span className="text-xs text-slate-400">Coming soon</span>
      </div>
      {sessions.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300/80">
          No sessions yet. Start a live coaching session to see your history and summaries here.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sessions.map((session) => (
            <li key={session.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>{session.title}</span>
                <span className="text-xs text-slate-400">{session.date}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-300">{session.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
