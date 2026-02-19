import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { motion } from 'framer-motion';

interface Session {
  id: string;
  title: string;
  date: string;
  duration: string;
  activity: string;
  score?: number;
  metrics?: {
    label: string;
    value: string;
  }[];
}

interface User {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Current user from auth
  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  };

  // Mock recent sessions data
  const recentSessions: Session[] = [
    {
      id: '1',
      title: 'Cricket Batting',
      date: 'Today',
      duration: '15 min',
      activity: 'batting-stance',
      score: 88,
      metrics: [
        { label: 'Stance', value: '9/10' },
        { label: 'Balance', value: '8/10' }
      ]
    },
    {
      id: '2',
      title: 'Bowling Form',
      date: 'Yesterday',
      duration: '12 min',
      activity: 'bowling-form',
      score: 92,
      metrics: [
        { label: 'Arc', value: '9/10' },
        { label: 'Release', value: '9/10' }
      ]
    },
    {
      id: '3',
      title: 'Fitness Assessment',
      date: '2 days ago',
      duration: '20 min',
      activity: 'fitness',
      score: 85,
      metrics: [
        { label: 'Flexibility', value: '8/10' },
        { label: 'Strength', value: '8/10' }
      ]
    }
  ];

  const handleStartSession = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/coaching');
    }, 300);
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <AppShell
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <motion.div
        className="w-full max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="px-4 py-6 md:px-6">
          <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-2">
            Welcome back, {currentUser.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-text-secondary text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </motion.div>

        {/* Today's Focus Card */}
        <motion.div variants={itemVariants} className="px-4 pb-4 md:px-6">
          <Card className="bg-gradient-to-br from-primary-600 to-primary-700 border-0">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-primary-100 text-xs font-medium uppercase tracking-wide mb-2">
                    Today&apos;s Goal
                  </p>
                  <h2 className="text-xl md:text-3xl font-bold text-white">
                    Improve Batting Stance
                  </h2>
                </div>
                <Icons.Activity
                  size="lg"
                  className="text-primary-200 flex-shrink-0"
                />
              </div>
              <p className="text-primary-100 text-sm mb-6">
                Focus on weight distribution and balance. You&apos;re making great progress!
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartSession}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Starting...' : 'Start Now'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate('/coaching')}
                >
                  Practice
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div variants={itemVariants} className="px-4 pb-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-navy-800 border-navy-700">
              <div className="p-4">
                <p className="text-text-secondary text-xs font-medium uppercase mb-2">
                  Sessions This Week
                </p>
                <p className="text-2xl font-bold text-text-primary">12</p>
                <p className="text-text-muted text-xs mt-2">↑ 2 from last week</p>
              </div>
            </Card>

            <Card className="bg-navy-800 border-navy-700">
              <div className="p-4">
                <p className="text-text-secondary text-xs font-medium uppercase mb-2">
                  Avg Score
                </p>
                <p className="text-2xl font-bold text-text-primary">88%</p>
                <p className="text-text-muted text-xs mt-2">↑ 5 from last week</p>
              </div>
            </Card>

            <Card className="bg-navy-800 border-navy-700">
              <div className="p-4">
                <p className="text-text-secondary text-xs font-medium uppercase mb-2">
                  Total Minutes
                </p>
                <p className="text-2xl font-bold text-text-primary">180+</p>
                <p className="text-text-muted text-xs mt-2">4.3 hrs total</p>
              </div>
            </Card>

            <Card className="bg-navy-800 border-navy-700">
              <div className="p-4">
                <p className="text-text-secondary text-xs font-medium uppercase mb-2">
                  Streak
                </p>
                <p className="text-2xl font-bold text-success-500">7 days</p>
                <p className="text-text-muted text-xs mt-2">Keep it going! 🔥</p>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="px-4 pb-6 md:px-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={handleStartSession}
            >
              <Icons.Play size="lg" />
              <span className="text-sm">Start Session</span>
            </Button>
            <Button
              variant="secondary"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/sessions')}
            >
              <Icons.Video size="lg" />
              <span className="text-sm">View Sessions</span>
            </Button>
            <Button
              variant="secondary"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/reports')}
            >
              <Icons.TrendingUp size="lg" />
              <span className="text-sm">View Reports</span>
            </Button>
            <Button
              variant="secondary"
              className="w-full h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/account')}
            >
              <Icons.Info size="lg" />
              <span className="text-sm">Account</span>
            </Button>
          </div>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div variants={itemVariants} className="px-4 pb-8 md:pb-12 md:px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Recent Sessions</h3>
            <button
              onClick={() => navigate('/sessions')}
              className="text-primary-500 text-sm font-medium hover:text-primary-400 transition-colors"
            >
              See all
            </button>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {recentSessions.map((session, index) => (
              <motion.div
                key={session.id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:border-primary-500 transition-colors"
                  onClick={() => handleViewSession(session.id)}
                >
                  <div className="p-4 md:p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-text-secondary text-xs font-medium uppercase mb-1">
                          {session.date}
                        </p>
                        <h4 className="text-lg font-semibold text-text-primary">
                          {session.title}
                        </h4>
                      </div>
                      {session.score && (
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-500/10">
                          <span className="text-sm font-bold text-primary-500">
                            {session.score}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-2 text-text-secondary text-sm mb-4">
                      <Icons.Clock size="sm" />
                      <span>{session.duration}</span>
                    </div>

                    {/* Metrics */}
                    {session.metrics && (
                      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-navy-900/50 rounded-lg">
                        {session.metrics.map((metric) => (
                          <div key={metric.label}>
                            <p className="text-text-muted text-xs mb-1">{metric.label}</p>
                            <p className="text-sm font-semibold text-text-primary">
                              {metric.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => handleViewSession(session.id)}
                    >
                      View Details →
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
