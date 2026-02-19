/**
 * Demo Page for Testing AppShell and Drawer
 * 
 * To test:
 * 1. Import this in your App.tsx
 * 2. Replace main content render with this component
 * 3. Test drawer open/close on mobile and desktop
 * 4. Test keyboard nav (Tab, ESC)
 */

import AppShell from '../layouts/AppShell';
import { Card } from '../components/ui';

export default function ShellDemo() {
  const mockUser = {
    name: 'John Athlete',
    email: 'john@sportlens.ai',
    initials: 'JA',
  };

  const handleStartSession = () => {
    console.log('Start session clicked');
    alert('Session started! (Demo mode)');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    alert('Logged out! (Demo mode)');
  };

  return (
    <AppShell
      currentUser={mockUser}
      onLogout={handleLogout}
      bottomBarPrimaryAction={{
        label: 'Start Session',
        icon: '▶️',
        onClick: handleStartSession,
      }}
      bottomBarSecondaryActions={[
        {
          id: 'freeze',
          icon: '📷',
          label: 'Freeze Frame',
          onClick: () => alert('Freeze Frame clicked!'),
        },
        {
          id: 'upload',
          icon: '📤',
          label: 'Upload',
          onClick: () => alert('Upload clicked!'),
        },
      ]}
    >
      {/* Demo Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to SportLens AI</h1>
          <p className="text-gray-300">Mobile-first responsive layout demo</p>
        </div>

        {/* Test Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">🎯 Responsive Layout</h2>
            <p className="text-gray-300">
              This shell is mobile-first. The drawer appears as an overlay on mobile and as a persistent sidebar on desktop (lg+ viewports).
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">⌨️ Keyboard Navigation</h2>
            <p className="text-gray-300">
              Try pressing Tab to navigate, ESC to close the drawer. All interactive elements are keyboard accessible.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">📱 Mobile Actions</h2>
            <p className="text-gray-300">
              Notice the bottom action bar on mobile. It has 44px touch targets and safe area padding for notches.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">🎨 Design System</h2>
            <p className="text-gray-300">
              All colors come from tokens.ts. The design is dark-themed with cyan accents and smooth Framer Motion animations.
            </p>
          </Card>
        </div>

        {/* Testing Instructions */}
        <Card className="p-6 bg-navy-800/50 border border-navy-700">
          <h3 className="text-lg font-bold text-white mb-4">Testing Checklist</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Toggle drawer on mobile (hamburger menu)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Press ESC to close drawer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Click overlay to close drawer (mobile)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Tab through nav items (focus ring visible)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Resize to desktop (lg: 1024px) - drawer becomes persistent</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-400">✓</span>
              <span>Test on actual mobile device or emulator</span>
            </li>
          </ul>
        </Card>

        {/* Performance Note */}
        <div className="p-4 bg-success/10 border border-success rounded-lg">
          <p className="text-sm text-gray-300">
            <strong>✓ Performance:</strong> The app shell uses Framer Motion for smooth animations on 60fps target. The main thread remains responsive during animations using GPU acceleration.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
