/**
 * Header Component - Mobile Top Bar
 * 
 * Mobile header with: Hamburger (left) | Title (center) | Avatar (right)
 * Touch-friendly with 44px+ targets
 */

import { useLocation } from 'react-router-dom';
import Icons from '../ui/Icon';
import Avatar from '../ui/Avatar';
import { cn } from '@/utils/cn';

interface HeaderProps {
  onMenuClick: () => void;
  currentUser?: {
    name: string;
    initials?: string;
    avatar?: string;
  };
  onProfileClick?: () => void;
}

// Page titles for each route
const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/live': 'Live Coaching',
  '/coaching': 'Live Coaching',
  '/sessions': 'Sessions',
  '/account': 'Account',
  '/reports': 'Reports',
};

export const Header = ({ onMenuClick, currentUser, onProfileClick }: HeaderProps) => {
  const location = useLocation();

  // Get page title from current route
  const getPageTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (path === '/') {
        if (location.pathname === '/') return title;
      } else if (location.pathname.startsWith(path)) {
        return title;
      }
    }
    return 'SportLens AI';
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-primary-700 border-b border-primary-600/50 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Hamburger Menu */}
        <button
          onClick={onMenuClick}
          className={cn(
            'flex items-center justify-center',
            'w-11 h-11 rounded-lg', // 44px touch target
            'text-gray-200 hover:bg-primary-600/50 hover:text-white',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-400'
          )}
          aria-label="Open menu"
        >
          <Icons.Menu size="lg" />
        </button>

        {/* Page Title */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-white">
          {getPageTitle()}
        </h1>

        {/* Profile Avatar */}
        {currentUser && (
          <button
            onClick={onProfileClick}
            className="focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-full"
            aria-label="Open profile"
          >
            <Avatar
              name={currentUser.name}
              initials={currentUser.initials}
              imageUrl={currentUser.avatar}
              size="sm"
            />
          </button>
        )}
      </div>
    </header>
  );
};
