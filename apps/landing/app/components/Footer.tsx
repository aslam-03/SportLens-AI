import Link from "next/link";

const footerNav = [
  { label: "Home", href: "#" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Who it’s for", href: "#who-its-for" },
];

const resources = [
  // Keep these as external placeholders until you provide real URLs.
  { label: "Docs", href: "https://github.com" },
  { label: "GitHub", href: "https://github.com" },
];

const legal = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-sm ring-1 ring-brand-cyan/30">
                <span className="text-white font-bold text-lg leading-none">S</span>
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-slate-950">SportLens AI</p>
                <p className="text-xs text-slate-500">AI-powered coaching for Cricket & Fitness</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 max-w-md">
              SportLens AI turns your webcam into a coaching layer—tracking movement, detecting errors, and guiding technique with calm, real-time feedback.
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Webcam-only. No wearables required.
            </p>
          </div>

          <div className="md:col-span-7">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Navigation</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {footerNav.map((l) => (
                    <li key={l.label}>
                      <Link className="text-slate-600 hover:text-slate-900" href={l.href}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Resources</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {resources.map((l) => (
                    <li key={l.label}>
                      <a className="text-slate-600 hover:text-slate-900" href={l.href} target="_blank" rel="noreferrer">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Legal</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {legal.map((l) => (
                    <li key={l.label}>
                      <Link className="text-slate-600 hover:text-slate-900" href={l.href}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© SportLens AI. All rights reserved.</p>
          <p>Built for modern sports-tech teams and athletes.</p>
        </div>
      </div>
    </footer>
  );
}
