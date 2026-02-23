import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { getSessionsFromFirestore, deleteSessionFromFirestore } from '@/services/firestoreSessionService';
import type { Session as FirestoreSession } from '@/types/session';

interface DisplaySession {
  id: string;
  date: string;
  sport: string;
  duration: string;
  type: string;
  status: string;
  performanceScore?: number;
}

export default function Sessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'fitness' | 'cricket'>('all');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const firestoreSessions = await getSessionsFromFirestore(user.uid);

        // Convert Firestore sessions to display format
        const displaySessions: DisplaySession[] = firestoreSessions.map(s => {
          const activityNames: Record<string, { sport: string; type: string }> = {
            'cricket': { sport: 'Cricket', type: 'Training' },
            'fitness': { sport: 'Fitness', type: 'Workout' },
            'squat': { sport: 'Fitness', type: 'Squat' },
            'plank': { sport: 'Fitness', type: 'Plank' },
            'lunge': { sport: 'Fitness', type: 'Lunge' }
          };

          const activityInfo = activityNames[s.activityType] || { sport: 'Training', type: 'Session' };
          const minutes = Math.round(s.duration / 60);

          return {
            id: s.sessionId,
            date: new Date(s.startTime).toISOString().split('T')[0],
            sport: activityInfo.sport,
            duration: `${minutes} mins`,
            type: activityInfo.type,
            status: 'completed',
            performanceScore: s.metrics?.performanceScore
          };
        });

        setSessions(displaySessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user?.uid]);

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true;
    return s.sport.toLowerCase() === filter;
  });

  // Handle delete confirmation
  const handleDeleteClick = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete || !user?.uid) return;

    try {
      setDeletingSessionId(sessionToDelete);
      await deleteSessionFromFirestore(user.uid, sessionToDelete);

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));

      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setSessionToDelete(null);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-navy-950 text-text-primary">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Session History</h1>
              <p className="text-gray-400 text-sm">
                {isLoading ? 'Loading...' : `${filteredSessions.length} sessions found`}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/coaching')}
              className="hover:scale-105 active:scale-95 transition-transform"
            >
              New Session
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
                }`}
            >
              All ({sessions.length})
            </button>
            <button
              onClick={() => setFilter('fitness')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${filter === 'fitness'
                ? 'bg-primary-600 text-white'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
                }`}
            >
              Fitness ({sessions.filter(s => s.sport === 'Fitness').length})
            </button>
            <button
              onClick={() => setFilter('cricket')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${filter === 'cricket'
                ? 'bg-primary-600 text-white'
                : 'bg-navy-800 text-gray-400 hover:bg-navy-700'
                }`}
            >
              Cricket ({sessions.filter(s => s.sport === 'Cricket').length})
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-6 bg-navy-700 rounded w-1/4 mb-3"></div>
                    <div className="h-4 bg-navy-700 rounded w-1/2 mb-3"></div>
                    <div className="h-6 bg-navy-700 rounded w-20"></div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredSessions.length === 0 && (
            <Card className="p-12 text-center">
              <div className="p-4 bg-navy-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Icons.Activity size="lg" className="text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Sessions Yet</h3>
              <p className="text-gray-400 mb-6">
                {filter === 'all'
                  ? 'Start your first training session to see it here'
                  : `No ${filter} sessions found`
                }
              </p>
              <Button variant="primary" onClick={() => navigate('/coaching')}>
                Start Session
              </Button>
            </Card>
          )}

          {/* Sessions List */}
          {!isLoading && filteredSessions.length > 0 && (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className="p-6 cursor-pointer hover:border-primary-500/50 transition-all"
                    hoverable
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{session.sport}</h3>
                          {session.performanceScore !== undefined && (
                            <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                              <span className="text-primary-400 font-bold text-sm">
                                {session.performanceScore}%
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm mb-2">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} • {session.duration}
                        </p>
                        <Badge variant="default" size="sm">
                          {session.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e?: React.MouseEvent<HTMLButtonElement>) => { e?.stopPropagation(); handleDeleteClick(session.id, e as React.MouseEvent); }}
                          className="text-error-400 hover:text-error-300 hover:bg-error-500/10"
                          disabled={deletingSessionId === session.id}
                        >
                          <Icons.Trash size="md" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e?: React.MouseEvent<HTMLButtonElement>) => {
                            e?.stopPropagation();
                            navigate(`/sessions/${session.id}`);
                          }}
                        >
                          <Icons.ChevronRight size="md" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-md w-full shadow-xl"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-error-500/10 rounded-full">
                    <Icons.AlertTriangle size="lg" className="text-error-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">Delete Session?</h3>
                    <p className="text-gray-400 text-sm">
                      This action cannot be undone. The session data will be permanently deleted from your records.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="ghost"
                    onClick={handleDeleteCancel}
                    disabled={deletingSessionId !== null}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={deletingSessionId !== null}
                  >
                    {deletingSessionId ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
