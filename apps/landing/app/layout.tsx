import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SportLens AI | AI-Powered Coaching",
  description: "Real-time AI coaching for Cricket and Fitness.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} gradient-ring min-h-screen`}>{children}</body>
    </html>
  );
}
