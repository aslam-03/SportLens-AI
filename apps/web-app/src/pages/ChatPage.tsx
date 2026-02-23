/**
 * Chat Page - AI Coach Assistant
 * 
 * Full-screen chat interface integrated with AppShell layout.
 * Uses ChatLayout component for the actual chat experience.
 * The page fills the available viewport height properly on both mobile and desktop.
 */

import { AppShell } from '@/layouts/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { ChatLayout } from '@/components/chat/ChatLayout';

interface User {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export default function ChatPage() {
  const { user, signOutUser } = useAuth();

  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials:
      user?.displayName
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U',
  };

  return (
    <AppShell currentUser={currentUser} onLogout={signOutUser}>
      {/* 
        Chat takes full remaining height.
        On desktop: header is hidden (sidebar), so calc accounts for mobile bottom bar.
        On mobile: header ~64px + bottom bar ~64px = ~128px
      */}
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
        <ChatLayout
          userId={user?.uid || ''}
          className="flex-1 min-h-0"
        />
      </div>
    </AppShell>
  );
}
