import { useState } from "react";
import Dashboard from "./components/Dashboard";
import LiveCoaching from "./components/LiveCoaching";
import SessionHistory from "./components/SessionHistory";
import AuthPanel from "./components/auth/AuthPanel";
import { useAuth } from "./hooks/useAuth";

const tabs = [
  { id: "dashboard", label: "Home" },
  { id: "live", label: "Live Coaching" },
  { id: "history", label: "Session History" },
];

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { user, loading, signOutUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-200">
            Checking authentication...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-5 px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-slate-100">SportLens AI</h1>
            <p className="mt-2 text-sm text-slate-300">
              Sign in to access coaching, session history, and reports.
            </p>
          </div>
          <AuthPanel
            title="Welcome back"
            subtitle="Authenticate with Email or Google to continue."
          />
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <a
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:-translate-y-0.5 hover:border-sky-500 hover:text-sky-200"
              href="https://sport-lens-ai.vercel.app/"
              target="_blank"
              rel="noreferrer"
            >
              Landing site
            </a>
            <>
              <span className="max-w-40 truncate text-xs text-slate-300">{user.email}</span>
              <button
                onClick={() => {
                  void signOutUser();
                  setActiveTab("dashboard");
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-100 transition hover:border-sky-500 hover:text-sky-200"
              >
                Sign out
              </button>
            </>
          </div>
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
