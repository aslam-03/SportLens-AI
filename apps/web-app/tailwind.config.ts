import type { Config } from "tailwindcss";
import { colors, spacing, borderRadius } from "./src/styles/tokens";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Import all color tokens
        primary: colors.primary,
        navy: {
          ...colors.navy,
          950: '#0A1929', // Add navy-950 for dark backgrounds
        },
        cyan: colors.cyan,
        gray: colors.gray,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        
        // Text color utilities - use these with text-* prefix
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: colors.gray[400],
        },
        
        // Background color utilities
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        
        // Legacy support for existing code
        brand: {
          primary: colors.primary[500],
          dark: colors.navy[900],
          accent: colors.success[500],
        },
      },
      spacing,
      borderRadius,
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
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
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
