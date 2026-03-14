import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { getSessionsFromFirestore } from '@/services/firestoreSessionService';
import type { Session } from '@/types/session';

interface VideoSession {
  id: string;
  activityType: string;
  date: string;
  time: string;
  duration: string;
  videoUrl: string;
  performanceScore?: number;
}

export default function GalleryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const sessions = await getSessionsFromFirestore(user.uid);
        
        // Filter sessions that have video URLs
        const sessionsWithVideos = sessions.filter(s => s.r2Objects?.videoUrl);
        
        // Convert to display format
        const videoData: VideoSession[] = sessionsWithVideos.map(s => {
          const sessionDate = new Date(s.startTime);
          const activityNames: Record<string, string> = {
            'cricket': 'Cricket',
            'fitness': 'Fitness',
            'squat': 'Squat',
            'plank': 'Plank',
            'lunge': 'Lunge'
          };

          return {
            id: s.sessionId,
            activityType: activityNames[s.activityType] || 'Training',
            date: sessionDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            time: sessionDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            duration: `${Math.round(s.duration / 60)} mins`,
            videoUrl: s.r2Objects!.videoUrl!,
            performanceScore: s.metrics?.performanceScore ?? undefined
          };
        });

        setVideoSessions(videoData);
      } catch (error) {
        console.error('Error fetching video sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, [user?.uid]);

  return (
    <AppShell>
      <div className="min-h-screen bg-navy-950 text-text-primary">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mx-auto px-4 py-8"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Video Gallery
            </h1>
            <p className="text-gray-400">
              {isLoading ? 'Loading videos...' : `${videoSessions.length} session videos`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="aspect-video bg-navy-700 rounded-lg mb-4"></div>
                    <div className="h-6 bg-navy-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-navy-700 rounded w-1/2"></div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && videoSessions.length === 0 && (
            <Card className="p-12 text-center max-w-2xl mx-auto">
              <div className="p-4 bg-navy-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Icons.Video size="lg" className="text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Videos Yet</h3>
              <p className="text-gray-400 mb-4">
                Session videos will appear here once you record training sessions.
              </p>
              <div className="bg-navy-800/50 border border-navy-700 rounded-xl p-6 text-left mb-6">
                <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                  <Icons.Info size="sm" />
                  To see videos in your gallery:
                </h4>
                <ol className="text-sm text-gray-300 space-y-2 ml-4 list-decimal">
                  <li>Go to <span className="text-white font-semibold">Live Coaching</span> page</li>
                  <li>Select an activity (Fitness or Cricket)</li>
                  <li>Click <span className="text-white font-semibold">Start Session</span> to begin recording</li>
                  <li>Complete your workout or practice</li>
                  <li>Click <span className="text-white font-semibold">End Session</span> to save</li>
                  <li>Videos will automatically upload to cloud storage</li>
                </ol>
                <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <p className="text-xs text-primary-300">
                    <strong>Note:</strong> Sessions must be saved with video recording enabled. The backend must be running for R2 cloud storage uploads.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Video Grid */}
          {!isLoading && videoSessions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    className="overflow-hidden cursor-pointer hover:border-primary-500/50 transition-all group" 
                    hoverable
                    onClick={() => navigate(`/sessions/${session.id}`)}
                  >
                    {/* Video Thumbnail */}
                    <div className="relative aspect-video bg-navy-900 overflow-hidden">
                      <video
                        src={session.videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-4 bg-primary-600 rounded-full">
                          <Icons.Play size="lg" className="text-white" />
                        </div>
                      </div>
                      {session.performanceScore !== undefined && (
                        <div className="absolute top-3 right-3 px-3 py-1 bg-primary-500/90 backdrop-blur-sm rounded-lg">
                          <span className="text-white font-bold text-sm">
                            {session.performanceScore}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video Details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
                          {session.activityType}
                        </h3>
                        <Badge variant="default" size="sm">
                          {session.duration}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Icons.Calendar size="sm" />
                        <span>{session.date}</span>
                        <span>•</span>
                        <Icons.Clock size="sm" />
                        <span>{session.time}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
