/**
 * useViewport Hook
 * 
 * Detects viewport size and provides mobile breakpoint detection.
 * Uses window resize listener with debounce for performance.
 */

import { useState, useEffect } from 'react';
import { breakpoints } from '../styles/tokens';

interface ViewportSize {
  width: number;
  height: number;
}

interface ViewportState extends ViewportSize {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
}

// Parse breakpoint string to number
const parseBreakpoint = (bp: string): number => parseInt(bp.replace('px', ''), 10);

const BREAKPOINT_VALUES = {
  sm: parseBreakpoint(breakpoints.sm),
  md: parseBreakpoint(breakpoints.md),
  lg: parseBreakpoint(breakpoints.lg),
  xl: parseBreakpoint(breakpoints.xl),
};

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return {
    ...viewport,
    isMobile: viewport.width < BREAKPOINT_VALUES.md,
    isTablet: viewport.width >= BREAKPOINT_VALUES.md && viewport.width < BREAKPOINT_VALUES.lg,
    isDesktop: viewport.width >= BREAKPOINT_VALUES.lg && viewport.width < BREAKPOINT_VALUES.xl,
    isLargeDesktop: viewport.width >= BREAKPOINT_VALUES.xl,
  };
}
