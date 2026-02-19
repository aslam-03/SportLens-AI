/**
 * Avatar Component
 * 
 * Displays user avatar with fallback to initials.
 * Sizes: sm, md, lg
 * States: default, loading, error
 */

import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar = ({
  src,
  alt = 'User avatar',
  initials = '?',
  size = 'md',
  className,
  onClick,
}: AvatarProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center',
        'rounded-full font-bold',
        'bg-gradient-to-br from-primary-600 to-primary-700',
        'text-white',
        'flex-shrink-0',
        sizeStyles[size],
        onClick && 'cursor-pointer hover:from-primary-700 hover:to-primary-800 transition-all',
        className
      )}
      title={alt}
      type="button"
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full rounded-full object-cover'
          )}
        />
      ) : (
        <span>{initials}</span>
      )}
    </button>
  );
};

export default Avatar;
