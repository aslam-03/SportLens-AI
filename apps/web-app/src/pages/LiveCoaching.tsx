import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
  id: string;
  name: string;
  category: 'cricket' | 'fitness';
  icon: 'Activity' | 'TrendingUp' | 'BarChart';
  description: string;
  metrics: string[];
}

const activities: Activity[] = [
  {
    id: 'batting-stance',
    name: 'Batting Stance',
    category: 'cricket',
    icon: 'Activity',
    description: 'Analyze batting posture and balance',
    metrics: ['Stance Width', 'Balance', 'Knee Angle', 'Shoulder Alignment']
  },
  {
    id: 'bowling-action',
    name: 'Bowling Action',
    category: 'cricket',
    icon: 'TrendingUp',
    description: 'Track bowling form and release',
    metrics: ['Arm Angle', 'Follow Through', 'Hip Rotation', 'Release Point']
  },
  {
    id: 'fielding-position',
    name: 'Fielding Position',
    category: 'cricket',
    icon: 'Activity',
    description: 'Optimize fielding stance',
    metrics: ['Ready Position', 'Weight Distribution', 'Reaction Time', 'Balance']
  },
  {
    id: 'squat-form',
    name: 'Squat Form',
    category: 'fitness',
    icon: 'BarChart',
    description: 'Perfect your squat technique',
    metrics: ['Knee Alignment', 'Hip Depth', 'Back Angle', 'Balance']
  },
  {
    id: 'plank-hold',
    name: 'Plank Hold',
    category: 'fitness',
    icon: 'Activity',
    description: 'Core stability analysis',
    metrics: ['Hip Alignment', 'Shoulder Position', 'Core Engagement', 'Time']
  },
  {
    id: 'lunge-form',
    name: 'Lunge Form',
    category: 'fitness',
    icon: 'TrendingUp',
    description: 'Lower body strength and balance',
    metrics: ['Knee Angle', 'Hip Alignment', 'Balance', 'Depth']
  }
];

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
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(true);
  const [currentMetrics, setCurrentMetrics] = useState<Metric[]>([]);

  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
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
    if (isSessionActive) {
      // Stop session
      setIsSessionActive(false);
      setSessionTime(0);
      setCurrentMetrics([]);
      // Stop camera
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    } else {
      // Start session
      setIsSessionActive(true);
      // Initialize metrics based on selected activity
      if (selectedActivity) {
        const initialMetrics: Metric[] = selectedActivity.metrics.map((label, index) => ({
          label,
          value: Math.floor(Math.random() * 30) + 70, // Random 70-100
          unit: '%',
          status: 'good' as const
        }));
        setCurrentMetrics(initialMetrics);
      }
    }
  };

  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const handleBackToActivities = () => {
    if (isSessionActive) {
      handleStartStop(); // Stop session first
    }
    setSelectedActivity(null);
  };

  // Update metrics in real-time during session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && selectedActivity) {
      interval = setInterval(() => {
        setCurrentMetrics(prev => 
          prev.map(metric => {
            const change = Math.floor(Math.random() * 10) - 5; // -5 to +5
            const newValue = Math.max(0, Math.min(100, metric.value + change));
            let status: 'good' | 'warning' | 'critical' = 'good';
            if (newValue < 60) status = 'critical';
            else if (newValue < 75) status = 'warning';
            
            return { ...metric, value: newValue, status };
          })
        );
      }, 2000); // Update every 2 seconds
    }
    return () => clearInterval(interval);
  }, [isSessionActive, selectedActivity]);

  const handleCaptureFrame = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        // Frame captured and drawn to canvas - could save via API here
        console.log('Frame captured successfully');
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Stop camera first
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      await signOutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
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

  // Render fullscreen when activity is selected (no AppShell)
  if (selectedActivity) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-black">
        {/* Camera Section */}
        <div className="flex-1 flex flex-col bg-black relative min-h-0">
          {/* Header with Back Button */}
          <div className="flex-shrink-0 bg-navy-900 border-b border-navy-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToActivities}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <Icons.ChevronLeft size="md" />
                <span className="text-sm font-medium">Back to Activities</span>
              </button>
              <div className="text-center">
                <p className="text-white font-semibold">{selectedActivity.name}</p>
                <p className="text-xs text-gray-400">{selectedActivity.category === 'cricket' ? 'Cricket' : 'Fitness'}</p>
              </div>
              <div className="w-24"></div> {/* Spacer for centering */}
            </div>
          </div>

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
                    {currentMetrics.map((metric) => (
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
              <div className="flex flex-col items-center justify-center gap-6 p-6">
                <div className="p-6 bg-primary-600/10 rounded-full">
                  <Icons.Camera size="xl" className="text-primary-400" />
                </div>
                <div className="text-center max-w-md">
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    Ready to Start
                  </h3>
                  <p className="text-gray-300 text-sm mb-6">
                    Click Start Session to begin tracking your {selectedActivity.name.toLowerCase()}.
                    Make sure you're in a well-lit area with your full body visible.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {selectedActivity.metrics.map((metric, idx) => (
                      <Badge key={idx} variant="default" size="sm">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleStartStop}
                    className="min-w-[200px]"
                  >
                    <Icons.Play size="md" className="mr-2" />
                    Start Session
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex-shrink-0 bg-navy-900 border-t border-navy-800 p-4">
            <div className="flex items-center justify-center gap-4">
              {isSessionActive ? (
                <>
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handleStartStop}
                    className="min-w-[160px]"
                  >
                    <Icons.Stop size="md" className="mr-2" />
                    End Session
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleCaptureFrame}
                  >
                    <Icons.Camera size="md" className="mr-2" />
                    Capture
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Desktop Metrics Sidebar */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 bg-navy-900 border-l border-navy-800 flex-col overflow-hidden">
          {/* Metrics Header */}
          <div className="flex-shrink-0 p-6 border-b border-navy-800">
            <h2 className="text-xl font-semibold text-white mb-2">Live Metrics</h2>
            <p className="text-sm text-gray-400">Real-time biomechanics tracking</p>
          </div>

          {/* Metrics List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentMetrics.map((metric) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 rounded-lg border ${
                  metric.status === 'good'
                    ? 'border-success-500/30 bg-success-500/5'
                    : metric.status === 'warning'
                    ? 'border-warning-500/30 bg-warning-500/5'
                    : 'border-danger-500/30 bg-danger-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-300 font-medium">{metric.label}</p>
                  <Badge
                    variant={
                      metric.status === 'good'
                        ? 'success'
                        : metric.status === 'warning'
                        ? 'warning'
                        : 'default'
                    }
                    size="sm"
                    className={metric.status === 'critical' ? 'bg-danger-500/20 text-danger-500 border-danger-500/30' : ''}
                  >
                    {metric.status || 'N/A'}
                  </Badge>
                </div>
                <p className={`text-3xl font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Feedback Panel (if active) */}
          <AnimatePresence>
            {isSessionActive && realTimeFeedback.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex-shrink-0 border-t border-navy-800 bg-navy-950"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Icons.Info size="md" />
                    AI Feedback
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {realTimeFeedback.map((feedback) => (
                      <div
                        key={feedback.id}
                        className={`p-3 rounded-lg ${getStatusBg(feedback.type)}`}
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
      </div>
    );
  }

  // Render with AppShell for activity selection
  return (
    <AppShell
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {/* Activity Selection Screen */}
      <div className="min-h-screen bg-primary-700 py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-white mb-2">Select Activity</h1>
              <p className="text-gray-300">Choose what you'd like to practice today</p>
            </motion.div>

            {/* Cricket Activities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Icons.Activity size="lg" />
                Cricket Practice
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {activities.filter(a => a.category === 'cricket').map((activity) => {
                  const IconComponent = Icons[activity.icon];
                  return (
                    <Card
                      key={activity.id}
                      className="p-6 cursor-pointer hover:border-primary-400 transition-all !bg-navy-800 border border-navy-700"
                      onClick={() => handleSelectActivity(activity)}
                      hoverable
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary-500/10 rounded-lg">
                          <IconComponent size="lg" className="text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">{activity.name}</h3>
                          <p className="text-sm text-gray-400 mb-3">{activity.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {activity.metrics.slice(0, 3).map((metric, idx) => (
                              <Badge key={idx} variant="default" size="sm" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>

            {/* Fitness Activities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Icons.TrendingUp size="lg" />
                Fitness Training
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {activities.filter(a => a.category === 'fitness').map((activity) => {
                  const IconComponent = Icons[activity.icon];
                  return (
                    <Card
                      key={activity.id}
                      className="p-6 cursor-pointer hover:border-primary-400 transition-all !bg-navy-800 border border-navy-700"
                      onClick={() => handleSelectActivity(activity)}
                      hoverable
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary-500/10 rounded-lg">
                          <IconComponent size="lg" className="text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">{activity.name}</h3>
                          <p className="text-sm text-gray-400 mb-3">{activity.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {activity.metrics.slice(0, 3).map((metric, idx) => (
                              <Badge key={idx} variant="default" size="sm" className="text-xs">
                                {metric}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
    </AppShell>
  );
}
