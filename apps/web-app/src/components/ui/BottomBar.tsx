/**
 * Mobile Bottom Action Bar
 * 
 * Sticky action bar for mobile devices (lg: hidden)
 * Features:
 * - Primary action button (center, large)
 * - Secondary action icons (left/right)
 * - Safe area padding
 * - 44px minimum touch targets
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface BottomBarAction {
  id: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface BottomBarProps {
  primaryAction: {
    label: string;
    onClick: () => void;
    isLoading?: boolean;
    icon?: ReactNode;
  };
  secondaryActions?: BottomBarAction[];
  className?: string;
  pulsePrimary?: boolean; // Add pulse animation to primary button
}

export const BottomBar = ({
  primaryAction,
  secondaryActions = [],
  className,
  pulsePrimary = false,
}: BottomBarProps) => {
  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-20 lg:hidden" />

      {/* Sticky bottom bar - mobile only */}
      <div
        className={cn(
          // Base styles
          'fixed bottom-0 left-0 right-0 z-30',
          'bg-gradient-to-t from-navy-900 to-navy-800',
          'border-t border-navy-700/50',
          'lg:hidden',
          className
        )}
        // Safe area padding for notches/home indicators
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          {/* Secondary actions - left */}
          <div className="flex gap-1">
            {secondaryActions
              .filter((a) => a.variant !== 'primary')
              .slice(0, 2)
              .map((action) => (
                <motion.button
                  key={action.id}
                  onClick={action.onClick}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'flex items-center justify-center',
                    'w-11 h-11 rounded-lg',
                    'text-gray-400 hover:text-white',
                    'hover:bg-navy-700 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500'
                  )}
                  aria-label={action.label}
                  title={action.label}
                  type="button"
                >
                  {action.icon}
                </motion.button>
              ))}
          </div>

          {/* Primary action - center */}
          <motion.button
            onClick={primaryAction.onClick}
            disabled={primaryAction.isLoading}
            whileTap={!primaryAction.isLoading ? { scale: 0.98 } : undefined}
            animate={pulsePrimary ? { scale: [1, 1.02, 1] } : undefined}
            transition={pulsePrimary ? { repeat: Infinity, duration: 2 } : undefined}
            className={cn(
              // Base
              'flex-1 max-w-xs mx-auto',
              'h-12 rounded-lg',
              'font-semibold text-base',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              // Colors
              'bg-gradient-to-r from-primary-600 to-primary-700',
              'hover:from-primary-700 hover:to-primary-800',
              'active:from-primary-800 active:to-primary-900',
              'text-white',
              // Focus
              'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label={primaryAction.label}
            type="button"
          >
            {primaryAction.icon && <span>{primaryAction.icon}</span>}
            <span>{primaryAction.label}</span>
          </motion.button>

          {/* Secondary actions - right */}
          <div className="flex gap-1">
            {secondaryActions
              .filter((a) => a.variant !== 'primary')
              .slice(2, 4)
              .map((action) => (
                <motion.button
                  key={action.id}
                  onClick={action.onClick}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'flex items-center justify-center',
                    'w-11 h-11 rounded-lg',
                    'text-gray-400 hover:text-white',
                    'hover:bg-navy-700 transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500'
                  )}
                  aria-label={action.label}
                  title={action.label}
                  type="button"
                >
                  {action.icon}
                </motion.button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BottomBar;
