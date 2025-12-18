import { Zap, Cricket, Tool, Award, Clock, AlertCircle, TrendingDown, Target, Dumbbell, Sparkles, Camera, User, Angles, BowlingAction, BattingStance, Squat, Pushup, Feedback, Webcam, Pose, Biomechanics, ErrorDetection, Arrow } from "./icons";

export const heroMock = {
  header: "Live coaching view",
  sub: "1080p • 30fps • Overlay on",
};

export const trustSignals = [
  { icon: Zap, text: "AI-powered" },
  { icon: Cricket, text: "Cricket + Fitness" },
  { icon: Tool, text: "No hardware required" },
  { icon: Award, text: "Built as a capstone innovation" },
];

export const problems = [
  { icon: Clock, title: "No real-time coaching", text: "You train blind without instant guidance." },
  { icon: AlertCircle, title: "Wrong posture & injury risk", text: "Small errors stack into strains and slow progress." },
  { icon: TrendingDown, title: "Coaches are expensive", text: "Qualified 1:1 time is scarce and costly." },
  { icon: User, title: "No improvement loop", text: "Hard to see trends or prove you're getting better." },
];

export const solutionFlow = [
  { icon: Webcam, title: "Webcam on", text: "One click to start." },
  { icon: Pose, title: "Pose detection", text: "Keypoints tracked live." },
  { icon: Biomechanics, title: "Biomechanics", text: "Angles & phases measured." },
  { icon: ErrorDetection, title: "Error detection", text: "Sport-specific rules." },
  { icon: Feedback, title: "Instant feedback", text: "Overlays and cues." },
];

export const features = [
  {
    title: "Real-time posture correction",
    description: "See what to fix mid-rep so you ingrain good habits quickly.",
  },
  {
    title: "Joint angle & biomechanics insight",
    description: "Understand alignment, ranges, and timing—no guesswork.",
  },
  {
    title: "Cricket + fitness coaching",
    description: "Tailored cues for batting, bowling, and foundational strength work.",
  },
  {
    title: "Instant AI feedback",
    description: "On-screen overlays guide every rep while you move.",
  },
  {
    title: "Session tracking & analytics",
    description: "Keep history, trends, and highlights to prove progress.",
  },
  {
    title: "No extra hardware",
    description: "Just your camera and browser. Zero sensors or wearables.",
  },
];

export const cricketUseCases = [
  { icon: BowlingAction, title: "Bowling action analysis", text: "Stride, release, and alignment for cleaner pace and spin." },
  { icon: BattingStance, title: "Batting stance correction", text: "Head position, shoulder line, and swing path cues." },
];

export const fitnessUseCases = [
  { icon: Squat, title: "Squat & lunge form", text: "Track depth, knee travel, and spine position." },
  { icon: Pushup, title: "Push-up posture", text: "Maintain neutral spine and shoulder stability." },
];

export const previews = [
  { badge: "Live", title: "Live Coaching View", caption: "Camera feed with overlays and cues while you move." },
  { badge: "Tracking", title: "Skeleton & Angle Overlay", caption: "Pose keypoints and lines to visualize alignment." },
  { badge: "Insights", title: "Performance Dashboard", caption: "Session summaries, trends, and highlights." },
];

export const flowVisual = [
  { icon: Webcam, label: "Webcam" },
  { icon: Pose, label: "Pose" },
  { icon: Biomechanics, label: "Biomech" },
  { icon: ErrorDetection, label: "Errors" },
  { icon: Feedback, label: "Feedback" },
];
