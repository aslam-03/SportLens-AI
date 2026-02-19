import { AppShell } from '@/layouts/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icon';

interface User {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export default function ChatPage() {
  const { user, signOutUser } = useAuth();

  // Current user from auth
  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  };

  return (
    <AppShell currentUser={currentUser} onLogout={signOutUser}>
      <div className="min-h-screen bg-navy-950 px-4 py-8 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              AI Chat Assistant
            </h1>
            <p className="text-text-secondary">
              Get instant coaching insights and personalized recommendations
            </p>
          </div>

          {/* Coming Soon Card */}
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Icon */}
              <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center">
                <Icons.MessageCircle className="text-primary-400" size="xl" />
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Coming Soon
                </h2>
                <p className="text-text-secondary max-w-md mx-auto">
                  We're building an intelligent AI chat assistant to help you analyze your performance, 
                  get real-time coaching tips, and answer your training questions.
                </p>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
                <div className="text-left p-4 bg-navy-900/50 rounded-lg border border-navy-800">
                  <Icons.CheckCircle className="text-primary-400 mb-2" size="sm" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Performance Analysis
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Ask questions about your session metrics and get detailed insights
                  </p>
                </div>

                <div className="text-left p-4 bg-navy-900/50 rounded-lg border border-navy-800">
                  <Icons.CheckCircle className="text-primary-400 mb-2" size="sm" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Personalized Coaching
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Receive tailored advice based on your activity and goals
                  </p>
                </div>

                <div className="text-left p-4 bg-navy-900/50 rounded-lg border border-navy-800">
                  <Icons.CheckCircle className="text-primary-400 mb-2" size="sm" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Technique Guidance
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Get step-by-step instructions to improve your form
                  </p>
                </div>

                <div className="text-left p-4 bg-navy-900/50 rounded-lg border border-navy-800">
                  <Icons.CheckCircle className="text-primary-400 mb-2" size="sm" />
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    24/7 Availability
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Access coaching support whenever you need it
                  </p>
                </div>
              </div>

              {/* Notify Badge */}
              <div className="mt-8 px-6 py-3 bg-primary-500/10 border border-primary-500/20 rounded-full">
                <p className="text-sm text-primary-300 font-medium">
                  ✨ We'll notify you when this feature launches
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
