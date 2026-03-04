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
import { CRICKET_BOWLING_RULES } from '@/rules/cricketRules';
import { SessionAggregator } from '@/utils/sessionAggregator';
import { saveSessionToFirestore, updateSessionR2Objects } from '@/services/firestoreSessionService';
import { uploadKeypointsToR2, uploadVideoToR2 } from '@/services/r2UploadService';
import { ActivityDetector, ActivityStatus } from '@/engine/activityDetector';
import { DetectionPipeline, PipelineStatus } from '@/engine/detectionPipeline';

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

  // Activity detection — human presence + action recognition
  const activityDetectorRef = useRef<ActivityDetector>(new ActivityDetector('fitness'));
  const [detectionStatus, setDetectionStatus] = useState<ActivityStatus>('idle');
  const [detectionMessage, setDetectionMessage] = useState<string>('');
  const [detectionSeverity, setDetectionSeverity] = useState<'info' | 'warning' | 'error'>('info');
  const [liveScore, setLiveScore] = useState<number | null>(null);

  // Detection pipeline (COCO-SSD + confidence + smoothing + tracking + stability)
  const pipelineRef = useRef<DetectionPipeline>(new DetectionPipeline());
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('initializing');
  const [pipelineMessage, setPipelineMessage] = useState<string>('Initializing detection...');
  const [pipelineReady, setPipelineReady] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const poseFrameCountRef = useRef(0);

  // Session management
  const sessionAggregatorRef = useRef<SessionAggregator>(new SessionAggregator());
  const sessionStartTimeRef = useRef<number>(0);

  // Video recording
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingMimeTypeRef = useRef<string>('video/webm');
  const recordingFileExtRef = useRef<string>('webm');
  const dataRequestIntervalRef = useRef<number | null>(null);

  // Session save states
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Camera facing mode for mobile
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const currentUser: User = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    initials: user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  };

  // Initialize rule engine + activity detector when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      const engine = new RuleEngine({ defaultCooldownMs: 3000, maxActiveViolations: 3 });
      
      // Load rules based on activity category
      if (selectedActivity.category === 'fitness') {
        engine.addRules(FITNESS_RULES);
      } else {
        engine.addRules(CRICKET_BOWLING_RULES);
      }
      
      ruleEngineRef.current = engine;
      smootherRef.current.reset();

      // Configure activity detector
      activityDetectorRef.current.setActivity(selectedActivity.category);
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
    poseFrameCountRef.current++;

    // ── 0. Always clear canvas first — no stale skeleton lingers ──
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // ── 0b. Run detection pipeline (COCO-SSD + confidence + smoothing + tracking + stability) ──
    let pipelineResult;
    if (pipelineRef.current.ready) {
      pipelineResult = pipelineRef.current.processSync(results);
      setPipelineStatus(pipelineResult.status);
      setPipelineMessage(pipelineResult.message);
      setPersonCount(pipelineResult.personCount);

      // Run COCO-SSD async every few frames (lightweight — doesn't block)
      if (poseFrameCountRef.current % 3 === 0 && videoRef.current) {
        pipelineRef.current.process(videoRef.current, results).then(asyncResult => {
          setPipelineStatus(asyncResult.status);
          setPipelineMessage(asyncResult.message);
          setPersonCount(asyncResult.personCount);
        }).catch(() => {});
      }
    } else {
      pipelineResult = null;
    }

    // Use pipeline-smoothed landmarks if available, otherwise raw
    const effectiveResults: PoseLandmarks = pipelineResult?.poseLandmarks ?? results;
    const shouldProceed = pipelineResult ? pipelineResult.shouldScore : true;
    const shouldDraw = pipelineResult ? pipelineResult.shouldDrawSkeleton : true;

    // ── 1. Biomechanics ──────────────────────────────────────────
    const biomechanics = calculateBiomechanics(effectiveResults, 0.3);
    const smoothedBiomechanics = smootherRef.current.smoothFrame(biomechanics);
    setCurrentBiomechanics(smoothedBiomechanics);

    // ── 2. Rule engine ───────────────────────────────────────────
    const violations = ruleEngineRef.current
      ? ruleEngineRef.current.evaluate(smoothedBiomechanics)
      : [];

    // ── 3. Activity detection (human presence + action check) ────
    const actResult = activityDetectorRef.current.evaluate(
      smoothedBiomechanics,
      effectiveResults.landmarks ?? null,
      violations
    );

    // Override activity detection with pipeline status when not ready
    if (pipelineResult && pipelineResult.status !== 'ready') {
      setDetectionStatus(pipelineResult.status === 'no_human' ? 'no_human' : 'idle');
      setDetectionMessage(pipelineResult.message);
      setDetectionSeverity(pipelineResult.severity);
    } else {
      setDetectionStatus(actResult.status);
      setDetectionMessage(actResult.message);
      setDetectionSeverity(actResult.severity);
    }

    // ── 4. Session aggregation ───────────────────────────────────
    if (sessionAggregatorRef.current.isActive() && shouldProceed) {
      if (actResult.status !== 'no_human') {
        sessionAggregatorRef.current.addFrame(smoothedBiomechanics);
      }
      if (violations.length > 0) {
        sessionAggregatorRef.current.addViolations(violations);
      }
      sessionAggregatorRef.current.addFrameQuality(
        actResult.status,
        actResult.frameQualityScore
      );
      setLiveScore(sessionAggregatorRef.current.getLiveScore());
    }

    // ── 5. Canvas skeleton — only draw when pipeline + activity say OK ──
    if (
      canvasRef.current &&
      effectiveResults?.landmarks &&
      effectiveResults.landmarks.length > 0 &&
      shouldDraw &&
      actResult.status !== 'no_human'
    ) {
      drawSkeleton(canvasRef.current, effectiveResults, {
        jointColor: '#00D9FF',
        lineColor: '#0080FF',
        jointRadius: 8,
        lineWidth: 3,
        visibilityThreshold: 0.5,
      });
    }

    // ── 6. Update metrics only when human present and pipeline ready ──
    if (actResult.status !== 'no_human' && shouldProceed) {
      updateMetricsFromBiomechanics(smoothedBiomechanics);
    }

    // ── 7. Feedback from violations (only when performing) ───────
    if (actResult.status === 'performing' && shouldProceed && violations.length > 0) {
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
        // Sync canvas size to video
        if (canvasRef.current) {
          const w = videoRef.current.videoWidth || videoRef.current.clientWidth;
          const h = videoRef.current.videoHeight || videoRef.current.clientHeight;
          if (canvasRef.current.width !== w || canvasRef.current.height !== h) {
            canvasRef.current.width = w;
            canvasRef.current.height = h;
          }
        }
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
              facingMode: facingMode
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
                
                // Initialize COCO-SSD detection pipeline
                console.log('Initializing COCO-SSD detection pipeline...');
                try {
                  await pipelineRef.current.initialize();
                  setPipelineReady(true);
                  setPipelineStatus('ready');
                  setPipelineMessage('');
                  console.log('✅ Detection pipeline ready (COCO-SSD + confidence + tracking + stability)');
                } catch (pipelineErr) {
                  console.warn('⚠️ COCO-SSD pipeline failed — falling back to pose-only detection:', pipelineErr);
                  setPipelineMessage('Person detection unavailable — using pose-only mode.');
                }

                // Small delay to ensure everything is ready
                await new Promise(resolve => setTimeout(resolve, 500));
                
                setIsInitializing(false);
                
                // Start pose detection loop
                console.log('Starting detection loop...');
                startPoseDetectionLoop();
                
                // Start video recording once everything is ready
                startVideoRecording();
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

      // Dispose detection pipeline
      pipelineRef.current.dispose();
      setPipelineStatus('initializing');
      setPipelineReady(false);
      
      // ⚠️ IMPORTANT: Only stop camera if NOT recording
      // During recording, we need the stream alive for MediaRecorder
      if (!isSessionActive && videoRef.current && videoRef.current.srcObject) {
        console.log('Stopping camera (session not active)');
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      } else if (isSessionActive) {
        console.log('🔐 Keeping camera alive - session in progress');
      }
    };
  }, [isSessionActive, facingMode]);
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch between front and rear camera (mobile only)
  const handleSwitchCamera = async () => {
    if (!isSessionActive) return;
    
    console.log('Switching camera from', facingMode, 'to', facingMode === 'user' ? 'environment' : 'user');
    
    // Stop current stream
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Stop pose detection temporarily
    isDetectionActiveRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Toggle facing mode
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // The useEffect will reinitialize with new facing mode
  };

  // Start video recording
  const startVideoRecording = () => {
    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      console.error('[VideoRecording] ❌ MediaRecorder API not supported on this browser');
      alert('Video recording is not supported on this device/browser. Session data will be saved without video.');
      return;
    }

    // videoRef is most reliable source since it's set to srcObject during camera init
    const videoStream = videoRef.current?.srcObject as MediaStream | null;
    const referenceStream = streamRef.current;
    const stream = videoStream || referenceStream;
    
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = isAndroid || isIOS;
    const platform = isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop';
    
    console.log('[VideoRecording] Starting video recording...');
    console.log('[VideoRecording] Platform:', platform);
    console.log('[VideoRecording] User Agent:', navigator.userAgent);
    console.log('[VideoRecording] videoRef stream:', !!videoStream, videoStream?.getTracks().length || 0, 'tracks');
    console.log('[VideoRecording] streamRef backup:', !!referenceStream);
    console.log('[VideoRecording] Using:', videoStream ? 'videoRef' : referenceStream ? 'streamRef' : 'NONE');
    
    if (!stream) {
      console.error('[VideoRecording] ❌ No stream available - cannot record');
      return;
    }

    // Verify stream has active video tracks
    const videoTracks = stream.getVideoTracks();
    console.log('[VideoRecording] Video tracks found:', videoTracks.length);
    
    if (videoTracks.length === 0) {
      console.error('[VideoRecording] ❌ No video tracks in stream');
      return;
    }
    
    videoTracks.forEach((track, idx) => {
      console.log(`[VideoRecording] Track ${idx}:`, track.label, 'State:', track.readyState, 'Enabled:', track.enabled);
    });
    
    const activeTrack = videoTracks.find(track => track.readyState === 'live');
    if (!activeTrack) {
      console.error('[VideoRecording] ❌ No active video tracks');
      console.error('[VideoRecording] Track states:', videoTracks.map(t => t.readyState).join(', '));
      return;
    }
    
    console.log('[VideoRecording] ✅ Active video track found:', activeTrack.label);
    console.log('[VideoRecording] Track settings:', activeTrack.getSettings());

    try {
      recordedChunksRef.current = [];
      console.log('[VideoRecording] Cleared recorded chunks');
      
      // Log supported codecs for debugging
      console.log('[VideoRecording] === Codec Support Check ===');
      const testCodecs = [
        'video/webm',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm;codecs=h264',
        'video/mp4',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264',
        'video/x-matroska;codecs=avc1',
      ];
      testCodecs.forEach(codec => {
        const supported = MediaRecorder.isTypeSupported(codec);
        console.log(`[VideoRecording] ${supported ? '✅' : '❌'} ${codec}`);
      });
      console.log('[VideoRecording] ========================');
      
      // Platform-optimized codec selection
      let codecOptions: Array<{ mimeType: string; ext: string }> = [];
      
      if (isAndroid) {
        // Android: Prioritize VP8/VP9 WebM
        console.log('[VideoRecording] Using Android-optimized codec list');
        codecOptions = [
          { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
          { mimeType: 'video/webm', ext: 'webm' },
          { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
          { mimeType: 'video/mp4', ext: 'mp4' },
        ];
      } else if (isIOS) {
        // iOS: Prioritize H264 MP4
        console.log('[VideoRecording] Using iOS-optimized codec list');
        codecOptions = [
          { mimeType: 'video/mp4', ext: 'mp4' },
          { mimeType: 'video/mp4;codecs=h264', ext: 'mp4' },
          { mimeType: 'video/webm', ext: 'webm' },
        ];
      } else {
        // Desktop: Try VP9 first, then others
        console.log('[VideoRecording] Using Desktop codec list');
        codecOptions = [
          { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
          { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
          { mimeType: 'video/webm', ext: 'webm' },
          { mimeType: 'video/mp4', ext: 'mp4' },
        ];
      }

      let selectedCodec = { mimeType: '', ext: 'webm' };
      
      for (const codec of codecOptions) {
        if (MediaRecorder.isTypeSupported(codec.mimeType)) {
          selectedCodec = codec;
          console.log('[VideoRecording] ✅ Codec supported:', codec.mimeType);
          break;
        } else {
          console.log('[VideoRecording] ❌ Not supported:', codec.mimeType);
        }
      }

      if (!selectedCodec.mimeType) {
        console.error('[VideoRecording] ❌ No supported codecs found from list');
        console.log('[VideoRecording] Attempting to create MediaRecorder without specifying codec');
        selectedCodec = { mimeType: '', ext: 'webm' }; // Will try without mimeType
      }

      // Store mime type and extension for later use
      recordingMimeTypeRef.current = selectedCodec.mimeType || 'video/webm';
      recordingFileExtRef.current = selectedCodec.ext;

      let mediaRecorder: MediaRecorder;
      
      // Try to create MediaRecorder with or without options
      try {
        if (selectedCodec.mimeType) {
          const options: MediaRecorderOptions = {
            mimeType: selectedCodec.mimeType,
          };
          
          // Only add bitrate for desktop and specific codecs
          if (!isMobile || !isAndroid) {
            options.videoBitsPerSecond = 2500000;
          } else {
            console.log('[VideoRecording] Skipping bitrate setting for Android');
          }
          
          console.log('[VideoRecording] Creating MediaRecorder with options:', options);
          mediaRecorder = new MediaRecorder(stream, options);
        } else {
          console.log('[VideoRecording] Creating MediaRecorder without options (browser default)');
          mediaRecorder = new MediaRecorder(stream);
          // Store whatever the browser chose
          if (mediaRecorder.mimeType) {
            recordingMimeTypeRef.current = mediaRecorder.mimeType;
            console.log('[VideoRecording] Browser selected:', mediaRecorder.mimeType);
          }
        }
      } catch (createError) {
        console.error('[VideoRecording] ❌ Failed to create with options, trying default:', createError);
        mediaRecorder = new MediaRecorder(stream);
        if (mediaRecorder.mimeType) {
          recordingMimeTypeRef.current = mediaRecorder.mimeType;
          console.log('[VideoRecording] Fallback successful with:', mediaRecorder.mimeType);
        }
      }
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('[VideoRecording] 📦 Data chunk arrived:', (event.data.size / 1024).toFixed(1), 'KB');
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log('[VideoRecording] Chunk #' + recordedChunksRef.current.length + ' stored');
          console.log('[VideoRecording] Total data so far:', (recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / 1024).toFixed(1), 'KB');
        } else {
          console.warn('[VideoRecording] ⚠️ Empty chunk received');
        }
      };
      
      mediaRecorder.onstart = () => {
        console.log('[VideoRecording] ✅ Recording started successfully');
      };
      
      mediaRecorder.onerror = (event: Event) => {
        console.error('[VideoRecording] ❌ MediaRecorder error:', event);
        const errorEvent = event as ErrorEvent;
        if (errorEvent.error) {
          console.error('[VideoRecording] Error details:', errorEvent.error);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('[VideoRecording] Recording stopped event fired');
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording - use different timeslice based on platform
      try {
        // Android sometimes has issues with timeslices, try without it or with shorter interval
        if (isAndroid) {
          console.log('[VideoRecording] Starting without timeslice (Android)');
          mediaRecorder.start(); // No timeslice for Android
        } else {
          console.log('[VideoRecording] Starting with 1000ms timeslice');
          mediaRecorder.start(1000);
        }
        
        setIsRecording(true);
        console.log('🎥 Recording started with', recordingMimeTypeRef.current, 'at', new Date().toLocaleTimeString());
        
        // For Android without timeslice, manually request data periodically
        if (isAndroid) {
          console.log('[VideoRecording] Setting up periodic data request for Android');
          dataRequestIntervalRef.current = window.setInterval(() => {
            if (mediaRecorder.state === 'recording') {
              try {
                mediaRecorder.requestData();
                console.log('[VideoRecording] Requested data (periodic)');
              } catch (e) {
                console.warn('[VideoRecording] Failed to request data:', e);
              }
            }
          }, 2000); // Request data every 2 seconds
        }
        
        // Verify recording state after a short delay
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            console.log('[VideoRecording] ✅ Verified: Recording is active');
          } else {
            console.error('[VideoRecording] ❌ Recording state:', mediaRecorder.state);
            alert('Warning: Recording may not have started properly. Check console for details.');
          }
        }, 500);
      } catch (startError) {
        console.error('[VideoRecording] ❌ Failed to start MediaRecorder:', startError);
        throw startError;
      }
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      console.error('[VideoRecording] Error details:', error instanceof Error ? error.message : error);
      alert('Failed to start video recording. Session will be saved without video.');
    }
  };

  // Stop video recording
  const stopVideoRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      // Clear periodic data request interval if it exists
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
        console.log('[VideoRecording] Cleared periodic data request interval');
      }
      
      console.log('[VideoRecording] Stop requested...');
      console.log('[VideoRecording] Chunks collected so far:', recordedChunksRef.current.length);
      console.log('[VideoRecording] Recorder exists:', !!mediaRecorder);
      console.log('[VideoRecording] Recorder state:', mediaRecorder?.state);
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.warn('[VideoRecording] ⚠️ Recorder not active');
        
        // Check if we have chunks anyway (shouldn't happen but be safe)
        if (recordedChunksRef.current.length > 0) {
          console.log('[VideoRecording] Creating blob from existing chunks');
          const mimeType = recordingMimeTypeRef.current;
          const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          console.log(`✅ Video blob created: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB (${mimeType})`);
          resolve(videoBlob);
        } else {
          resolve(null);
        }
        return;
      }

      // Request any pending data before stopping (important for Android)
      try {
        console.log('[VideoRecording] Requesting final data...');
        mediaRecorder.requestData();
      } catch (requestError) {
        console.warn('[VideoRecording] ⚠️ Could not request data:', requestError);
      }

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error('[VideoRecording] ⏱️ Timeout waiting for stop event');
        if (recordedChunksRef.current.length > 0) {
          const mimeType = recordingMimeTypeRef.current;
          const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          console.log(`⚠️ Created blob despite timeout: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
          setIsRecording(false);
          resolve(videoBlob);
        } else {
          console.error('[VideoRecording] ❌ Timeout with no chunks - recording failed');
          setIsRecording(false);
          resolve(null);
        }
      }, 5000); // 5 second timeout

      mediaRecorder.onstop = () => {
        clearTimeout(timeout);
        console.log('[VideoRecording] ⏹️  Recorder stopped');
        console.log('[VideoRecording] Total chunks:', recordedChunksRef.current.length);
        
        if (recordedChunksRef.current.length === 0) {
          console.warn('❌ NO CHUNKS RECORDED - recording may have failed');
          console.warn('[VideoRecording] Possible causes: codec not supported, stream lost, or browser limitation');
          setIsRecording(false);
          resolve(null);
          return;
        }
        
        // Calculate total size
        const totalSize = recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('[VideoRecording] Total data size:', (totalSize / 1024).toFixed(1), 'KB');
        
        // Use the mime type that was used for recording
        const mimeType = recordingMimeTypeRef.current;
        const videoBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setIsRecording(false);
        console.log(`✅ Video blob created: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB (${mimeType})`);
        resolve(videoBlob);
      };

      try {
        mediaRecorder.stop();
        console.log('[VideoRecording] Stop command sent');
      } catch (stopError) {
        clearTimeout(timeout);
        console.error('[VideoRecording] ❌ Error stopping recorder:', stopError);
        setIsRecording(false);
        resolve(null);
      }
    });
  };

  // Save session with R2 upload
  const saveSession = async (videoBlob: Blob | null) => {
    const completedSession = sessionAggregatorRef.current.stopSession();
    if (!completedSession || !user?.uid) {
      console.warn('⚠️ No session to save or user not authenticated');
      setSaveError('Session not ready or user not authenticated');
      return;
    }

    setIsSavingSession(true);
    setSaveError(null);
    setSaveProgress('Saving session to Firestore...');

    try {
      // Step 1: Save to Firestore
      console.log('📝 Saving session:', completedSession.sessionId);
      await saveSessionToFirestore(user.uid, completedSession);
      console.log('✅ Session saved to Firestore');

      // Step 2: Upload to R2 if video available
      if (videoBlob && videoBlob.size > 0) {
        console.log(`📹 Video blob size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📹 Video type: ${videoBlob.type}`);
        setSaveProgress('Uploading session data to R2...');
        
        const sessionData = {
          sessionId: completedSession.sessionId,
          activityType: completedSession.activityType,
          startTime: completedSession.startTime,
          endTime: completedSession.endTime,
          duration: completedSession.duration,
          metrics: completedSession.metrics,
        };

        try {
          console.log('📤 Starting R2 session data upload...');
          const sessionDataUrl = await uploadKeypointsToR2(
            completedSession.sessionId,
            [sessionData]
          );
          console.log('✅ Session data uploaded:', sessionDataUrl);

          setSaveProgress('Uploading video to R2...');
          console.log('📹 Starting video upload to R2...');
          const fileExt = recordingFileExtRef.current;
          const videoUrl = await uploadVideoToR2(
            completedSession.sessionId,
            videoBlob,
            `session.${fileExt}`
          );
          console.log('✅ Video uploaded:', videoUrl);

          setSaveProgress('Linking R2 URLs to session...');
          console.log('🔗 Updating Firestore with R2 URLs...');
          await updateSessionR2Objects(user.uid, completedSession.sessionId, {
            sessionDataUrl,
            videoUrl,
          });
          console.log('✅ R2 URLs linked to session');
          setSaveProgress('Session and video saved successfully! ✅');

        } catch (r2Error) {
          console.error('❌ R2 upload error:', r2Error);
          console.error('❌ Error details:', r2Error instanceof Error ? r2Error.message : 'Unknown error');
          
          // Don't throw - session is already saved to Firestore
          // Show warning instead of error
          setSaveProgress('⚠️ Session saved but video upload failed. Session saved to Firestore.');
          
          // Show error in UI but don't prevent navigation
          const errorMsg = r2Error instanceof Error ? r2Error.message : 'Unknown error';
          console.warn(`⚠️ Continuing despite R2 error: ${errorMsg}`);
        }
      } else {
        console.warn('⚠️ No video blob to upload - session saved to Firestore only');
        if (videoBlob === null) {
          console.warn('[VideoRecording] Video blob is null - recording may have failed to start');
        } else if (videoBlob.size === 0) {
          console.warn('[VideoRecording] Video blob is empty (0 bytes)');
        }
        setSaveProgress('⚠️ Session saved without video (no video was recorded)');
      }

      // Always navigate to sessions after a delay, regardless of video upload success
      setTimeout(() => {
        setSaveProgress('');
        navigate('/sessions');
      }, 2000);
    } catch (error) {
      console.error('❌ Error saving session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session';
      setSaveError(errorMessage);
      setSaveProgress('');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleStartStop = async () => {
    if (isSessionActive) {
      // Stop session
      setIsSessionActive(false);
      
      console.log('[Session] Stopping session and video recording...');
      
      // Stop video recording
      const videoBlob = await stopVideoRecording();
      
      console.log('[Session] Video blob received:', {
        exists: !!videoBlob,
        size: videoBlob ? `${(videoBlob.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
        type: videoBlob?.type || 'N/A'
      });
      
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
      setLiveScore(null);
      setDetectionStatus('idle');
      setDetectionMessage('');
      
      if (ruleEngineRef.current) {
        ruleEngineRef.current.reset();
      }
      smootherRef.current.reset();
      activityDetectorRef.current.reset();
      pipelineRef.current.reset();
      
      // Start session aggregator
      sessionAggregatorRef.current.startSession(selectedActivity.category);
      sessionStartTimeRef.current = Date.now();
      
      // Start video recording
      // Video recording will be started in accessCamera once the stream is ready
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
                  style={{ pointerEvents: 'none' }}
                />

                {/* ── Detection Status Overlay (pipeline + activity) ─── */}
                {!isInitializing && poseInitialized && (pipelineStatus !== 'ready' || detectionStatus !== 'performing') && (
                  <div
                    className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3"
                    style={{
                      background:
                        (pipelineStatus === 'no_human' || detectionStatus === 'no_human')
                          ? 'rgba(239,68,68,0.85)'
                          : (pipelineStatus === 'too_far' || pipelineStatus === 'too_close')
                            ? 'rgba(234,179,8,0.85)'
                            : (pipelineStatus === 'low_confidence' || pipelineStatus === 'stabilizing')
                              ? 'rgba(59,130,246,0.85)'
                              : detectionSeverity === 'warning'
                                ? 'rgba(234,179,8,0.85)'
                                : 'rgba(14,165,233,0.80)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <span className="text-lg">
                      {(pipelineStatus === 'no_human' || detectionStatus === 'no_human') ? '\uD83D\uDEAB'
                        : pipelineStatus === 'too_far' ? '\uD83D\uDD2D'
                        : pipelineStatus === 'too_close' ? '\uD83D\uDD90\uFE0F'
                        : pipelineStatus === 'low_confidence' ? '\uD83D\uDC41\uFE0F'
                        : pipelineStatus === 'stabilizing' ? '\u23F3'
                        : '\u23F8\uFE0F'}
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {(pipelineStatus !== 'ready' && pipelineMessage)
                        ? pipelineMessage
                        : detectionMessage ||
                          (detectionStatus === 'no_human'
                            ? 'No athlete detected \u2014 step into frame.'
                            : `Begin your ${selectedActivity?.name ?? 'exercise'} to start scoring.`)}
                    </span>
                    {personCount > 1 && (
                      <span className="text-white/70 text-xs ml-auto">
                        \uD83D\uDC65 {personCount} people \u2014 tracking primary
                      </span>
                    )}
                  </div>
                )}

                {/* ── Live Score Badge ─── */}
                {liveScore !== null && detectionStatus === 'performing' && (
                  <div
                    className="absolute top-20 right-4 z-20 flex flex-col items-center rounded-full px-4 py-2"
                    style={{
                      background:
                        liveScore >= 80
                          ? 'rgba(16,185,129,0.90)'
                          : liveScore >= 50
                            ? 'rgba(234,179,8,0.90)'
                            : 'rgba(239,68,68,0.90)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <span className="text-[10px] font-semibold text-white/80 leading-none">SCORE</span>
                    <span className="text-2xl font-extrabold text-white leading-tight">{liveScore}</span>
                  </div>
                )}

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
                  <div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
                    <Badge variant="success" className="bg-success-500/20 backdrop-blur border-success-500/30">
                      <Icons.Check size="sm" className="mr-1" />
                      AI Active
                    </Badge>
                    
                    {/* Recording Status Indicator */}
                    {isRecording ? (
                      <Badge variant="default" className="bg-danger-500/20 backdrop-blur border-danger-500/30">
                        <div className="w-2 h-2 rounded-full bg-danger-500 mr-2 animate-pulse" />
                        Recording
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-gray-500/20 backdrop-blur border-gray-500/30">
                        <Icons.Camera size="sm" className="mr-1 text-gray-400" />
                        No Video
                      </Badge>
                    )}
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

                {/* Camera Switch Button (Mobile Only) */}
                <div className="absolute top-4 right-4 z-10 lg:hidden">
                  <button
                    onClick={handleSwitchCamera}
                    className="p-3 bg-navy-900/80 backdrop-blur rounded-full border border-primary-400/30 text-white hover:bg-navy-800 hover:border-primary-400 transition-all shadow-lg active:scale-95"
                    aria-label="Switch Camera"
                    title={facingMode === 'user' ? 'Switch to Rear Camera' : 'Switch to Front Camera'}
                  >
                    <Icons.RefreshCw size="md" />
                  </button>
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
                className="mt-4 p-3 bg-error-500/10 border border-error-500/30 rounded-lg flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Icons.AlertTriangle size="sm" className="text-error-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-error-300 font-medium">Error Saving Session</p>
                    <p className="text-xs text-error-200 mt-1">{saveError}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSaveError(null)}
                  className="flex-shrink-0 text-error-400 hover:text-error-300"
                >
                  <Icons.X size="sm" />
                </button>
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
