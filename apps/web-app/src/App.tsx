import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthPanel from './components/auth/AuthPanel';

// Import page components
import Home from './pages/Home';
import LiveCoaching from './pages/LiveCoaching';
import Sessions from './pages/SessionsPage';
import Reports from './pages/ReportsPage';
import Account from './pages/AccountPage';

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
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            SportLens AI
          </h1>
          <p className="text-text-secondary mb-8">
            Professional pose analysis and coaching platform
          </p>
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
        <Route path="/coaching" element={<LiveCoaching />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
