/**
 * Sidebar Component - Desktop Navigation
 * 
 * Fixed left sidebar for desktop-view (lg+)
 * Professional, clean design with active route highlighting
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  { id: 'live', label: 'Live Coaching', path: '/live', icon: 'Video' },
  { id: 'sessions', label: 'Sessions', path: '/sessions', icon: 'History' },
  { id: 'gallery', label: 'Gallery', path: '/gallery', icon: 'Camera' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: 'MessageCircle' },
  { id: 'account', label: 'Account', path: '/account', icon: 'User' },
];

interface SidebarProps {
  onLogout?: () => void;
}

export const Sidebar = ({ onLogout }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-navy-950 lg:border-r lg:border-navy-800 lg:fixed lg:inset-y-0 lg:z-50">
      {/* Logo */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-navy-800">
        <h1 className="text-xl font-semibold text-white">SportLens AI</h1>
        <p className="text-xs text-gray-300 mt-1">Real-time Coaching</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const IconComponent = Icons[item.icon];
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                'text-left text-sm font-medium transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                active
                  ? 'bg-navy-900 border-l-2 border-primary-500 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-navy-900 hover:text-white'
              )}
            >
              <IconComponent size="md" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t border-navy-800 p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-gray-400 hover:bg-navy-900 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <Icons.LogOut size="md" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
