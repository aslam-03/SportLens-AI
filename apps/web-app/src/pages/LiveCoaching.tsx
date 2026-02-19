import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/layouts/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { initializePose, detectPose, closePose, PoseLandmarks } from '@/ai/poseEstimator';
import { drawSkeleton } from '@/utils/drawSkeleton';
import { calculateBiomechanics, AngleSmoother, BiomechanicsFrame } from '@/Biomechanics/angleCalculator';
import { RuleEngine, RuleViolation } from '@/rules/ruleEngine';
import { FITNESS_RULES } from '@/rules/fitnessRules';
import { SessionAggregator } from '@/utils/sessionAggregator';
import { saveSessionToFirestore, updateSessionR2Objects } from '@/services/firestoreSessionService';
import { uploadKeypointsToR2, uploadVideoToR2 } from '@/services/r2UploadService';

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
  const [poseInitialized, setPoseInitialized] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const [realTimeFeedback, setRealTimeFeedback] = useState<Array<{id: number; type: string; message: string; timestamp: string}>>([]);
  const [currentBiomechanics, setCurrentBiomechanics] = useState<BiomechanicsFrame | null>(null);
  const isDetectionActiveRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const lastValidMetricsRef = useRef<Metric[]>([]);
  
  // Rule engine and smoother instances
  const ruleEngineRef = useRef<RuleEngine | null>(null);
  const smootherRef = useRef<AngleSmoother>(new AngleSmoother(5));
  const feedbackIdCounter = useRef(0);

  // Session management
  const sessionAggregatorRef = useRef<SessionAggregator>(new SessionAggregator());
  const sessionStartTimeRef = useRef<number>(0);

  // Video recording
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Session save states
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  };

  // Initialize rule engine when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      const engine = new RuleEngine({ defaultCooldownMs: 3000, maxActiveViolations: 3 });
      
      // Load rules based on activity category
      if (selectedActivity.category === 'fitness') {
        engine.addRules(FITNESS_RULES);
      }
      // Cricket rules can be added here when available
      
      ruleEngineRef.current = engine;
      smootherRef.current.reset();
    }
  }, [selectedActivity]);

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

  // Handle pose detection results
  const handlePoseResults = (results: PoseLandmarks) => {
    console.log('Pose results received:', results ? 'Landmarks detected' : 'No landmarks');
    
    // Draw skeleton overlay on canvas
    if (canvasRef.current && results) {
      drawSkeleton(canvasRef.current, results, {
        jointColor: '#00D9FF', // Bright cyan for visibility
        lineColor: '#0080FF', // Blue for connections
        jointRadius: 8,
        lineWidth: 3
      });
    }

    // Calculate real biomechanics
    const biomechanics = calculateBiomechanics(results, 0.5);
    const smoothedBiomechanics = smootherRef.current.smoothFrame(biomechanics);
    setCurrentBiomechanics(smoothedBiomechanics);

    // Add frame to session aggregator if session is active
    if (sessionAggregatorRef.current.isActive()) {
      sessionAggregatorRef.current.addFrame(smoothedBiomechanics);
    }

    // Update metrics based on real biomechanics
    updateMetricsFromBiomechanics(smoothedBiomechanics);

    // Evaluate rules and generate feedback
    if (ruleEngineRef.current) {
      const violations = ruleEngineRef.current.evaluate(smoothedBiomechanics);
      
      // Add violations to session aggregator if session is active
      if (sessionAggregatorRef.current.isActive() && violations.length > 0) {
        sessionAggregatorRef.current.addViolations(violations);
      }
      
      updateFeedbackFromViolations(violations);
    }
  };

  // Start continuous pose detection with proper ref tracking
  const startPoseDetectionLoop = () => {
    console.log('Starting pose detection loop');
    isDetectionActiveRef.current = true;
    
    const detectFrame = async () => {
      if (!isDetectionActiveRef.current) {
        console.log('Detection stopped');
        return;
      }

      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          await detectPose(videoRef.current);
        } catch (error) {
          console.error('Pose detection error:', error);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };
    
    detectFrame();
  };

  // Initialize camera and pose detection
  useEffect(() => {
    if (isSessionActive && videoRef.current && canvasRef.current) {
      console.log('Initializing camera and pose detection...');
      setIsInitializing(true);
      
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
          
          // Store stream reference for video recording
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            console.log('Camera stream set');
            
            // Wait for video metadata to load
            await new Promise<void>((resolve) => {
              if (videoRef.current) {
                videoRef.current.onloadedmetadata = () => {
                  console.log('Video metadata loaded');
                  resolve();
                };
              }
            });
            
            if (videoRef.current && canvasRef.current) {
              // Set canvas size to match video
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              console.log(`Canvas size set to ${canvasRef.current.width}x${canvasRef.current.height}`);
              
              // Wait for video to actually play
              await videoRef.current.play();
              console.log('Video playing');
              
              // Initialize pose detection
              try {
                console.log('Initializing MediaPipe Pose...');
                await initializePose(videoRef.current, handlePoseResults);
                setPoseInitialized(true);
                console.log('✓ Pose detection initialized successfully');
                
                // Small delay to ensure everything is ready
                await new Promise(resolve => setTimeout(resolve, 500));
                
                setIsInitializing(false);
                
                // Start pose detection loop
                console.log('Starting detection loop...');
                startPoseDetectionLoop();
              } catch (error) {
                console.error('❌ Failed to initialize pose detection:', error);
                setIsInitializing(false);
                alert('Failed to initialize pose detection. Please refresh and try again.');
              }
            }
          }
        } catch (error) {
          console.error('❌ Error accessing camera:', error);
          setIsInitializing(false);
          alert('Unable to access camera. Please check permissions.');
          setIsSessionActive(false);
        }
      };
      
      accessCamera();
    }

    return () => {
      console.log('Cleaning up pose detection...');
      setIsInitializing(false);
      
      // Stop pose detection loop
      isDetectionActiveRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Close pose detector
      if (poseInitialized) {
        closePose();
        setPoseInitialized(false);
      }
      
      // Stop camera
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

  // Start video recording
  const startVideoRecording = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) {
      console.warn('[VideoRecording] No stream available');
      return;
    }

    try {
      recordedChunksRef.current = [];
      const options = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000,
      };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log('🎥 Video recording started');
    } catch (error) {
      console.error('Failed to start video recording:', error);
    }
  };

  // Stop video recording
  const stopVideoRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setIsRecording(false);
        console.log(`🎥 Video recorded: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
        resolve(videoBlob);
      };

      mediaRecorder.stop();
    });
  };

  // Save session with R2 upload
  const saveSession = async (videoBlob: Blob | null) => {
    const completedSession = sessionAggregatorRef.current.stopSession();
    if (!completedSession || !user?.uid) {
      console.warn('No session to save or user not authenticated');
      return;
    }

    setIsSavingSession(true);
    setSaveError(null);
    setSaveProgress('Saving session...');

    try {
      // Save to Firestore
      await saveSessionToFirestore(user.uid, completedSession);
      console.log('✅ Session saved to Firestore');

      // Upload to R2 if video available
      if (videoBlob) {
        setSaveProgress('Uploading video...');
        
        const sessionData = {
          sessionId: completedSession.sessionId,
          activityType: completedSession.activityType,
          startTime: completedSession.startTime,
          endTime: completedSession.endTime,
          duration: completedSession.duration,
          metrics: completedSession.metrics,
        };

        const sessionDataUrl = await uploadKeypointsToR2(
          completedSession.sessionId,
          [sessionData]
        );

        const videoUrl = await uploadVideoToR2(
          completedSession.sessionId,
          videoBlob,
          'session.webm'
        );

        await updateSessionR2Objects(user.uid, completedSession.sessionId, {
          sessionDataUrl,
          videoUrl,
        });

        console.log('✅ Video uploaded to R2');
      }

      setSaveProgress('Session saved successfully!');
      setTimeout(() => {
        setSaveProgress('');
        navigate('/sessions');
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving session:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save session');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleStartStop = async () => {
    if (isSessionActive) {
      // Stop session
      setIsSessionActive(false);
      
      // Stop video recording
      const videoBlob = await stopVideoRecording();
      
      // Save session
      await saveSession(videoBlob);
      
      // Stop camera stream after session
      stopCameraStream();
      
      setSessionTime(0);
      setCurrentMetrics([]);
      lastValidMetricsRef.current = [];
    } else {
      // Start session
      if (!selectedActivity) return;
      
      setIsSessionActive(true);
      setCurrentMetrics([]);
      setRealTimeFeedback([]);
      setCurrentBiomechanics(null);
      lastValidMetricsRef.current = [];
      
      if (ruleEngineRef.current) {
        ruleEngineRef.current.reset();
      }
      smootherRef.current.reset();
      
      // Start session aggregator
      sessionAggregatorRef.current.startSession(selectedActivity.category);
      sessionStartTimeRef.current = Date.now();
      
      // Start video recording
      startVideoRecording();
    }
  };

  // Stop and release camera stream
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🎥 Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSelectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
  };

  const handleBackToActivities = () => {
    if (isSessionActive) {
      handleStartStop(); // Stop session first
    }
    // Stop camera stream
    stopCameraStream();
    setSelectedActivity(null);
  };

  // Convert biomechanics to display metrics
  const updateMetricsFromBiomechanics = (biomechanics: BiomechanicsFrame) => {
    if (!selectedActivity) return;

    const metrics: Metric[] = [];

    // Map activity-specific metrics
    switch (selectedActivity.id) {
      case 'squat-form':
      case 'lunge-form':
        // Knee Angle
        if (biomechanics.leftKneeAngle !== null) {
          metrics.push({
            label: 'Knee Angle',
            value: Math.round(biomechanics.leftKneeAngle),
            unit: '°',
            status: biomechanics.leftKneeAngle >= 70 && biomechanics.leftKneeAngle <= 110 ? 'good' : 
                   biomechanics.leftKneeAngle >= 60 && biomechanics.leftKneeAngle <= 120 ? 'warning' : 'critical'
          });
        }
        
        // Hip Depth
        if (biomechanics.leftHipAngle !== null) {
          metrics.push({
            label: 'Hip Depth',
            value: Math.round(biomechanics.leftHipAngle),
            unit: '°',
            status: biomechanics.leftHipAngle >= 100 && biomechanics.leftHipAngle <= 160 ? 'good' : 'warning'
          });
        }
        
        // Back Angle (shoulder angle indicates torso position)
        if (biomechanics.leftShoulderAngle !== null) {
          metrics.push({
            label: 'Back Angle',
            value: Math.round(biomechanics.leftShoulderAngle),
            unit: '°',
            status: biomechanics.leftShoulderAngle >= 50 && biomechanics.leftShoulderAngle <= 90 ? 'good' : 'warning'
          });
        }
        break;

      case 'plank-hold':
        // Body Alignment
        if (biomechanics.leftHipAngle !== null && biomechanics.leftShoulderAngle !== null) {
          const avgAlignment = (biomechanics.leftHipAngle + biomechanics.leftShoulderAngle) / 2;
          metrics.push({
            label: 'Alignment',
            value: Math.round(avgAlignment),
            unit: '°',
            status: avgAlignment >= 150 && avgAlignment <= 180 ? 'good' : 'warning'
          });
        }
        
        // Core Engagement (hip stability)
        if (biomechanics.leftHipAngle !== null && biomechanics.rightHipAngle !== null) {
          const hipStability = 180 - Math.abs(biomechanics.leftHipAngle - biomechanics.rightHipAngle);
          metrics.push({
            label: 'Core Stability',
            value: Math.round(hipStability),
            unit: '%',
            status: hipStability >= 95 ? 'good' : hipStability >= 85 ? 'warning' : 'critical'
          });
        }
        break;

      case 'batting-stance':
      case 'bowling-action':
      case 'fielding-position':
        // Cricket activities - full body tracking
        
        // Stance/Balance
        if (biomechanics.leftKneeAngle !== null && biomechanics.rightKneeAngle !== null) {
          const avgKnee = (biomechanics.leftKneeAngle + biomechanics.rightKneeAngle) / 2;
          metrics.push({
            label: 'Stance',
            value: Math.round(avgKnee),
            unit: '°',
            status: avgKnee >= 140 && avgKnee <= 175 ? 'good' : 'warning'
          });
        }
        
        // Shoulder Alignment
        if (biomechanics.leftShoulderAngle !== null && biomechanics.rightShoulderAngle !== null) {
          const shoulderDiff = Math.abs(biomechanics.leftShoulderAngle - biomechanics.rightShoulderAngle);
          metrics.push({
            label: 'Shoulders',
            value: Math.round(100 - shoulderDiff),
            unit: '%',
            status: shoulderDiff < 10 ? 'good' : shoulderDiff < 20 ? 'warning' : 'critical'
          });
        }
        
        // Hip Rotation
        if (biomechanics.leftHipAngle !== null) {
          metrics.push({
            label: 'Hip Angle',
            value: Math.round(biomechanics.leftHipAngle),
            unit: '°',
            status: biomechanics.leftHipAngle >= 140 && biomechanics.leftHipAngle <= 180 ? 'good' : 'warning'
          });
        }
        
        // Arm Angle (for bowling/batting)
        if (biomechanics.leftElbowAngle !== null) {
          metrics.push({
            label: 'Arm Angle',
            value: Math.round(biomechanics.leftElbowAngle),
            unit: '°',
            status: 'good'
          });
        }
        break;

      default:
        // Generic metrics for other activities
        if (biomechanics.leftKneeAngle !== null) {
          metrics.push({
            label: 'Knee',
            value: Math.round(biomechanics.leftKneeAngle),
            unit: '°',
            status: 'good'
          });
        }
        if (biomechanics.leftElbowAngle !== null) {
          metrics.push({
            label: 'Elbow',
            value: Math.round(biomechanics.leftElbowAngle),
            unit: '°',
            status: 'good'
          });
        }
    }

    // Add balance/alignment metric if we have bilateral data
    if (biomechanics.leftKneeAngle !== null && biomechanics.rightKneeAngle !== null) {
      const diff = Math.abs(biomechanics.leftKneeAngle - biomechanics.rightKneeAngle);
      metrics.push({
        label: 'Balance',
        value: Math.round(100 - diff),
        unit: '%',
        status: diff < 5 ? 'good' : diff < 10 ? 'warning' : 'critical'
      });
    }

    // Calculate overall posture/form score (percentage of metrics in good status)
    if (metrics.length > 0) {
      const goodMetrics = metrics.filter(m => m.status === 'good').length;
      const totalMetrics = metrics.length;
      const score = Math.round((goodMetrics / totalMetrics) * 100);
      
      metrics.unshift({
        label: 'Form Score',
        value: score,
        unit: '%',
        status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical'
      });
    }

    // Always update metrics
    if (metrics.length > 0) {
      // Store as last valid metrics
      lastValidMetricsRef.current = metrics;
      setCurrentMetrics(metrics);
    } else if (lastValidMetricsRef.current.length > 0) {
      // If no new metrics but we have last valid ones, keep showing them
      // This prevents metrics from disappearing when person temporarily moves out of frame
      setCurrentMetrics(lastValidMetricsRef.current);
    } else {
      // No metrics at all yet
      setCurrentMetrics([]);
    }
  };

  // Update feedback messages from rule violations
  const updateFeedbackFromViolations = (violations: RuleViolation[]) => {
    const newFeedback = violations.map(v => {
      const timeAgo = Math.floor((Date.now() - v.timestamp) / 1000);
      return {
        id: feedbackIdCounter.current++,
        type: v.severity === 'error' ? 'warning' : v.severity === 'warning' ? 'warning' : 'info',
        message: v.message,
        timestamp: timeAgo === 0 ? 'now' : `${timeAgo}s ago`
      };
    });

    setRealTimeFeedback(prev => {
      // Keep only recent feedback (last 10 seconds)
      const recent = prev.filter(f => {
        const match = f.timestamp.match(/(\d+)s ago/);
        if (!match) return true; // Keep 'now'
        return parseInt(match[1]) < 10;
      });
      // Add new feedback
      return [...newFeedback, ...recent].slice(0, 5);
    });
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

                {/* Loading Indicator for Pose Detection */}
                {isInitializing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="bg-navy-900/90 rounded-lg p-6 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-white font-semibold mb-2">Initializing AI Pose Detection</p>
                      <p className="text-gray-400 text-sm">Loading MediaPipe from CDN...</p>
                    </div>
                  </div>
                )}

                {/* Pose Detection Status */}
                {!isInitializing && poseInitialized && (
                  <div className="absolute top-20 left-4 z-10">
                    <Badge variant="success" className="bg-success-500/20 backdrop-blur border-success-500/30">
                      <Icons.Check size="sm" className="mr-1" />
                      AI Active
                    </Badge>
                  </div>
                )}

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
                <div className="absolute bottom-4 left-4 right-4 lg:hidden z-10 max-h-56 overflow-y-auto">
                  {currentMetrics.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {currentMetrics.map((metric, index) => (
                        <motion.div
                          key={metric.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-navy-900/95 backdrop-blur-md rounded-xl p-3 text-center border border-navy-700 shadow-lg"
                        >
                          <p className="text-gray-400 text-xs mb-1.5 font-medium truncate">{metric.label}</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                              {metric.value}
                            </p>
                            <span className="text-xs text-gray-500">{metric.unit}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    !isInitializing && (
                      <div className="bg-navy-900/95 backdrop-blur-md rounded-xl p-4 text-center border border-navy-700 shadow-lg">
                        <Icons.Activity size="md" className="text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Position yourself in frame</p>
                      </div>
                    )
                  )}
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
                    className="min-w-[200px] hover:scale-105 active:scale-95 transition-transform"
                  >
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
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleStartStop}
                  className="min-w-[160px]"
                  disabled={isSavingSession}
                >
                  <Icons.Stop size="md" className="mr-2" />
                  {isSavingSession ? 'Saving...' : 'End Session'}
                </Button>
              ) : null}
            </div>
            
            {/* Save Progress */}
            {isSavingSession && saveProgress && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Icons.Activity size="sm" className="text-primary-400" />
                  </motion.div>
                  <p className="text-sm text-primary-300 font-medium">{saveProgress}</p>
                </div>
              </motion.div>
            )}
            
            {/* Save Error */}
            {saveError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-error-500/10 border border-error-500/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Icons.AlertTriangle size="sm" className="text-error-400" />
                  <p className="text-sm text-error-300">{saveError}</p>
                </div>
              </motion.div>
            )}
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
            {currentMetrics.length > 0 ? (
              currentMetrics.map((metric) => (
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
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-primary-500/10 rounded-full mb-4">
                  <Icons.Activity size="lg" className="text-primary-400" />
                </div>
                <p className="text-gray-400 text-sm">
                  {isInitializing ? 'Initializing pose detection...' : 'Position yourself in frame to see metrics'}
                </p>
              </div>
            )}
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
