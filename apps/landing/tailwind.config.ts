import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0EA5E9",
          dark: "#0B172A",
          accent: "#22C55E",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(14, 165, 233, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
