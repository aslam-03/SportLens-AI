/**
 * Card Component
 * 
 * Flexible card container with variants and hover effects.
 * Used for session history, reports, and content blocks.
 */

import React, { HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<"div">> {
  children?: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  hoverable?: boolean;
  paddingSize?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-navy-800 shadow-md',
  elevated: 'bg-white dark:bg-navy-800 shadow-lg',
  outlined: 'bg-white dark:bg-navy-800 border-2 border-gray-200 dark:border-navy-700',
  glass: 'glass shadow-xl border border-white/20',
};

const paddingSizes: Record<Exclude<CardProps['paddingSize'], undefined>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hoverable = false,
      paddingSize = 'md',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-lg overflow-hidden',
          
          // Variant styles
          variantStyles[variant],
          
          // Padding
          paddingSizes[paddingSize],
          
          // Hoverable
          hoverable && 'cursor-pointer transition-all duration-200',
          
          // Custom className
          className
        )}
        whileHover={hoverable ? { y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } : undefined}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components for better composition
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-gray-900 dark:text-gray-50', className)}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-gray-700 dark:text-gray-300', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 pt-4 border-t border-gray-200 dark:border-navy-700', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
