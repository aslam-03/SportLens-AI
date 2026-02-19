/**
 * Button Component
 * 
 * Production-grade button with variants, sizes, and accessibility features.
 * Supports primary, secondary, and ghost variants with loading states.
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">> {
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white shadow-lg hover:shadow-xl hover:shadow-primary-900/30 disabled:bg-primary-300 transition-all duration-200',
  secondary: 'bg-navy-800 hover:bg-navy-700 active:bg-navy-600 text-white border border-navy-600 hover:border-primary-500/50 disabled:bg-navy-900 transition-all duration-200',
  ghost: 'bg-transparent hover:bg-navy-800/50 text-gray-400 hover:text-white disabled:bg-transparent transition-all duration-200',
  danger: 'bg-error-600 hover:bg-error-500 active:bg-error-700 text-white shadow-lg hover:shadow-xl disabled:bg-error-300 transition-all duration-200',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm h-9',
  md: 'px-4 py-2 text-base h-11 touch-target',
  lg: 'px-6 py-3 text-lg h-14 touch-target',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 flex-nowrap',
          'font-medium rounded-lg',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
          
          // Variant styles
          variantStyles[variant],
          
          // Size styles
          sizeStyles[size],
          
          // Full width
          isFullWidth && 'w-full',
          
          // Custom className
          className
        )}
        disabled={isDisabled}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        transition={{ duration: 0.15 }}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        
        <span>{children}</span>
        
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
