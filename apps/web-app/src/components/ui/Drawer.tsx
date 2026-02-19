/**
 * Accessible Drawer/Sidebar Component
 * 
 * Features:
 * - Slide-in animation from left
 * - Focus trap when open
 * - ESC key closes
 * - Click outside (overlay) to close
 * - Mobile responsive (overlay) and desktop (side panel)
 * - Accessible: aria-hidden, role="dialog"
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  width?: number; // In pixels, default 280
  showOverlayOnDesktop?: boolean; // Show overlay on lg+ screens
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Focus trap utility: manages focus within the drawer
 */
function useFocusTrap(isActive: boolean, ref: React.RefObject<HTMLDivElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !ref.current) return;

    // Save the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements in the drawer
    const focusableElements = ref.current.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus the first element
    firstElement?.focus();

    // Handle Tab key within drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: go backwards
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        // Tab: go forwards
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const drawerElement = ref.current;
    drawerElement.addEventListener('keydown', handleKeyDown);

    return () => {
      drawerElement?.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      previousFocusRef.current?.focus();
    };
  }, [isActive, ref]);
}

export const Drawer = ({
  isOpen,
  onClose,
  side = 'left',
  children,
  width = 280,
  showOverlayOnDesktop = false,
  header,
  footer,
}: DrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useFocusTrap(isOpen, drawerRef);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const slideDirection = side === 'left' ? -1 : 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay - Hidden on desktop (lg+) unless showOverlayOnDesktop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed inset-0 bg-black/60 z-40',
              'lg:hidden', // Hidden on desktop
              !showOverlayOnDesktop && 'lg:!hidden' // Force hidden on desktop
            )}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={drawerRef}
            initial={{ x: slideDirection * width }}
            animate={{ x: 0 }}
            exit={{ x: slideDirection * width }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'fixed top-0 z-50 h-full bg-navy-900 shadow-xl',
              'lg:static lg:z-auto lg:h-auto lg:shadow-none', // Desktop behavior
              'flex flex-col',
              side === 'left' ? 'left-0' : 'right-0'
            )}
            style={{ width: `${width}px` }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
          >
            {/* Header */}
            {header && (
              <div className="flex-shrink-0 border-b border-navy-800 p-4">
                {header}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex-shrink-0 border-t border-navy-800 p-4">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
