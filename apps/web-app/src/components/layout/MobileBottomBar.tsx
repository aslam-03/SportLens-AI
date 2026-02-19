/**
 * MobileBottomBar Component - Mobile Navigation
 * 
 * Sticky bottom navigation for mobile
 * Shows on all pages except live coaching (which has its own action bar)
 */

import { useNavigate, useLocation } from 'react-router-dom';
import Icons from '../ui/Icon';
import { cn } from '@/utils/cn';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: keyof typeof Icons;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', path: '/', icon: 'Home' },
  { id: 'live', label: 'Live', path: '/live', icon: 'Video' },
  { id: 'sessions', label: 'Sessions', path: '/sessions', icon: 'History' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: 'MessageCircle' },
  { id: 'account', label: 'Account', path: '/account', icon: 'User' },
];

export const MobileBottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Hide on live coaching page (has its own action bar)
  if (location.pathname === '/live' || location.pathname === '/coaching') {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-primary-700 border-t border-primary-600/50 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const IconComponent = Icons[item.icon];
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[60px] h-12 rounded-lg', // 48px touch target
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                active
                  ? 'text-white'
                  : 'text-gray-300 hover:text-white'
              )}
              aria-label={item.label}
            >
              <IconComponent size="md" />
              <span className={cn(
                'text-xs mt-1 font-medium',
                active && 'font-semibold'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
