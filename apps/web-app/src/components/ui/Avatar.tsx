/**
 * Avatar Component
 * 
 * Displays user avatar with fallback to initials.
 * Always renders a <div> — never a <button>.
 * Parent components handle click behavior to avoid nested <button> issues.
 */

import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string;
  imageUrl?: string;
  alt?: string;
  name?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar = ({
  src,
  imageUrl,
  alt,
  name,
  initials = '?',
  size = 'md',
  className,
}: AvatarProps) => {
  const imgSrc = src || imageUrl;
  const altText = alt || name || 'User avatar';

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'rounded-full font-bold',
        'bg-gradient-to-br from-primary-600 to-primary-700',
        'text-white',
        'flex-shrink-0',
        sizeStyles[size],
        className
      )}
      title={altText}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={altText}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;
