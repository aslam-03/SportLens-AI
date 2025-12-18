"use client";

import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import TrustStrip from "./components/TrustStrip";
import Problem from "./components/Problem";
import SolutionFlow from "./components/SolutionFlow";
import Features from "./components/Features";
import UseCases from "./components/UseCases";
import ProductPreview from "./components/ProductPreview";
import CTA from "./components/CTA";

export default function Home() {
  return (
    <main className="bg-white">
      <Navbar />
      <Hero />
      <div className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-3 md:py-4">
          <TrustStrip />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Problem />
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24" id="solution">
        <SolutionFlow />
      </div>
      <div className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24" id="features">
          <Features />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24" id="use-cases">
        <UseCases />
      </div>
      <div className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24" id="product">
          <ProductPreview />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <CTA />
      </div>
    </main>
  );
}
