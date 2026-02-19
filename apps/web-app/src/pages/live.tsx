/**
 * Live Coaching Page
 * 
 * Production-grade coaching interface with:
 * - Real-time video processing
 * - Floating feedback overlays
 * - Live metrics dashboard
 * - Responsive mobile layout with collapsible panels
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Icons, Card } from '../components/ui';
import { useViewport } from '../hooks/useViewport';
import { cn } from '../utils/cn';

export default function LiveCoachingPage() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(window.innerWidth >= 768);
  const [elapsedTime, setElapsedTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile, isTablet } = useViewport();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsSessionActive(true);
        if (isMobile) {
          setIsFeedbackOpen(false);
        }
      }
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const handleStopSession = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setIsSessionActive(false);
    setElapsedTime(0);
  };

  const mockMetrics = {
    kneeAngle: 92,
    hipAngle: 88,
    shoulderAngle: 95,
    posture: 87,
    violations: [
      { type: 'Knee bend exceeded', severity: 'warning' },
      { type: 'Posture misaligned', severity: 'info' },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 pt-20 md:pt-24 pb-20">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative z-10">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-black text-white">Live Coaching</h1>
          <Badge
            variant={isSessionActive ? 'success' : 'default'}
            size="md"
            className="text-sm"
          >
            {isSessionActive ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Live
              </span>
            ) : (
              'Ready'
            )}
          </Badge>
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Section (Left/Top) */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="glass" paddingSize="none" className="overflow-hidden relative group">
              {/* Video Container */}
              <div className="relative aspect-video bg-navy-900 overflow-hidden">
                {isSessionActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />

                    {/* Recording Indicator */}
                    <motion.div
                      className="absolute top-4 right-4 flex items-center gap-2 bg-error-600/90 px-4 py-2 rounded-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-white font-semibold text-sm">Recording</span>
                    </motion.div>

                    {/* Time Display */}
                    <div className="absolute left-4 top-4 bg-navy-900/80 backdrop-blur-md px-4 py-2 rounded-lg">
                      <p className="text-primary-400 font-mono font-bold text-sm">
                        {formatTime(elapsedTime)}
                      </p>
                    </div>

                    {/* Joint Angle Overlay - Floating Badges */}
                    <AnimatePresence>
                      {[
                        { label: 'Knee', value: mockMetrics.kneeAngle, pos: 'top-1/3 left-1/4' },
                        { label: 'Hip', value: mockMetrics.hipAngle, pos: 'top-1/3 right-1/4' },
                        { label: 'Shoulder', value: mockMetrics.shoulderAngle, pos: 'top-1/4 right-1/3' },
                      ].map((joint, idx) => (
                        <motion.div
                          key={joint.label}
                          className={cn('absolute', joint.pos)}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                        >
                          <Badge variant="info" size="md">
                            <span className="text-xs">
                              {joint.label}: <strong>{joint.value}°</strong>
                            </span>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Pose Skeleton Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                      <div className="text-center">
                        <Icons.User className="text-primary-400 mx-auto mb-2" size="xl" />
                        <p className="text-gray-400 text-sm">Pose detection active</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <Icons.Camera className="text-primary-400 w-20 h-20 mx-auto mb-4" />
                      </motion.div>
                      <h2 className="text-2xl font-bold text-white mb-2">Ready to Start</h2>
                      <p className="text-gray-400">Click "Start Session" to begin live coaching</p>
                    </div>
                  </div>
                )}

                {/* Overlay permission message if needed */}
                {!isSessionActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
                )}
              </div>

              {/* Controls Bar */}
              <div className="bg-navy-900/80 backdrop-blur-md border-t border-white/10 p-4 flex gap-3 justify-center md:justify-start">
                {!isSessionActive ? (
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-success-600 to-success-500 hover:from-success-500 hover:to-success-400 shadow-lg shadow-success-500/30"
                    onClick={handleStartSession}
                  >
                    <Icons.Play size="md" />
                    Start Session
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-error-600 to-error-500 hover:from-error-500 hover:to-error-400 shadow-lg shadow-error-500/30"
                      onClick={handleStopSession}
                    >
                      <Icons.Stop size="md" />
                      Stop Session
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Icons.Upload size="md" />
                      Freeze Frame
                    </Button>
                  </>
                )}

                {/* Mobile Toggle */}
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                  >
                    <Icons.ChevronDown
                      size="md"
                      className={cn(
                        'transition-transform',
                        isFeedbackOpen && 'rotate-180'
                      )}
                    />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Metrics & Feedback Panel (Right/Bottom) */}
          <motion.div
            className={cn(
              'lg:col-span-1',
              isMobile && 'col-span-1'
            )}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence>
              {(isFeedbackOpen || !isMobile) && (
                <motion.div
                  className="space-y-4"
                  initial={isMobile ? { height: 0, opacity: 0 } : { x: 20, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, x: 0 }}
                  exit={isMobile ? { height: 0, opacity: 0 } : { x: 20, opacity: 0 }}
                >
                  {/* Metrics Card */}
                  <Card variant="glass" paddingSize="lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Icons.Settings size="md" className="text-primary-400" />
                      Metrics
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Knee Angle', value: mockMetrics.kneeAngle, unit: '°' },
                        { label: 'Hip Angle', value: mockMetrics.hipAngle, unit: '°' },
                        { label: 'Shoulder Angle', value: mockMetrics.shoulderAngle, unit: '°' },
                        { label: 'Posture Score', value: mockMetrics.posture, unit: '%' },
                      ].map((metric) => (
                        <div key={metric.label} className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">{metric.label}</span>
                          <span className="text-lg font-bold text-primary-400">
                            {metric.value}{metric.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Session Quality</p>
                      <motion.div
                        className="h-1.5 bg-navy-800 rounded-full overflow-hidden"
                      >
                        <motion.div
                          className="h-full bg-gradient-to-r from-primary-600 to-cyan-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${85}%` }}
                          transition={{ duration: 2 }}
                        />
                      </motion.div>
                    </div>
                  </Card>

                  {/* Violations Card */}
                  <Card
                    variant="glass"
                    paddingSize="lg"
                    className={cn(
                      mockMetrics.violations.length > 0 && 'border border-warning-500/20'
                    )}
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Icons.Warning size="md" className="text-warning-400" />
                      Feedback
                    </h3>
                    {mockMetrics.violations.length > 0 ? (
                      <div className="space-y-2">
                        {mockMetrics.violations.map((violation, idx) => (
                          <motion.div
                            key={idx}
                            className={cn(
                              'p-3 rounded-lg text-sm',
                              violation.severity === 'warning'
                                ? 'bg-warning-900/30 text-warning-300 border border-warning-500/20'
                                : 'bg-info-900/30 text-info-300 border border-info-500/20'
                            )}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <p className="font-semibold mb-1">💡 {violation.type}</p>
                            <p className="text-xs opacity-80">Keep your form aligned for better results</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-300 text-sm flex items-center gap-2">
                        <Icons.Check size="md" />
                        Great form! Keep it up
                      </p>
                    )}
                  </Card>

                  {/* Settings Card */}
                  <Card variant="glass" paddingSize="lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Icons.Settings size="md" className="text-cyan-400" />
                      Options
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="md"
                        isFullWidth
                        className="justify-start text-gray-300 hover:text-white"
                      >
                        ⚙️ Coaching Rules
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        isFullWidth
                        className="justify-start text-gray-300 hover:text-white"
                      >
                        📊 Detailed Metrics
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        isFullWidth
                        className="justify-start text-gray-300 hover:text-white"
                      >
                        ✅ Save Session
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
