import { useEffect, useRef, useState } from "react";

export default function LiveCoaching() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<string>("Requesting camera...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrame: number | null = null;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("getUserMedia not supported in this browser.");
        setStatus("Unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("Camera active");
        }

        const drawOverlay = () => {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          canvas.width = video.videoWidth || video.clientWidth;
          canvas.height = video.videoHeight || video.clientHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "rgba(14, 165, 233, 0.8)";
          ctx.lineWidth = 3;
          ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.25, canvas.width * 0.5, canvas.height * 0.5);

          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
          ctx.fill();

          ctx.font = "16px Inter, sans-serif";
          ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
          ctx.fillText("Overlay placeholder", 16, 28);

          animationFrame = requestAnimationFrame(drawOverlay);
        };

        animationFrame = requestAnimationFrame(drawOverlay);
      } catch (err) {
        setError((err as Error).message);
        setStatus("Camera blocked");
      }
    };

    start();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-200/80">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status === "Camera active" ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span>{status}</span>
        </div>
        <span className="text-xs text-slate-400">Webcam + Canvas overlay</span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
      {error && <p className="mt-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      <p className="mt-3 text-sm text-slate-300/80">
        This is a placeholder for MediaPipe / MoveNet integration. Overlays show where tracking and cues will render.
      </p>
    </div>
  );
}
