/**
 * Icon Component
 * 
 * SVG wrapper with consistent sizing and accessibility.
 * Supports size variants and custom colors.
 */

import { SVGAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: IconSize;
  'aria-label'?: string;
}

const sizes: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(
  (
    {
      size = 'md',
      className,
      children,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    return (
      <svg
        ref={ref}
        className={cn(
          'inline-block flex-shrink-0',
          sizes[size],
          className
        )}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={ariaLabel}
        role={ariaLabel ? 'img' : 'presentation'}
        aria-hidden={!ariaLabel}
        {...props}
      >
        {children}
      </svg>
    );
  }
);

Icon.displayName = 'Icon';

// Common icon library
export const Icons = {
  Camera: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  ),
  Play: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </Icon>
  ),
  Stop: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <rect x="6" y="6" width="12" height="12" />
    </Icon>
  ),
  Upload: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Icon>
  ),
  Download: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  ),
  Check: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  ),
  X: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  ),
  Menu: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Icon>
  ),
  ChevronRight: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  ),
  ChevronDown: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  ),
  Info: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </Icon>
  ),
  Warning: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  ),
  User: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  Settings: (props: Omit<IconProps, 'children'>) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
};
