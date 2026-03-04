import { useEffect, useRef, useState } from "react";
import { initializePose, detectPose, closePose, PoseLandmarks } from "../ai/poseEstimator";
import { drawSkeleton } from "../utils/drawSkeleton";
import { calculateBiomechanics, AngleSmoother, BiomechanicsFrame } from "../Biomechanics/angleCalculator";
import { RuleEngine, RuleViolation } from "../rules/ruleEngine";
import { FITNESS_RULES } from "../rules/fitnessRules";
import { CRICKET_BOWLING_RULES } from "../rules/cricketRules";
import FeedbackPanel from "./FeedbackPanel";
import { SessionAggregator } from "../utils/sessionAggregator";
import { sendSession } from "../services/sessionApi";
import { useAuth } from "../hooks/useAuth";
import { uploadKeypointsToR2, uploadVideoToR2 } from "../services/r2UploadService";
import { updateSessionR2Objects } from "../services/firestoreSessionService";
import { ActivityDetector, ActivityStatus } from "../engine/activityDetector";
import { DetectionPipeline, PipelineStatus } from "../engine/detectionPipeline";

interface CameraStatus {
  state: "idle" | "requesting" | "active" | "blocked" | "unsupported" | "stopped";
  message: string;
}

export default function LiveCoaching() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const poseInitializedRef = useRef<boolean>(false);
  const canvasEnabledRef = useRef<boolean>(false);
  const angleSmootherRef = useRef<AngleSmoother>(new AngleSmoother(5));
  
  // Video recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [status, setStatus] = useState<CameraStatus>({
    state: "idle",
    message: "Ready to start",
  });
  const [error, setError] = useState<string | null>(null);
  const [canvasEnabled, setCanvasEnabled] = useState<boolean>(false);
  const [biomechanics, setBiomechanics] = useState<BiomechanicsFrame | null>(null);
  const [activity, setActivity] = useState<'fitness' | 'cricket'>('fitness');
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const ruleEngineRef = useRef<RuleEngine>(new RuleEngine());
  
  // Session management
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionAggregatorRef = useRef<SessionAggregator>(new SessionAggregator());
  
  // Activity detection
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

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);

  // Session save states
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isUploadingToR2, setIsUploadingToR2] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedSessionId, setLastSavedSessionId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Get authenticated user
  const { user } = useAuth();

  // Load rules + activity detector when activity changes
  useEffect(() => {
    const rules = activity === 'fitness' ? FITNESS_RULES : CRICKET_BOWLING_RULES;
    ruleEngineRef.current.clearRules();
    ruleEngineRef.current.addRules(rules);
    activityDetectorRef.current.setActivity(activity);
    console.log(`✅ Loaded ${rules.length} ${activity} rules`);
  }, [activity]);

  // Update session duration every second when session is active
  useEffect(() => {
    if (!isSessionActive) {
      return;
    }

    const interval = setInterval(() => {
      const duration = sessionAggregatorRef.current.getCurrentDuration();
      setSessionDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive]);

  useEffect(() => {
    canvasEnabledRef.current = canvasEnabled;
    if (canvasRef.current) {
      canvasRef.current.style.display = canvasEnabled ? "block" : "none";
    }
  }, [canvasEnabled]);

  // Start camera on button click
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus({ state: "unsupported", message: "Camera not supported" });
      setError("getUserMedia is not supported in your browser. Use Chrome, Firefox, Safari, or Edge.");
      return;
    }

    setStatus({ state: "requesting", message: "Requesting camera access..." });
    setError(null);

    try {
      console.log('STEP 1️⃣ getUserMedia request starting');
      const constraints = {
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('STEP 2️⃣ MediaStream received', stream);

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log('🎥 videoTracks:', videoTracks);
      console.log('🎧 audioTracks:', audioTracks);
      if (!videoTracks.length) {
        console.error('❌ No video tracks found in stream');
        setStatus({ state: "blocked", message: "No video track" });
        setError("Camera stream has no video track. Check your webcam and permissions.");
        return;
      }
      videoTracks.forEach((track, idx) => {
        const settings = track.getSettings();
        console.log(`🎬 Video track #${idx}`, settings);
      });

      streamRef.current = stream;
      console.log('STEP 3️⃣ streamRef stored. active:', stream.active, 'tracks:', stream.getTracks().length);

      if (videoRef.current) {
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        console.log('STEP 4️⃣ srcObject assigned', {
          hasVideoElement: !!videoEl,
          inDOM: document.contains(videoEl),
          streamActive: stream.active,
          trackCount: stream.getTracks().length,
        });

        // Wait for video to be ready before initializing pose
        videoEl.onloadedmetadata = async () => {
          const video = videoRef.current;
          if (!video) {
            console.error('❌ videoRef missing inside onloadedmetadata');
            return;
          }
          
          console.log('STEP 5️⃣ onloadedmetadata fired');
          console.log(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
          console.log(`📐 Video client size: ${video.clientWidth}x${video.clientHeight}`);

          // Log computed styles to ensure visibility
          const computed = window.getComputedStyle(video);
          console.log('🧾 Computed video style:', {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position,
            zIndex: computed.zIndex,
            width: computed.width,
            height: computed.height,
            objectFit: computed.objectFit,
          });

          // Sync canvas with video dimensions (fallback to 640x480 if 0)
          const targetWidth = video.videoWidth || video.clientWidth || 640;
          const targetHeight = video.videoHeight || video.clientHeight || 480;
          if (canvasRef.current) {
            canvasRef.current.width = targetWidth;
            canvasRef.current.height = targetHeight;
            console.log(`✅ Canvas synced to: ${canvasRef.current.width}x${canvasRef.current.height}`);
          }

          try {
            await video.play();
            console.log('STEP 6️⃣ video.play() resolved - video should now render');
            console.log('🟢 Verification:', {
              readyState: video.readyState,
              currentTime: video.currentTime,
              paused: video.paused,
            });
            
            // Initialize pose after video is ready
            if (videoRef.current && !poseInitializedRef.current) {
              console.log('STEP 7️⃣ Initializing MediaPipe Pose...');
              let detectionCount = 0;
              await initializePose(videoRef.current, async (results: PoseLandmarks) => {
                detectionCount++;
                const video = videoRef.current;

                // ── 0. Run detection pipeline (COCO-SSD + confidence + smoothing + tracking + stability) ──
                let pipelineResult;
                if (pipelineRef.current.ready && video) {
                  pipelineResult = pipelineRef.current.processSync(results);
                  setPipelineStatus(pipelineResult.status);
                  setPipelineMessage(pipelineResult.message);
                  setPersonCount(pipelineResult.personCount);

                  // Run COCO-SSD async every few frames (lightweight — doesn't block)
                  if (detectionCount % 3 === 0 && video) {
                    pipelineRef.current.process(video, results).then(asyncResult => {
                      setPipelineStatus(asyncResult.status);
                      setPipelineMessage(asyncResult.message);
                      setPersonCount(asyncResult.personCount);
                    }).catch(() => {});
                  }
                } else {
                  // Pipeline not ready yet — use raw results with basic checks
                  pipelineResult = null;
                }

                // Use pipeline-smoothed landmarks if available, otherwise raw
                const effectiveResults: PoseLandmarks = pipelineResult?.poseLandmarks ?? results;
                const shouldProceed = pipelineResult ? pipelineResult.shouldScore : true;
                const shouldDraw = pipelineResult ? pipelineResult.shouldDrawSkeleton : true;

                // ── 1. Biomechanics calculation ──────────────────────────
                const rawFrame = calculateBiomechanics(effectiveResults, 0.3);
                const smoothedFrame = angleSmootherRef.current.smoothFrame(rawFrame);
                setBiomechanics(smoothedFrame);

                // ── 2. Rule engine ───────────────────────────────────────
                const currentViolations = ruleEngineRef.current.evaluate(smoothedFrame);
                setViolations(currentViolations);

                // ── 3. Activity detection ────────────────────────────────
                const actResult = activityDetectorRef.current.evaluate(
                  smoothedFrame,
                  effectiveResults.landmarks ?? null,
                  currentViolations
                );

                // Override activity detection with pipeline status
                if (pipelineResult && pipelineResult.status !== 'ready') {
                  // Pipeline says not ready — override activity detection
                  setDetectionStatus(pipelineResult.status === 'no_human' ? 'no_human' : 'idle');
                  setDetectionMessage(pipelineResult.message);
                  setDetectionSeverity(pipelineResult.severity);
                } else {
                  setDetectionStatus(actResult.status);
                  setDetectionMessage(actResult.message);
                  setDetectionSeverity(actResult.severity);
                }

                // ── 4. Session aggregation ───────────────────────────────
                if (sessionAggregatorRef.current.isActive() && shouldProceed) {
                  // Only add biomechanics frames when human is present and pipeline ready
                  if (actResult.status !== 'no_human') {
                    sessionAggregatorRef.current.addFrame(smoothedFrame);
                  }
                  // Always log violations (they fire only when performing)
                  if (currentViolations.length > 0) {
                    sessionAggregatorRef.current.addViolations(currentViolations);
                  }
                  // Record frame quality for score calculation
                  sessionAggregatorRef.current.addFrameQuality(
                    actResult.status,
                    actResult.frameQualityScore
                  );
                  // Update live score every frame
                  setLiveScore(sessionAggregatorRef.current.getLiveScore());
                }

                // ── 5. Canvas skeleton drawing ───────────────────────────
                if (!canvasEnabledRef.current) return;

                // Always clear canvas first — ensures no stale skeleton lingers
                if (canvasRef.current) {
                  const ctx2d = canvasRef.current.getContext('2d');
                  ctx2d?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }

                // Only draw skeleton when pipeline says it's OK AND real human detected
                if (
                  canvasRef.current &&
                  effectiveResults?.landmarks &&
                  effectiveResults.landmarks.length > 0 &&
                  shouldDraw &&
                  actResult.status !== 'no_human'
                ) {
                  drawSkeleton(canvasRef.current, effectiveResults, {
                    jointRadius: 5,
                    lineWidth: 2,
                    jointColor: '#07cff6',
                    lineColor: '#194162',
                    visibilityThreshold: 0.5,
                  });
                }
              });
              poseInitializedRef.current = true;
              console.log('STEP 8️⃣ Pose initialized, starting detection loop');

              // Initialize COCO-SSD detection pipeline
              console.log('STEP 9️⃣ Initializing COCO-SSD detection pipeline...');
              try {
                await pipelineRef.current.initialize();
                setPipelineReady(true);
                setPipelineStatus('ready');
                setPipelineMessage('');
                console.log('✅ Detection pipeline ready (COCO-SSD + confidence + tracking + stability)');
              } catch (pipelineErr) {
                console.warn('⚠️ COCO-SSD pipeline failed to load — falling back to pose-only detection:', pipelineErr);
                // Continue without pipeline — the system still works with ActivityDetector
                setPipelineMessage('Person detection unavailable — using pose-only mode.');
              }

              startPoseLoop();
              console.log('✅ Final verification: permission granted, video track detected, srcObject set, metadata loaded, video.play succeeded. Video should be visible.');
            }
          } catch (err) {
            console.error('❌ video.play() error or pose init error:', err);
            setError('Failed to initialize pose detection');
          }
        };
      } else {
        console.error('❌ videoRef missing when trying to assign srcObject');
      }

      setStatus({ state: "active", message: "Camera active" });
    } catch (err) {
      const errorMsg = (err as Error).message;
      let friendlyMessage = "Camera access denied";

      if (errorMsg.includes("NotAllowedError")) {
        friendlyMessage = "Camera permission denied. Allow camera access in browser settings.";
      } else if (errorMsg.includes("NotFoundError")) {
        friendlyMessage = "No camera found. Check your device has a working webcam.";
      } else if (errorMsg.includes("NotReadableError")) {
        friendlyMessage = "Camera is in use by another application. Close it and try again.";
      }

      setStatus({ state: "blocked", message: "Camera blocked" });
      setError(friendlyMessage);
      console.error("Camera error:", errorMsg);
    }
  };

  // Stop camera cleanly
  const stopCamera = () => {
    // Stop session if active (wrapped in async IIFE to handle properly)
    if (sessionAggregatorRef.current.isActive()) {
      // Don't await - let it run in background
      stopSession().catch(err => {
        console.error('Error stopping session:', err);
      });
    }

    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }

    // Reset biomechanics
    angleSmootherRef.current.reset();
    setBiomechanics(null);

    // Reset rule engine
    ruleEngineRef.current.reset();
    setViolations([]);

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setStatus({ state: "stopped", message: "Camera stopped" });
    setError(null);

    // Close pose estimation
    if (poseInitializedRef.current) {
      closePose();
      poseInitializedRef.current = false;
    }

    // Reset detection pipeline
    pipelineRef.current.reset();
    setPipelineStatus('initializing');
    setPipelineReady(false);
  };

  // Start video recording
  const startVideoRecording = () => {
    if (!streamRef.current) {
      console.warn('[VideoRecording] No stream available');
      return;
    }
    try {
      recordedChunksRef.current = [];

      // Ordered preference list — picks first supported MIME type
      const mimeTypeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=h264',
        'video/mp4',
      ];
      const mimeType = mimeTypeCandidates.find(m => MediaRecorder.isTypeSupported(m)) ?? '';
      console.log(`[VideoRecording] MIME: "${mimeType || 'browser default'}"`);

      const options: MediaRecorderOptions = { videoBitsPerSecond: 2_000_000 };
      if (mimeType) options.mimeType = mimeType;

      const mediaRecorder = new MediaRecorder(streamRef.current, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstart = () => { console.log('[VideoRecording] Started'); setIsRecording(true); };
      mediaRecorder.onerror = (event) => { console.error('[VideoRecording] Error:', event); setIsRecording(false); };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500); // chunk every 500ms so short sessions have data
    } catch (error) {
      console.error('[VideoRecording] Failed to start:', error);
    }
  };

  // Stop video recording and return blob
  const stopVideoRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        console.warn('[VideoRecording] No active recording');
        resolve(null);
        return;
      }

      // Flush any data buffered since last timeslice tick
      if (mediaRecorder.state === 'recording') {
        try { mediaRecorder.requestData(); } catch (_) { /* ignore */ }
      }

      // Use addEventListener (not onstop) to avoid overwrite races
      mediaRecorder.addEventListener('stop', () => {
        const chunks = recordedChunksRef.current;
        console.log(`[VideoRecording] Stopped — chunks: ${chunks.length}`);
        if (chunks.length === 0) {
          console.warn('[VideoRecording] No data recorded');
          setIsRecording(false);
          resolve(null);
          return;
        }
        const blobMime = mediaRecorder.mimeType || 'video/webm';
        const videoBlob = new Blob(chunks, { type: blobMime });
        console.log(`[VideoRecording] Blob: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB — ${blobMime}`);
        setIsRecording(false);
        resolve(videoBlob);
      }, { once: true });

      mediaRecorder.stop();
    });
  };

  // Start a training session
  const startSession = () => {
    if (status.state !== 'active') {
      console.warn('[LiveCoaching] Cannot start session: Camera not active');
      return;
    }

    sessionAggregatorRef.current.startSession(activity);
    activityDetectorRef.current.reset();
    setIsSessionActive(true);
    setSessionDuration(0);
    setLiveScore(null);
    console.log(`🟢 Session started: ${activity}`);
    startVideoRecording();
  };

  // Stop a training session
  const stopSession = async () => {
    if (!sessionAggregatorRef.current.isActive()) {
      console.warn('[LiveCoaching] Cannot stop session: No active session');
      return;
    }

    // Update UI state immediately (before async operations)
    setIsSessionActive(false);
    setSessionDuration(0);

    // Stop video recording
    const videoBlob = await stopVideoRecording();

    const completedSession = sessionAggregatorRef.current.stopSession();
    if (completedSession) {
      console.log(`🔴 Session stopped: ${completedSession.sessionId}`);
      console.log(`   Duration: ${completedSession.duration.toFixed(1)}s`);
      console.log(`   Frames: ${completedSession.metrics.biomechanics.totalFrames}`);
      console.log(`   Violations: ${completedSession.metrics.totalViolations}`);
      console.log(`   Score: ${completedSession.metrics.performanceScore}`);
      if (videoBlob) {
        console.log(`   Video: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
      }

      // Set saving state
      setIsSavingSession(true);
      setSaveError(null);
      setLastSavedSessionId(null);
      setUploadProgress('Saving session to Firestore...');

      // Send to Firestore with authenticated user
      try {
        const uid = user?.uid || null;
        
        if (!uid) {
          console.warn('⚠️ User not authenticated - session will be saved locally only');
        }

        // Step 1: Save session to Firestore
        const result = await sendSession(completedSession, uid);
        
        if (!result.success) {
          console.error(`❌ ${result.error || result.message}`);
          setSaveError(result.error || result.message);
          setIsSavingSession(false);
          return;
        }

        console.log(`✅ ${result.message}`);
        
        // Step 2: Upload session data and video to R2 (if authenticated and synced to Firestore)
        if (uid && result.synced) {
          try {
            setIsUploadingToR2(true);
            setUploadProgress('Uploading session data to R2...');

            // Create session summary JSON for R2 upload
            const sessionData = {
              sessionId: completedSession.sessionId,
              activityType: completedSession.activityType,
              startTime: completedSession.startTime,
              endTime: completedSession.endTime,
              duration: completedSession.duration,
              metrics: completedSession.metrics,
              timestamp: new Date().toISOString(),
            };

            // Upload session data JSON
            const sessionDataUrl = await uploadKeypointsToR2(
              completedSession.sessionId,
              [sessionData] // Wrap in array for consistency with future keypoints array
            );

            console.log(`✅ Uploaded session data to R2: ${sessionDataUrl}`);

            // Upload video if available
            let videoUrl: string | undefined;
            if (videoBlob) {
              setUploadProgress('Uploading video to R2...');
              videoUrl = await uploadVideoToR2(
                completedSession.sessionId,
                videoBlob,
                'session.webm'
              );
              console.log(`✅ Uploaded video to R2: ${videoUrl}`);
            }

            // Step 3: Update Firestore session doc with R2 URLs
            setUploadProgress('Updating session with R2 URLs...');
            const r2Objects: Record<string, string> = {
              sessionDataUrl,
            };
            if (videoUrl) {
              r2Objects.videoUrl = videoUrl;
            }
            await updateSessionR2Objects(uid, completedSession.sessionId, r2Objects);

            console.log(`✅ Session document updated with R2 URLs`);
            setUploadProgress('Upload complete!');
          } catch (uploadError) {
            console.error('❌ R2 upload failed:', uploadError);
            // Don't fail the whole operation - session is already saved
            console.warn('⚠️ Session saved but R2 upload failed');
          } finally {
            setIsUploadingToR2(false);
          }
        }

        // Success!
        setLastSavedSessionId(completedSession.sessionId);
        
        if (result.synced) {
          console.log(`   ✅ Synced to Firestore`);
        } else {
          console.warn(`   ⚠️ Saved locally (pending Firestore sync)`);
        }
      } catch (error) {
        console.error('❌ Error sending session:', error);
        setSaveError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsSavingSession(false);
        setUploadProgress('');
      }
    }
  };

  // Run pose detection loop with requestAnimationFrame
  const startPoseLoop = () => {
    let frameCount = 0;
    const poseLoop = async () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) {
        animationFrameRef.current = requestAnimationFrame(poseLoop);
        return;
      }

      // Sync canvas size with video
      const w = video.videoWidth || video.clientWidth;
      const h = video.videoHeight || video.clientHeight;
      
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (frameCount % 60 === 0) {
          console.log(`📐 Canvas resized to: ${w}x${h}`);
        }
      }

      // Clear canvas before drawing new frame
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Detect pose - results are passed to onResults callback from initializePose
      await detectPose(video).catch((err) => {
        if (frameCount % 60 === 0) {
          console.error('Pose detection error:', err);
        }
      });

      frameCount++;
      animationFrameRef.current = requestAnimationFrame(poseLoop);
    };

    animationFrameRef.current = requestAnimationFrame(poseLoop);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (poseInitializedRef.current) {
        closePose();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Dispose detection pipeline
      pipelineRef.current.dispose();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0c10", color: "#e5faff", padding: "16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px" }}>Live Coaching – Phase 5 (Session Management)</h1>
      <p style={{ fontSize: "14px", marginBottom: "12px", color: "#b9d7ff" }}>
        Real-time biomechanics + rule-based feedback + session tracking & persistence
      </p>

      {/* Activity Selector */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#7dd3fc" }}>Activity:</span>
        <button 
          onClick={() => setActivity('fitness')}
          style={{ 
            padding: "6px 12px", 
            background: activity === 'fitness' ? "#0ad4ff" : "#1e3a4c", 
            color: activity === 'fitness' ? "#001018" : "#7dd3fc",
            border: "none", 
            borderRadius: "6px", 
            fontWeight: 700, 
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Fitness (Squat)
        </button>
        <button 
          onClick={() => setActivity('cricket')}
          style={{ 
            padding: "6px 12px", 
            background: activity === 'cricket' ? "#0ad4ff" : "#1e3a4c", 
            color: activity === 'cricket' ? "#001018" : "#7dd3fc",
            border: "none", 
            borderRadius: "6px", 
            fontWeight: 700, 
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Cricket (Bowling)
        </button>
      </div>

      <div
        style={{
          position: "relative",
          width: "640px",
          height: "480px",
          margin: "0 auto 16px auto",
          backgroundColor: "#000",
          border: "2px solid #0ad4ff",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backgroundColor: "#000",
            zIndex: 1,
            display: "block",
            opacity: 1,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            pointerEvents: "none",
            backgroundColor: "transparent",
          }}
        />

        {/* ── Detection Status Overlay ─────────────────────────────── */}
        {status.state === 'active' && (pipelineStatus !== 'ready' || detectionStatus !== 'performing') && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            padding: "10px 14px",
            background: (pipelineStatus === 'no_human' || detectionStatus === 'no_human')
              ? "rgba(239,68,68,0.82)"
              : (pipelineStatus === 'too_far' || pipelineStatus === 'too_close')
                ? "rgba(234,179,8,0.82)"
                : (pipelineStatus === 'low_confidence' || pipelineStatus === 'stabilizing')
                  ? "rgba(59,130,246,0.82)"
                  : detectionSeverity === 'warning'
                    ? "rgba(234,179,8,0.82)"
                    : "rgba(14,165,233,0.82)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <span style={{ fontSize: "18px" }}>
              {(pipelineStatus === 'no_human' || detectionStatus === 'no_human') ? '🚫'
                : (pipelineStatus === 'too_far') ? '🔭'
                : (pipelineStatus === 'too_close') ? '🖐️'
                : (pipelineStatus === 'low_confidence') ? '👁️'
                : (pipelineStatus === 'stabilizing') ? '⏳'
                : '⏸️'}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>
              {(pipelineStatus !== 'ready' && pipelineMessage)
                ? pipelineMessage
                : detectionMessage || (detectionStatus === 'no_human'
                  ? 'No athlete detected — step into frame.'
                  : `Begin your ${activity === 'fitness' ? 'squat' : 'bowling action'} to start scoring.`
                )}
            </span>
            {personCount > 1 && (
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginLeft: "auto" }}>
                👥 {personCount} people — tracking primary
              </span>
            )}
          </div>
        )}

        {/* ── Live Score Badge (shows while session is active) ───────── */}
        {isSessionActive && liveScore !== null && detectionStatus === 'performing' && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 12,
            zIndex: 10,
            padding: "6px 14px",
            borderRadius: "20px",
            background: liveScore >= 80
              ? "rgba(16,185,129,0.90)"
              : liveScore >= 50
                ? "rgba(234,179,8,0.90)"
                : "rgba(239,68,68,0.90)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff", opacity: 0.85, lineHeight: 1 }}>SCORE</span>
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>{liveScore}</span>
          </div>
        )}

        {/* ── Recording indicator ────────────────────────────────────── */}
        {isRecording && (
          <div style={{
            position: "absolute",
            top: 10,
            left: 12,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "rgba(239,68,68,0.85)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#fff",
              animation: "pulse 1s infinite",
            }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff" }}>REC</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px", flexWrap: "wrap" }}>
        <button onClick={startCamera} style={{ padding: "8px 12px", background: "#0ad4ff", color: "#001018", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
          Start Camera
        </button>
        <button onClick={stopCamera} style={{ padding: "8px 12px", background: "#ff4d4f", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
          Stop Camera
        </button>
        <button onClick={() => setCanvasEnabled((prev) => !prev)} style={{ padding: "8px 12px", background: canvasEnabled ? "#1130ff" : "#444b5a", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 700, cursor: "pointer" }}>
          {canvasEnabled ? "Disable Canvas Overlay" : "Enable Canvas Overlay"}
        </button>
        
        {/* Session Controls */}
        {status.state === 'active' && !isSessionActive && (
          <button 
            onClick={startSession} 
            style={{ 
              padding: "8px 12px", 
              background: "#10b981", 
              color: "#fff", 
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer" 
            }}
          >
            🟢 Start Session
          </button>
        )}
        
        {isSessionActive && (
          <button 
            onClick={stopSession} 
            style={{ 
              padding: "8px 12px", 
              background: "#ef4444", 
              color: "#fff", 
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer" 
            }}
          >
            🔴 Stop Session
          </button>
        )}
      </div>

      {/* Session Status Display */}
      {isSessionActive && (
        <div style={{ 
          maxWidth: "640px", 
          margin: "0 auto 16px auto", 
          padding: "12px 16px", 
          background: "linear-gradient(90deg, #10b98120, #0ad4ff20)", 
          border: "1px solid #10b981", 
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#10b981" }}>⏱️ SESSION ACTIVE</span>
            <span style={{ fontSize: "13px", color: "#b9d7ff", marginLeft: "12px" }}>
              {Math.floor(sessionDuration / 60)}m {Math.floor(sessionDuration % 60)}s
            </span>
          </div>

          {/* Live score */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {liveScore !== null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#7dd3fc", fontWeight: 600 }}>LIVE SCORE</div>
                <div style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: liveScore >= 80 ? "#10b981" : liveScore >= 50 ? "#eab308" : "#ef4444",
                }}>
                  {liveScore}
                  <span style={{ fontSize: "11px", fontWeight: 400, color: "#7dd3fc" }}>/100</span>
                </div>
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#b9d7ff", textAlign: "right" }}>
              <div>Frames: {sessionAggregatorRef.current.getFrameCount()}</div>
              <div>Violations: {sessionAggregatorRef.current.getViolationCount()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Session Save Status Display */}
      {(isSavingSession || isUploadingToR2) && (
        <div style={{ 
          maxWidth: "640px", 
          margin: "0 auto 16px auto", 
          padding: "12px", 
          background: "linear-gradient(90deg, #3b82f620, #0ad4ff20)", 
          border: "1px solid #3b82f6", 
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <div 
            className="spinner"
            style={{ 
              width: "16px", 
              height: "16px", 
              border: "2px solid #3b82f6", 
              borderTopColor: "transparent",
              borderRadius: "50%"
            }} 
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#3b82f6" }}>
              {isUploadingToR2 ? '☁️ Uploading to Cloud Storage...' : `💾 Saving session to ${user ? 'Firestore' : 'local storage'}...`}
            </span>
            {uploadProgress && (
              <span style={{ fontSize: "12px", color: "#7dd3fc" }}>
                {uploadProgress}
              </span>
            )}
          </div>
        </div>
      )}

      {lastSavedSessionId && !isSavingSession && !isUploadingToR2 && (
        <div style={{ 
          maxWidth: "640px", 
          margin: "0 auto 16px auto", 
          padding: "12px", 
          background: "linear-gradient(90deg, #10b98120, #0ad4ff20)", 
          border: "1px solid #10b981", 
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#10b981" }}>✅ Session Saved!</span>
            <span style={{ fontSize: "12px", color: "#b9d7ff", marginLeft: "8px", display: "block" }}>
              {user ? '☁️ Synced to Firestore + R2 Cloud Storage' : 'Saved locally'}
            </span>
          </div>
          <button
            onClick={() => setLastSavedSessionId(null)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              background: "transparent",
              color: "#10b981",
              border: "1px solid #10b981",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {saveError && !isSavingSession && !isUploadingToR2 && (
        <div style={{ 
          maxWidth: "640px", 
          margin: "0 auto 16px auto", 
          padding: "12px", 
          background: "linear-gradient(90deg, #ef444420, #ff4d4f20)", 
          border: "1px solid #ef4444", 
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444" }}>❌ Save Failed</span>
            <span style={{ fontSize: "12px", color: "#ffb3b8", marginLeft: "8px", display: "block" }}>
              {saveError}
            </span>
          </div>
          <button
            onClick={() => setSaveError(null)}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              background: "transparent",
              color: "#ef4444",
              border: "1px solid #ef4444",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={{ maxWidth: "640px", margin: "0 auto", fontSize: "13px", lineHeight: 1.5 }}>
        <div style={{ marginBottom: "8px" }}>
          <strong>Status:</strong> {status.state} – {status.message}
        </div>
        {error && (
          <div style={{ marginBottom: "8px", color: "#ffb3b8" }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        <div style={{ marginBottom: "4px" }}>Stream: {streamRef.current ? "✅ Active" : "❌ Inactive"}</div>
        <div style={{ marginBottom: "4px" }}>Video Ref: {videoRef.current ? "✅ Set" : "❌ Null"}</div>
        <div style={{ marginBottom: "4px" }}>Canvas Ref: {canvasRef.current ? "✅ Set" : "❌ Null"}</div>
        <div style={{ marginBottom: "4px" }}>Pose Init: {poseInitializedRef.current ? "✅ Yes" : "❌ No"}</div>
        <div style={{ marginTop: "8px", color: "#9fb6d1" }}>
          Inspect DevTools console for lifecycle steps: getUserMedia → tracks → srcObject → onloadedmetadata → video.play → pose init.
        </div>
      </div>

      {/* Feedback Panel - Shows active coaching cues */}
      <div style={{ maxWidth: "640px", margin: "20px auto 20px auto" }}>
        <FeedbackPanel 
          violations={violations} 
          onClear={() => setViolations([])}
        />
      </div>

      {/* Biomechanics Metrics Panel */}
      <div style={{ maxWidth: "640px", margin: "20px auto", backgroundColor: "#0f1419", border: "1px solid #1e3a4c", borderRadius: "8px", padding: "16px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px", color: "#0ad4ff" }}>📊 Real-Time Biomechanics</h2>
        
        {biomechanics === null ? (
          <p style={{ color: "#6b7280", fontSize: "13px" }}>Waiting for pose data...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Knee Angles */}
            <div style={{ backgroundColor: "#0b0c10", padding: "12px", borderRadius: "6px", border: "1px solid #1a2332" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#7dd3fc", marginBottom: "8px" }}>🦵 Knee Angles</p>
              <div style={{ fontSize: "13px", color: "#e5faff", marginBottom: "4px" }}>
                Left: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.leftKneeAngle !== null ? Math.round(biomechanics.leftKneeAngle) + "°" : "—"}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#e5faff" }}>
                Right: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.rightKneeAngle !== null ? Math.round(biomechanics.rightKneeAngle) + "°" : "—"}</span>
              </div>
            </div>

            {/* Hip Angles */}
            <div style={{ backgroundColor: "#0b0c10", padding: "12px", borderRadius: "6px", border: "1px solid #1a2332" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#7dd3fc", marginBottom: "8px" }}>🪵 Hip Angles</p>
              <div style={{ fontSize: "13px", color: "#e5faff", marginBottom: "4px" }}>
                Left: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.leftHipAngle !== null ? Math.round(biomechanics.leftHipAngle) + "°" : "—"}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#e5faff" }}>
                Right: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.rightHipAngle !== null ? Math.round(biomechanics.rightHipAngle) + "°" : "—"}</span>
              </div>
            </div>

            {/* Elbow Angles */}
            <div style={{ backgroundColor: "#0b0c10", padding: "12px", borderRadius: "6px", border: "1px solid #1a2332" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#7dd3fc", marginBottom: "8px" }}>💪 Elbow Angles</p>
              <div style={{ fontSize: "13px", color: "#e5faff", marginBottom: "4px" }}>
                Left: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.leftElbowAngle !== null ? Math.round(biomechanics.leftElbowAngle) + "°" : "—"}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#e5faff" }}>
                Right: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.rightElbowAngle !== null ? Math.round(biomechanics.rightElbowAngle) + "°" : "—"}</span>
              </div>
            </div>

            {/* Shoulder Angles */}
            <div style={{ backgroundColor: "#0b0c10", padding: "12px", borderRadius: "6px", border: "1px solid #1a2332" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#7dd3fc", marginBottom: "8px" }}>💎 Shoulder Angles</p>
              <div style={{ fontSize: "13px", color: "#e5faff", marginBottom: "4px" }}>
                Left: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.leftShoulderAngle !== null ? Math.round(biomechanics.leftShoulderAngle) + "°" : "—"}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#e5faff" }}>
                Right: <span style={{ fontWeight: 700, color: "#0ad4ff" }}>{biomechanics.rightShoulderAngle !== null ? Math.round(biomechanics.rightShoulderAngle) + "°" : "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
