import type { Session } from '../types/session';

export interface TrendPoint {
  sessionId: string;
  label: string;
  startTime: number;
  value: number | null;
}

export interface ErrorFrequency {
  ruleId: string;
  count: number;
  percentage: number;
}

export interface SessionTimelineItem {
  sessionId: string;
  startTime: number;
  label: string;
  activityType: Session['activityType'];
  duration: number;
  performanceScore: number;
  totalViolations: number;
  avgKneeAngle: number | null;
  avgHipAngle: number | null;
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalDuration: number;
  averageSessionDuration: number;
  averagePerformanceScore: number;
  averageKneeAngle: number | null;
  averageHipAngle: number | null;
  totalViolations: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  durationTrend: TrendPoint[];
  kneeAngleTrend: TrendPoint[];
  hipAngleTrend: TrendPoint[];
  errorFrequency: ErrorFrequency[];
  timeline: SessionTimelineItem[];
}

function round(value: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function toSessionLabel(session: Session, index: number): string {
  const date = new Date(session.startTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ` #${index + 1}`;
}

export function getSessionAverageKneeAngle(session: Session): number | null {
  const values: number[] = [];
  const { leftKnee, rightKnee } = session.metrics.biomechanics;

  if (leftKnee) {
    values.push(leftKnee.avg);
  }
  if (rightKnee) {
    values.push(rightKnee.avg);
  }

  return average(values);
}

export function getSessionAverageHipAngle(session: Session): number | null {
  const values: number[] = [];
  const { leftHip, rightHip } = session.metrics.biomechanics;

  if (leftHip) {
    values.push(leftHip.avg);
  }
  if (rightHip) {
    values.push(rightHip.avg);
  }

  return average(values);
}

export function buildAnalytics(sessions: Session[]): AnalyticsData {
  const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);
  const totalSessions = sorted.length;

  const timeline: SessionTimelineItem[] = sorted.map((session, index) => {
    const avgKneeAngle = getSessionAverageKneeAngle(session);
    const avgHipAngle = getSessionAverageHipAngle(session);
    return {
      sessionId: session.sessionId,
      startTime: session.startTime,
      label: toSessionLabel(session, index),
      activityType: session.activityType,
      duration: session.duration,
      performanceScore: session.metrics.performanceScore,
      totalViolations: session.metrics.totalViolations,
      avgKneeAngle: avgKneeAngle === null ? null : round(avgKneeAngle),
      avgHipAngle: avgHipAngle === null ? null : round(avgHipAngle),
    };
  });

  const totalDuration = timeline.reduce((acc, item) => acc + item.duration, 0);
  const totalViolations = timeline.reduce((acc, item) => acc + item.totalViolations, 0);
  const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

  const kneeValues = timeline
    .map((item) => item.avgKneeAngle)
    .filter((value): value is number => value !== null);
  const hipValues = timeline
    .map((item) => item.avgHipAngle)
    .filter((value): value is number => value !== null);
  const scoreValues = timeline.map((item) => item.performanceScore);

  const averageKnee = average(kneeValues);
  const averageHip = average(hipValues);
  const averageScore = average(scoreValues) ?? 0;

  const durationTrend: TrendPoint[] = timeline.map((item) => ({
    sessionId: item.sessionId,
    label: item.label,
    startTime: item.startTime,
    value: round(item.duration),
  }));

  const kneeAngleTrend: TrendPoint[] = timeline.map((item) => ({
    sessionId: item.sessionId,
    label: item.label,
    startTime: item.startTime,
    value: item.avgKneeAngle,
  }));

  const hipAngleTrend: TrendPoint[] = timeline.map((item) => ({
    sessionId: item.sessionId,
    label: item.label,
    startTime: item.startTime,
    value: item.avgHipAngle,
  }));

  const ruleCounts = new Map<string, number>();
  for (const session of sorted) {
    for (const [ruleId, count] of Object.entries(session.metrics.violations)) {
      ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + count);
    }
  }

  const errorFrequency: ErrorFrequency[] = [...ruleCounts.entries()]
    .map(([ruleId, count]) => ({
      ruleId,
      count,
      percentage: totalViolations > 0 ? round((count / totalViolations) * 100, 2) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalSessions,
      totalDuration: round(totalDuration),
      averageSessionDuration: round(avgDuration),
      averagePerformanceScore: round(averageScore),
      averageKneeAngle: averageKnee === null ? null : round(averageKnee),
      averageHipAngle: averageHip === null ? null : round(averageHip),
      totalViolations,
    },
    durationTrend,
    kneeAngleTrend,
    hipAngleTrend,
    errorFrequency,
    timeline,
  };
}

