/**
 * MobileDrawer Component - Mobile Menu
 * 
 * Slide-in drawer for mobile navigation
 * Includes profile section, nav links, and logout
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icons from '../ui/Icon';
import Avatar from '../ui/Avatar';
import { cn } from '@/utils/cn';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: keyof typeof Icons;
}

const navItems: NavItem[] = [
  { id: 'home',label: 'Home', path: '/', icon: 'Home' },
  { id: 'live', label: 'Live Coaching', path: '/live', icon: 'Video' },
  { id: 'sessions', label: 'Sessions', path: '/sessions', icon: 'History' },
  { id: 'gallery', label: 'Gallery', path: '/gallery', icon: 'Camera' },
  { id: 'account', label: 'Account', path: '/account', icon: 'User' },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    name: string;
    email: string;
    initials?: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

export const MobileDrawer = ({ isOpen, onClose, currentUser, onLogout }: MobileDrawerProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    onLogout?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-primary-700 shadow-2xl z-50 flex flex-col"
          >
            {/* Header with Profile */}
            <div className="flex-shrink-0 px-6 py-6 border-b border-primary-600/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Menu</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-300 hover:bg-primary-600/50 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <Icons.X size="md" />
                </button>
              </div>

              {currentUser && (
                <div className="flex items-center gap-3">
                  <Avatar
                    name={currentUser.name}
                    initials={currentUser.initials}
                   imageUrl={currentUser.avatar}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-gray-300 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const IconComponent = Icons[item.icon];
                const active = isActive(item.path);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                      'text-left text-sm font-medium transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400',
                      active
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-gray-300 hover:bg-primary-600/50 hover:text-white'
                    )}
                  >
                    <IconComponent size="md" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="flex-shrink-0 border-t border-primary-600/50 p-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-gray-300 hover:bg-primary-600/50 hover:text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <Icons.LogOut size="md" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
