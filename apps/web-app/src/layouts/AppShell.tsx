import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Drawer from '../components/ui/Drawer';
import Avatar from '../components/ui/Avatar';
import BottomBar from '../components/ui/BottomBar';
import { cn } from '@/utils/cn';

interface AppShellProps {
  children: ReactNode;
  currentUser?: {
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
  };
  onLogout?: () => void;
  onProfileClick?: () => void;
  bottomBarPrimaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    isLoading?: boolean;
  };
  bottomBarSecondaryActions?: Array<{
    id: string;
    icon: ReactNode;
    label: string;
    onClick: () => void;
  }>;
}

// Navigation menu items
const navItems = [
  { id: 'home', label: 'Home', icon: '🏠', path: '/' },
  { id: 'coaching', label: 'Live Coaching', icon: '📹', path: '/coaching' },
  { id: 'sessions', label: 'Sessions', icon: '📊', path: '/sessions' },
  { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
];

const footerItems = [
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
  { id: 'help', label: 'Help', icon: '❓', path: '/help' },
];

export const AppShell = ({
  children,
  currentUser,
  onLogout,
  onProfileClick,
  bottomBarPrimaryAction,
  bottomBarSecondaryActions = [],
}: AppShellProps) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Navigation handler
  const handleNavClick = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    onLogout?.();
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop Sidebar - Persistent on lg+ */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-navy-900 lg:border-r lg:border-navy-700 lg:overflow-y-auto">
        {/* Logo/Title */}
        <div className="flex-shrink-0 px-4 py-6 border-b border-navy-800">
          <h1 className="text-xl font-bold text-white">SportLens AI</h1>
          <p className="text-xs text-gray-400 mt-1">AI Coaching Platform</p>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                'text-left text-sm font-medium',
                'transition-colors duration-200',
                'hover:bg-navy-800 text-gray-300 hover:text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Desktop Footer Section */}
        <div className="flex-shrink-0 border-t border-navy-800 p-2">
          {footerItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 rounded-lg',
                'text-xs font-medium text-gray-400 hover:text-white',
                'hover:bg-navy-800 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Auth Button - Desktop */}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2 mt-3 rounded-lg',
              'text-sm font-medium',
              'bg-red-600/10 text-red-400 hover:bg-red-600/20',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-red-500'
            )}
          >
            <span>🚪</span>
            <span>{currentUser ? 'Logout' : 'Login'}</span>
          </button>
        </div>

        {/* User Profile - Desktop */}
        {currentUser && (
          <div className="flex-shrink-0 border-t border-navy-800 p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Avatar
                src={currentUser.avatar}
                initials={currentUser.initials || 'US'}
                size="md"
                onClick={onProfileClick}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="flex-shrink-0 bg-navy-900 border-b border-navy-800 lg:hidden">
          <div className="flex items-center justify-between px-4 h-16">
            {/* Hamburger Menu - Mobile */}
            <motion.button
              onClick={() => setDrawerOpen(!drawerOpen)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'p-2 rounded-lg text-gray-300 hover:text-white',
                'hover:bg-navy-800 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
              aria-label="Toggle menu"
              type="button"
            >
              <span className="text-xl">☰</span>
            </motion.button>

            {/* Logo/Title - Center */}
            <h1 className="text-lg font-bold text-white">SportLens</h1>

            {/* Profile Avatar - Right */}
            {currentUser && (
              <Avatar
                src={currentUser.avatar}
                initials={currentUser.initials || 'US'}
                size="md"
                onClick={onProfileClick}
              />
            )}
          </div>
        </header>

        {/* Mobile/Desktop Drawer */}
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          header={
            currentUser && (
              <div className="flex items-center gap-3">
                <Avatar
                  src={currentUser.avatar}
                  initials={currentUser.initials || 'US'}
                  size="lg"
                  onClick={onProfileClick}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                  <p className="text-xs text-gray-400">{currentUser.email}</p>
                </div>
              </div>
            )
          }
          footer={
            <button
              onClick={handleLogout}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
                'text-sm font-medium',
                'bg-red-600/10 text-red-400 hover:bg-red-600/20',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-red-500'
              )}
            >
              <span>🚪</span>
              <span>{currentUser ? 'Logout' : 'Login'}</span>
            </button>
          }
        >
          {/* Mobile Navigation */}
          <nav className="px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg',
                  'text-left text-sm font-medium',
                  'transition-colors duration-200',
                  'hover:bg-navy-800 text-gray-300 hover:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500'
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Footer Navigation */}
          <div className="px-2 py-4 border-t border-navy-700 space-y-1">
            {footerItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 rounded-lg',
                  'text-left text-xs font-medium',
                  'text-gray-400 hover:text-white hover:bg-navy-800',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Drawer>

        {/* Main Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-bg"
          role="main"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Action Bar */}
      {bottomBarPrimaryAction && (
        <BottomBar
          primaryAction={bottomBarPrimaryAction}
          secondaryActions={bottomBarSecondaryActions}
        />
      )}
    </div>
  );
};

export default AppShell;
