/**
 * Design Tokens for SportLens AI - Production Grade
 * 
 * Clean, professional design system following mobile-first principles.
 * No excessive glow effects, consistent spacing, and clear visual hierarchy.
 */

export const colors = {
  // Primary palette - Deep Navy (Professional)
  primary: {
    50: '#E8EEF7',
    100: '#BFD2E8',
    200: '#92B3D8',
    300: '#6594C8',
    400: '#4988C4', // Accent Blue - use sparingly
    500: '#1C4D8D', // Main Blue
    600: '#164179',
    700: '#0F2854', // Deep Navy - primary background
    800: '#0A1C3E',
    900: '#051028',
  },
  
  // Navy - Background hierarchy
  navy: {
    50: '#F0F2F5',
    100: '#E1E4EA',
    200: '#C3C9D5',
    300: '#A5AEBF',
    400: '#8793AA',
    500: '#697895',
    600: '#4B5D80',
    700: '#2D426B', // Card background
    800: '#1E2F4F', // Slightly lighter than primary-700
    900: '#0F2854', // Deep navy (same as primary-700)
    950: '#0A1929', // Darkest background
  },
  
  // Cyan - Light accent (use minimally)
  cyan: {
    50: '#E0F7FA',
    100: '#B2EBF2',
    200: '#80DEEA',
    300: '#4DD0E1',
    400: '#26C6DA',
    500: '#BDE8F5', // Light Cyan - for highlights only
    600: '#00ACC1',
    700: '#0097A7',
    800: '#00838F',
    900: '#006064',
  },
  
  // Neutrals - Clean grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB', // Muted text
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Semantic colors - subtle, professional
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  
  // Pure colors
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Consistent spacing - 8px grid system
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
} as const;

// Typography - Mobile-first scale
export const typography = {
  // H1: 28 mobile / 40 desktop
  h1Mobile: { fontSize: '1.75rem', lineHeight: '2.25rem', fontWeight: 600 }, // 28px
  h1Desktop: { fontSize: '2.5rem', lineHeight: '3rem', fontWeight: 600 },    // 40px
  
  // H2: 20px
  h2: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: 600 },       // 20px
  
  // Body: 16px
  body: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 400 },         // 16px
  
  // Small: 14px
  small: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 400 },   // 14px
  
  // Muted text color
  mutedClass: 'text-gray-300',
  primaryClass: 'text-white',
} as const;

// Touch targets - minimum 44px for accessibility
export const touchTarget = {
  min: '2.75rem', // 44px
  comfortable: '3rem', // 48px
} as const;

// Animation timing
export const animation = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Border radius - 16px standard
export const borderRadius = {
  none: '0',
  sm: '0.5rem',    // 8px
  DEFAULT: '1rem', // 16px (standard)
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  full: '9999px',
} as const;

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
