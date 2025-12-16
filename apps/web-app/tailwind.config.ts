import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0EA5E9",
          dark: "#0B122A",
          accent: "#22C55E",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
