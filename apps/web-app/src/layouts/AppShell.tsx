/**
 * AppShell - Production-Grade App Layout
 * 
 * Centralized layout with proper navigation:
 * - Desktop: Fixed sidebar (lg+)
 * - Mobile: Header + Bottom bar + Drawer
 * 
 * Clean, professional design with no emojis or excessive glow effects.
 */

import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileBottomBar } from '@/components/layout/MobileBottomBar';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
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
}

export const AppShell = ({ children, currentUser, onLogout }: AppShellProps) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleProfileClick = () => {
    navigate('/account');
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-primary-700">
      {/* Desktop Sidebar - Fixed Left */}
      <Sidebar onLogout={onLogout} />

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className={cn(
        'min-h-screen flex flex-col',
        'lg:ml-64' // Offset for fixed sidebar on desktop
      )}>
        {/* Mobile Header */}
        <Header
          onMenuClick={() => setDrawerOpen(true)}
          currentUser={currentUser}
          onProfileClick={handleProfileClick}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomBar />
      </div>
    </div>
  );
};

export default AppShell;
