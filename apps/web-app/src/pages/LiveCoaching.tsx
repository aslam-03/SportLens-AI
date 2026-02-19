import { useState, useRef, useEffect } from 'react';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

interface Metric {
  label: string;
  value: number;
  unit: string;
  status?: 'good' | 'warning' | 'critical';
}

interface User {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export default function LiveCoaching() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(true);

  const currentUser: User = {
    name: 'Alex Athlete',
    email: 'alex@sportlens.ai',
    initials: 'AA'
  };

  // Mock real-time metrics
  const metrics: Metric[] = [
    {
      label: 'Posture Score',
      value: 87,
      unit: '%',
      status: 'good'
    },
    {
      label: 'Balance',
      value: 92,
      unit: '%',
      status: 'good'
    },
    {
      label: 'Alignment',
      value: 78,
      unit: '%',
      status: 'warning'
    },
    {
      label: 'Form Consistency',
      value: 85,
      unit: '%',
      status: 'good'
    }
  ];

  const realTimeFeedback = [
    {
      id: 1,
      type: 'success',
      message: 'Great posture! Keep your shoulders relaxed.',
      timestamp: 'now'
    },
    {
      id: 2,
      type: 'warning',
      message: 'Try to keep your feet shoulder-width apart.',
      timestamp: '5s ago'
    },
    {
      id: 3,
      type: 'info',
      message: 'Your stance is improving! 🎯',
      timestamp: '12s ago'
    }
  ];

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setSessionTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Initialize camera
  useEffect(() => {
    if (isSessionActive && videoRef.current) {
      const accessCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            },
            audio: false
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          alert('Unable to access camera. Please check permissions.');
          setIsSessionActive(false);
        }
      };
      accessCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isSessionActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    setIsSessionActive(!isSessionActive);
    setSessionTime(0);
  };

  const handleCaptureFrame = () => {
    alert('Frame captured! Saving to session...');
  };

  const handleLogout = () => {
    alert('Logging out...');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'text-success-500';
      case 'warning':
        return 'text-warning-500';
      case 'critical':
        return 'text-danger-500';
      default:
        return 'text-text-secondary';
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'good':
        return 'bg-success-500/10';
      case 'warning':
        return 'bg-warning-500/10';
      case 'critical':
        return 'bg-danger-500/10';
      default:
        return 'bg-navy-800';
    }
  };

  return (
    <AppShell
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Camera Section */}
        <div className="flex-1 flex flex-col bg-black relative min-h-0">
          {/* Video/Camera Area */}
          <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
            {isSessionActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Canvas for pose overlay */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />

                {/* Overlay Controls */}
                <div className="absolute top-4 left-4 right-4 z-10">
                  <div className="flex items-center justify-between">
                    {/* Timer */}
                    <Badge variant="default" className="bg-navy-900/80 backdrop-blur">
                      <Icons.Clock size="sm" className="mr-2" />
                      {formatTime(sessionTime)}
                    </Badge>

                    {/* Session Status */}
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger-500 animate-pulse" />
                      <span className="text-white text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                </div>

                {/* Floating Metrics (Mobile) */}
                <div className="absolute bottom-4 left-4 right-4 lg:hidden z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="bg-navy-900/80 backdrop-blur rounded-lg p-2 text-center border border-navy-700"
                      >
                        <p className="text-text-muted text-xs mb-1">{metric.label.split(' ')[0]}</p>
                        <p className={`text-lg font-bold ${getStatusColor(metric.status)}`}>
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-6">
                <Icons.Camera size="xl" className="text-text-muted" />
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Camera Ready
                  </h3>
                  <p className="text-text-secondary text-sm max-w-xs">
                    Position yourself in front of the camera and tap Start to begin your session.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleStartStop}
                  className="mt-4"
                >
                  <Icons.Play size="sm" className="mr-2" />
                  Start Session
                </Button>
              </div>
            )}
          </div>

          {/* Desktop Metrics Bar */}
          {isSessionActive && (
            <div className="hidden lg:grid grid-cols-4 gap-4 p-4 border-t border-navy-700 bg-navy-900">
              {metrics.map((metric) => (
                <div key={metric.label} className={`p-3 rounded-lg ${getStatusBg(metric.status)}`}>
                  <p className="text-text-muted text-xs font-medium mb-1">{metric.label}</p>
                  <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                    {metric.value}
                    <span className="text-sm ml-1">{metric.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Panel - Desktop */}
        {isSessionActive && (
          <motion.div
            className="hidden lg:flex flex-col w-80 border-l border-navy-700 bg-navy-900 overflow-hidden"
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ duration: 0.3 }}
          >
            {/* Panel Header */}
            <div className="p-4 border-b border-navy-700">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Icons.Info size="sm" className="text-primary-500" />
                Real-time Feedback
              </h3>
            </div>

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-3">
                {realTimeFeedback.map((feedback) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border ${
                      feedback.type === 'success'
                        ? 'bg-success-500/10 border-success-500/30'
                        : feedback.type === 'warning'
                          ? 'bg-warning-500/10 border-warning-500/30'
                          : 'bg-primary-500/10 border-primary-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {feedback.type === 'success' ? (
                        <Icons.Check
                          size="sm"
                          className="text-success-500"
                        />
                      ) : feedback.type === 'warning' ? (
                        <Icons.AlertTriangle
                          size="sm"
                          className="text-warning-500"
                        />
                      ) : (
                        <Icons.Info
                          size="sm"
                          className="text-primary-500"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">{feedback.message}</p>
                        <p className="text-xs text-text-muted mt-1">{feedback.timestamp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Session Summary */}
            <div className="p-4 border-t border-navy-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Session Time</span>
                <span className="text-text-primary font-semibold">{formatTime(sessionTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Avg Score</span>
                <span className="text-text-primary font-semibold">88%</span>
              </div>
              <Button variant="ghost" size="sm" className="w-full">
                View Details
              </Button>
            </div>
          </motion.div>
        )}

        {/* Mobile Feedback Panel - Collapsible */}
        <AnimatePresence>
          {isPanelOpen && isSessionActive && (
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-24 h-1/2 bg-navy-900 border-t border-navy-700 z-40 flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-4">
                <div className="w-10 h-1 rounded-full bg-navy-700" />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Icons.Info size="sm" className="text-primary-500" />
                  Feedback
                </h3>
                <div className="space-y-3">
                  {realTimeFeedback.map((feedback) => (
                    <div
                      key={feedback.id}
                      className={`p-3 rounded-lg border ${
                        feedback.type === 'success'
                          ? 'bg-success-500/10 border-success-500/30'
                          : feedback.type === 'warning'
                            ? 'bg-warning-500/10 border-warning-500/30'
                            : 'bg-primary-500/10 border-primary-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {feedback.type === 'success' ? (
                          <Icons.Check
                            size="sm"
                            className="text-success-500"
                          />
                        ) : feedback.type === 'warning' ? (
                          <Icons.AlertTriangle
                            size="sm"
                            className="text-warning-500"
                          />
                        ) : (
                          <Icons.Info
                            size="sm"
                            className="text-primary-500"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{feedback.message}</p>
                          <p className="text-xs text-text-muted mt-1">{feedback.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
