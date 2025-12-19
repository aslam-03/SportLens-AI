import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import VisionQuote from "./components/VisionQuote";
import SolutionFlow from "./components/SolutionFlow";
import Features from "./components/Features";
import WhoItsFor from "./components/WhoItsFor";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="relative isolate bg-brand-paper">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 h-[34rem] bg-[radial-gradient(closest-side,rgba(7,207,246,0.18),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-[9rem] -z-10 h-[28rem] bg-[radial-gradient(closest-side,rgba(25,65,98,0.12),transparent)]" />

      <Navbar />
      <Hero />

      {/* 2) Product vision / inspiration */}
      <section className="py-10 md:py-14">
        <VisionQuote />
      </section>

      {/* 3) How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28" id="how-it-works">
        <SolutionFlow />
      </section>

      {/* 4) Features */}
      <section className="bg-slate-50/70 border-y border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28" id="features">
          <Features />
        </div>
      </section>

      {/* 5) Who it's for */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28" id="who-its-for">
        <WhoItsFor />
      </section>

      {/* 6) Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <CTA />
      </section>

      {/* 7) Footer */}
      <Footer />
    </main>
  );
}
