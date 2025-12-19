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
          cyan: "#07cff6",
          blue: "#194162",
          paper: "#f6feff",
          ink: "#04131e",
          black: "#020204",
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(7, 207, 246, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
