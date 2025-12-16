import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LiveCoaching from "./components/LiveCoaching";
import SessionHistory from "./components/SessionHistory";

const tabs = [
  { id: "dashboard", label: "Home" },
  { id: "live", label: "Live Coaching" },
  { id: "history", label: "Session History" },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30" />
            <div>
              <p className="text-sm text-slate-300">SportLens AI</p>
              <p className="text-xs text-slate-400">Cricket & Fitness Coaching</p>
            </div>
          </div>
          <a
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:-translate-y-0.5 hover:border-sky-500 hover:text-sky-200"
            href="https://sportlens.ai"
            target="_blank"
            rel="noreferrer"
          >
            Landing site
          </a>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
                  : "border border-white/10 bg-white/5 text-slate-200 hover:border-sky-500/50 hover:text-sky-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "live" && <LiveCoaching />}
        {activeTab === "history" && <SessionHistory />}
      </main>
    </div>
  );
}

export default App;
