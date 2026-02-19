/**
 * Badge Component
 * 
 * Small label for status indicators, counters, and tags.
 * Used for session status, violation counts, and activity types.
 */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-navy-700 text-gray-800 dark:text-gray-200',
  success: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
  error: 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400',
  info: 'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400',
  outline: 'bg-transparent border-2 border-gray-300 dark:border-navy-600 text-gray-700 dark:text-gray-300',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center font-medium rounded-full',
          
          // Variant styles
          variantStyles[variant],
          
          // Size styles
          sizeStyles[size],
          
          // Custom className
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
