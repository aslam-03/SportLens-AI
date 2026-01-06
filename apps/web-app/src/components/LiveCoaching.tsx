import { useEffect, useRef, useState } from "react";

interface CameraStatus {
  state: "idle" | "requesting" | "active" | "blocked" | "unsupported" | "stopped";
  message: string;
}

export default function LiveCoaching() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>({
    state: "idle",
    message: "Ready to start",
  });
  const [error, setError] = useState<string | null>(null);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.warn("Auto-play failed:", err);
          });
        };
      }

      setStatus({ state: "active", message: "Camera active" });
      startOverlayAnimation();
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
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
    }

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
  };

  // Draw overlay on canvas
  const startOverlayAnimation = () => {
    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dashed center guide box (placeholder for future pose detection)
      ctx.strokeStyle = "rgba(7, 207, 246, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(
        canvas.width * 0.15,
        canvas.height * 0.15,
        canvas.width * 0.7,
        canvas.height * 0.7
      );
      ctx.setLineDash([]);

      // Center indicator dot
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(7, 207, 246, 0.6)";
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(drawOverlay);
    };

    animationFrameRef.current = requestAnimationFrame(drawOverlay);
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
    };
  }, []);

  const getStatusColor = () => {
    switch (status.state) {
      case "active":
        return "bg-emerald-500";
      case "blocked":
      case "unsupported":
        return "bg-red-500";
      case "requesting":
        return "bg-amber-500";
      default:
        return "bg-slate-500";
    }
  };

  // Show idle state with start button
  if (status.state === "idle" || status.state === "stopped") {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Live Coaching</h1>
          <p className="text-slate-300 mb-8">Click below to start your webcam session</p>
          <button
            onClick={startCamera}
            className="px-8 py-3 bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
          >
            Start Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      {/* Main camera view */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        {error ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-lg bg-red-500/10 p-8 text-center max-w-md">
              <p className="text-sm font-medium text-red-200">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setStatus({ state: "idle", message: "Ready to start" });
                }}
                className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : status.state === "requesting" ? (
          <div className="text-center">
            <div className="mb-4 h-16 w-16 border-4 border-slate-600 border-t-cyan-500 rounded-full animate-spin mx-auto" />
            <p className="text-slate-300 text-sm">{status.message}</p>
          </div>
        ) : (
          <div className="relative h-full w-full overflow-hidden">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
            />

            {/* Status badge - top left */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur">
              <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="text-xs font-medium text-white">{status.message}</span>
            </div>

            {/* Session timer - top right */}
            <div className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-2 backdrop-blur text-xs text-slate-200">
              Session Active
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar - Feedback panel */}
      <div className="absolute right-0 top-0 h-full w-80 border-l border-slate-700 bg-slate-900/80 backdrop-blur">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-700 px-4 py-4">
            <h2 className="text-sm font-semibold text-white">Feedback</h2>
            <p className="mt-1 text-xs text-slate-400">Real-time coaching cues</p>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs font-medium text-slate-300">Posture</p>
                <p className="mt-1 text-xs text-slate-400">Analyzing...</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs font-medium text-slate-300">Form Score</p>
                <p className="mt-1 text-xs text-slate-400">--</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs font-medium text-slate-300">Next Cue</p>
                <p className="mt-1 text-xs text-slate-400">Waiting...</p>
              </div>
            </div>
          </div>

          {/* Footer - Stop button */}
          <div className="border-t border-slate-700 px-4 py-3">
            <button
              onClick={stopCamera}
              className="w-full rounded-lg bg-red-600 hover:bg-red-700 py-2 text-xs font-medium text-white transition-colors"
            >
              Stop Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
