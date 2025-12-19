import { Zap, Cricket, Tool, Award, Clock, AlertCircle, TrendingDown, User, BowlingAction, BattingStance, Squat, Pushup, Feedback, Webcam, Pose, Biomechanics, ErrorDetection } from "./icons";

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
  { icon: Webcam, title: "Enable Camera", text: "Start a session in seconds." },
  { icon: Pose, title: "Pose detection", text: "Keypoints tracked live." },
  { icon: Biomechanics, title: "Biomechanics", text: "Angles & phases measured." },
  { icon: ErrorDetection, title: "Error detection", text: "Sport-specific rules." },
  { icon: Feedback, title: "Instant feedback", text: "Overlays and cues." },
];

export const features = [
  {
    title: "Real-time coaching",
    description: "Get clear cues while you move—fix form before mistakes repeat.",
  },
  {
    title: "Biomechanics insights",
    description: "Understand alignment, angles, and timing with simple on-screen guidance.",
  },
  {
    title: "Cricket-specific intelligence",
    description: "Coaching cues tuned for batting and bowling technique—not generic analysis.",
  },
  {
    title: "Fitness form correction",
    description: "Learn fundamentals safely with posture checks for core movements.",
  },
  {
    title: "Session tracking",
    description: "Review sessions and spot improvement trends over time.",
  },
  {
    title: "No hardware required",
    description: "Just your webcam and browser—no sensors, wearables, or setup hassle.",
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
