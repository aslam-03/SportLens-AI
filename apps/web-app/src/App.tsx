import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthPanel from './components/auth/AuthPanel';

// Import page components
import Home from './pages/Home';
import LiveCoaching from './pages/LiveCoaching';
import Sessions from './pages/SessionsPage';
import SessionDetail from './pages/SessionDetailPage';
import Gallery from './pages/GalleryPage';
import Reports from './pages/ReportsPage';
import Account from './pages/AccountPage';
import Chat from './pages/ChatPage';

function App() {
  const { user, loading, signOutUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            Loading...
          </div>
          <p className="text-text-secondary text-sm">
            Initializing SportLens AI
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* App Logo/Branding */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-400 via-cyan-400 to-primary-500 bg-clip-text text-transparent mb-3">
              SportLens AI
            </h1>
            <p className="text-gray-300 text-base font-medium">
              Professional pose analysis and coaching platform
            </p>
          </div>
          
          <AuthPanel
            title="Welcome back"
            subtitle="Sign in to access your coaching sessions"
          />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<LiveCoaching />} />
        <Route path="/coaching" element={<LiveCoaching />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
