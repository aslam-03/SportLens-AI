/**
 * Skeleton Component
 * 
 * Loading placeholder with pulse animation.
 * Used for lazy-loaded content and async data fetching.
 */

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type SkeletonVariant = 'text' | 'circular' | 'rectangular';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-md',
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'rectangular',
      width,
      height,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'bg-gray-200 dark:bg-navy-700 animate-pulse',
          
          // Variant styles
          variantStyles[variant],
          
          // Custom className
          className
        )}
        style={{
          width,
          height,
          ...style,
        }}
        role="status"
        aria-label="Loading..."
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-configured skeleton components
export const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '70%' : '100%'}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);
