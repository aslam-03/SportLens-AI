import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { motion } from 'framer-motion';
import { getSessionsFromFirestore } from '@/services/firestoreSessionService';

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
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    sessionsThisWeek: 0,
    avgScore: 0,
    totalMinutes: 0,
    streak: 0
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Current user from auth
  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  };

  // Fetch real-time session data from Firestore
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!user?.uid) {
        setIsLoadingData(false);
        return;
      }

      try {
        setIsLoadingData(true);
        
        // Fetch all sessions for the user
        const sessions = await getSessionsFromFirestore(user.uid);
        
        // Calculate statistics
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Sessions this week
        const weekSessions = sessions.filter(
          s => new Date(s.startTime) > oneWeekAgo
        );
        
        // Calculate average form score
        let totalScore = 0;
        let scoreCount = 0;
        sessions.forEach(s => {
          if (s.metrics?.performanceScore != null) {
            totalScore += s.metrics.performanceScore;
            scoreCount++;
          }
        });
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
        
        // Total minutes
        const totalMinutes = Math.round(
          sessions.reduce((sum, s) => sum + s.duration, 0) / 60
        );
        
        // Calculate streak (consecutive days with sessions)
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        while (streak < 365) {
          const dayStart = new Date(currentDate);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);
          
          const hasSessionToday = sessions.some(s => {
            const sessionDate = new Date(s.startTime);
            return sessionDate >= dayStart && sessionDate <= dayEnd;
          });
          
          if (hasSessionToday) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
        
        setStats({
          sessionsThisWeek: weekSessions.length,
          avgScore,
          totalMinutes,
          streak
        });
        
        // Format recent sessions for display (top 3)
        const formattedSessions: Session[] = sessions.slice(0, 3).map(s => {
          const activityNames: Record<string, string> = {
            'cricket': 'Cricket Training',
            'fitness': 'Fitness Session',
            'squat': 'Squat Exercise',
            'plank': 'Plank Hold',
            'lunge': 'Lunge Exercise'
          };
          
          // Calculate relative date
          const sessionDate = new Date(s.startTime);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          let dateLabel = '';
          if (sessionDate >= today) {
            dateLabel = 'Today';
          } else if (sessionDate >= yesterday) {
            dateLabel = 'Yesterday';
          } else {
            const daysAgo = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
            dateLabel = `${daysAgo} days ago`;
          }
          
          // Format duration
          const minutes = Math.round(s.duration / 60);
          const durationLabel = `${minutes} min`;
          
          // Extract key metrics
          const metrics: { label: string; value: string }[] = [];
          if (s.metrics?.biomechanics) {
            const bio = s.metrics.biomechanics;
            if (bio.leftKnee?.avg) {
              metrics.push({ 
                label: 'Knee Angle', 
                value: `${Math.round(bio.leftKnee.avg)}°` 
              });
            }
            if (bio.leftHip?.avg) {
              metrics.push({ 
                label: 'Hip Angle', 
                value: `${Math.round(bio.leftHip.avg)}°` 
              });
            }
          }
          
          // If no biomechanics metrics, create generic ones
          if (metrics.length === 0) {
            const violationCount = Object.keys(s.metrics?.violations || {}).length;
            metrics.push({ label: 'Form', value: violationCount === 0 ? 'Good' : 'Needs Work' });
          }
          
          return {
            id: s.sessionId,
            title: activityNames[s.activityType] || 'Training Session',
            date: dateLabel,
            duration: durationLabel,
            activity: s.activityType,
            score: s.metrics?.performanceScore || undefined,
            metrics: metrics.slice(0, 2)
          };
        });
        
        setRecentSessions(formattedSessions);
      } catch (error) {
        console.error('Error fetching session data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    fetchSessionData();
  }, [user?.uid]);

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
        <motion.div 
          variants={itemVariants} 
          className="px-4 py-6 md:px-6 mb-2"
        >
          <div className="bg-gradient-to-r from-navy-800/50 via-navy-900/30 to-transparent p-6 rounded-2xl border border-navy-700/50 backdrop-blur-sm">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent mb-3">
              Welcome back, {currentUser.name.split(' ')[0]}! 
            </h1>
            <p className="text-gray-400 text-base md:text-lg flex items-center gap-2">
              <Icons.Calendar size="sm" className="text-primary-500" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </motion.div>

        {/* Today's Focus Card */}
        <motion.div 
          variants={itemVariants} 
          className="px-4 pb-4 md:px-6"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="!bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 !border-primary-500/30 shadow-xl shadow-primary-900/20 overflow-hidden relative">
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
            <div className="relative p-6 md:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-primary-100 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                    Today&apos;s Goal
                  </p>
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    Ready to Train?
                  </h2>
                </div>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Icons.Activity
                    size="lg"
                    className="text-cyan-300 flex-shrink-0 w-12 h-12"
                  />
                </motion.div>
              </div>
              <p className="text-primary-50 text-sm md:text-base mb-6 leading-relaxed">
                Start your training session with AI-powered coaching and real-time feedback.
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={handleStartSession}
                disabled={isLoading}
                className="w-full !bg-white !text-primary-700 hover:!bg-gray-100 font-semibold shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Icons.Activity size="sm" />
                    </motion.div>
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icons.Play size="sm" />
                    Practice Now
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div variants={itemVariants} className="px-4 pb-4 md:px-6">
          <h3 className="text-lg font-semibold text-white mb-4 px-1">Your Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="!bg-navy-800 !border-navy-700 hover:!border-primary-500/50 transition-all shadow-lg hover:shadow-primary-900/20">
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-primary-500/10 rounded-lg">
                      <Icons.Activity size="sm" className="text-primary-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      Sessions
                    </p>
                  </div>
                  {isLoadingData ? (
                    <div className="h-8 bg-navy-700/50 rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-white mb-1">{stats.sessionsThisWeek}</p>
                  )}
                  <p className="text-green-400 text-xs font-medium">This week</p>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="!bg-navy-800 !border-navy-700 hover:!border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-900/20">
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Icons.TrendingUp size="sm" className="text-cyan-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      Avg Score
                    </p>
                  </div>
                  {isLoadingData ? (
                    <div className="h-8 bg-navy-700/50 rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-white mb-1">{stats.avgScore}%</p>
                  )}
                  <p className="text-gray-400 text-xs font-medium">Form score</p>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="!bg-navy-800 !border-navy-700 hover:!border-blue-500/50 transition-all shadow-lg hover:shadow-blue-900/20">
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Icons.Clock size="sm" className="text-blue-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      Minutes
                    </p>
                  </div>
                  {isLoadingData ? (
                    <div className="h-8 bg-navy-700/50 rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-white mb-1">{stats.totalMinutes}+</p>
                  )}
                  <p className="text-gray-400 text-xs font-medium">{(stats.totalMinutes / 60).toFixed(1)} hrs total</p>
                </div>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ duration: 0.2 }}>
              <Card className="!bg-gradient-to-br !from-orange-500/20 !to-red-500/20 !border-orange-500/50 shadow-lg shadow-orange-900/20">
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <span className="text-lg">🔥</span>
                    </div>
                    <p className="text-gray-200 text-xs font-semibold uppercase tracking-wider">
                      Streak
                    </p>
                  </div>
                  {isLoadingData ? (
                    <div className="h-8 bg-orange-500/20 rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-3xl font-bold text-orange-400 mb-1">{stats.streak} {stats.streak === 1 ? 'day' : 'days'}</p>
                  )}
                  <p className="text-orange-300 text-xs font-medium">{stats.streak > 0 ? 'Keep it going!' : 'Start today!'}</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Recent Sessions */}
        <motion.div variants={itemVariants} className="px-4 pb-8 md:pb-12 md:px-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-semibold text-white">Recent Sessions</h3>
            <button
              onClick={() => navigate('/sessions')}
              className="text-primary-400 text-sm font-semibold hover:text-primary-300 transition-colors flex items-center gap-1"
            >
              See all
              <span>→</span>
            </button>
          </div>

          {isLoadingData ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="!bg-navy-800 !border-navy-700">
                  <div className="p-5 md:p-6 space-y-4">
                    <div className="h-6 bg-navy-700/50 rounded animate-pulse w-3/4" />
                    <div className="h-8 bg-navy-700/50 rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-navy-700/50 rounded animate-pulse w-2/3" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-16 bg-navy-700/50 rounded animate-pulse" />
                      <div className="h-16 bg-navy-700/50 rounded animate-pulse" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <Card className="!bg-navy-800 !border-navy-700">
              <div className="p-12 text-center">
                <div className="p-4 bg-navy-700/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Icons.Activity size="lg" className="text-gray-500" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">No Sessions Yet</h4>
                <p className="text-gray-400 mb-6">Start your first coaching session to see it here!</p>
                <Button
                  variant="secondary"
                  onClick={handleStartSession}
                  className="!bg-primary-600 hover:!bg-primary-700 !text-white !border-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Play size="sm" />
                    Start Your First Session
                  </span>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {recentSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  variants={itemVariants}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="cursor-pointer !bg-navy-800 !border-navy-700 hover:!border-primary-500/70 hover:!bg-navy-750 transition-all shadow-lg hover:shadow-primary-900/20 overflow-hidden group"
                    onClick={() => handleViewSession(session.id)}
                  >
                    <div className="p-5 md:p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Icons.Calendar size="sm" className="text-primary-500" />
                            {session.date}
                          </p>
                          <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
                            {session.title}
                          </h4>
                        </div>
                        {session.score && (
                          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-cyan-500/20 border border-primary-500/30">
                            <span className="text-base font-bold text-primary-400">
                              {session.score}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-4 p-2 bg-navy-900/50 rounded-lg w-fit">
                        <Icons.Clock size="sm" className="text-blue-400" />
                        <span className="font-medium">{session.duration}</span>
                      </div>

                      {/* Metrics */}
                      {session.metrics && session.metrics.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-navy-900/70 rounded-xl border border-navy-700/50">
                          {session.metrics.map((metric) => (
                            <div key={metric.label}>
                              <p className="text-gray-500 text-xs mb-1.5 font-medium uppercase tracking-wide">{metric.label}</p>
                              <p className="text-base font-bold text-white">
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
                        className="w-full justify-center !text-primary-400 hover:!text-primary-300 hover:!bg-primary-500/10 font-semibold"
                        onClick={() => handleViewSession(session.id)}
                      >
                        View Details →
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
