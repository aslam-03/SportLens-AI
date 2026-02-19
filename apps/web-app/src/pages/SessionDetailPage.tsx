import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icons } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { getSessionFromFirestore, deleteSessionFromFirestore } from '@/services/firestoreSessionService';
import SessionReport from '@/components/SessionReport';
import type { Session } from '@/types/session';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id || !user?.uid) {
        setError('Session ID or user not found');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const sessionData = await getSessionFromFirestore(user.uid, id);
        
        if (!sessionData) {
          setError('Session not found');
        } else {
          setSession(sessionData);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [id, user?.uid]);

  // Handle delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!id || !user?.uid) return;

    try {
      setIsDeleting(true);
      await deleteSessionFromFirestore(user.uid, id);
      
      // Navigate back to sessions after successful deletion
      navigate('/sessions');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <AppShell>
      <div className="min-h-screen bg-navy-950 text-text-primary">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8 max-w-4xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sessions')}
              className="group"
            >
              <Icons.ChevronLeft size="sm" className="mr-1 group-hover:text-primary-400 transition-colors" />
              <span className="group-hover:text-primary-400 transition-colors">Back to Sessions</span>
            </Button>
            
            {session && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                Delete Session
              </Button>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Icons.Activity size="lg" className="text-primary-500" />
                </motion.div>
                <p className="text-gray-400">Loading session details...</p>
              </div>
            </Card>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="p-12 text-center">
              <div className="p-4 bg-red-500/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Icons.AlertTriangle size="lg" className="text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Error</h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button variant="primary" onClick={() => navigate('/sessions')}>
                <Icons.ChevronLeft size="sm" className="mr-2" />
                Back to Sessions
              </Button>
            </Card>
          )}

          {/* Session Report */}
          {session && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SessionReport session={session} />
            </motion.div>
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
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
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
