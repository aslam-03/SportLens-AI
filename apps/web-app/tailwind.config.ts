import type { Config } from "tailwindcss";
import { colors, spacing, borderRadius, typography } from "./src/styles/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        navy: colors.navy,
        cyan: colors.cyan,
        gray: colors.gray,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        
        // Text utilities
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: colors.gray[300],
        },
      },
      spacing,
      borderRadius,
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      // Remove excessive animations for cleaner UI
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      // Subtle shadows instead of glow
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.2)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
        'none': 'none',
      },
    },
  },
  plugins: [],
} satisfies Config;
