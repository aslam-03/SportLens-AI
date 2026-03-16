import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { Session } from '../types/session';
import { formatDuration, formatTimestamp } from '../types/session';
import { fetchSessions } from '../services/sessionApi';
import { buildAnalytics } from '../services/analyticsService';
import SessionReport from './SessionReport';
import { useAuth } from '../hooks/useAuth';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function formatRuleName(ruleId: string): string {
  return ruleId.replace(/-/g, ' ');
}

export default function ReportsDashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [source, setSource] = useState<'firestore' | 'local'>('local');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Get authenticated user
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const uid = user?.uid || null;
        const result = await fetchSessions(uid);
        setSessions(result.sessions);
        setSource(result.source);
      } catch (loadError) {
        console.error('Failed to load reports data:', loadError);
        setError('Failed to load sessions for reports.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const analytics = useMemo(() => buildAnalytics(sessions), [sessions]);

  const mostRecentSessions = useMemo(
    () => [...analytics.timeline].sort((a, b) => b.startTime - a.startTime),
    [analytics.timeline]
  );

  useEffect(() => {
    if (sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    if (!selectedSessionId) {
      setSelectedSessionId(sessions[0].sessionId);
      return;
    }

    if (!sessions.find((session) => session.sessionId === selectedSessionId)) {
      setSelectedSessionId(sessions[0].sessionId);
    }
  }, [sessions, selectedSessionId]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const durationChartData = {
    labels: analytics.durationTrend.map((point) => point.label),
    datasets: [
      {
        label: 'Duration (seconds)',
        data: analytics.durationTrend.map((point) => point.value),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.18)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.25,
      },
    ],
  };

  const kneeChartData = {
    labels: analytics.kneeAngleTrend.map((point) => point.label),
    datasets: [
      {
        label: 'Average Knee Angle (deg)',
        data: analytics.kneeAngleTrend.map((point) => point.value),
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.18)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.25,
        spanGaps: true,
      },
    ],
  };

  const errorChartData = {
    labels: analytics.errorFrequency.slice(0, 8).map((errorItem) => formatRuleName(errorItem.ruleId)),
    datasets: [
      {
        label: 'Error Count',
        data: analytics.errorFrequency.slice(0, 8).map((errorItem) => errorItem.count),
        backgroundColor: '#f97316',
        borderColor: '#ea580c',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#d6ebff',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9fb6d1',
        },
        grid: {
          color: 'rgba(255,255,255,0.08)',
        },
      },
      y: {
        ticks: {
          color: '#9fb6d1',
        },
        grid: {
          color: 'rgba(255,255,255,0.08)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div style={{ border: '1px solid #1e3a4c', borderRadius: 12, background: '#0f1419', padding: 24, color: '#b9d7ff' }}>
        Loading reports and analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ border: '1px solid #6b1f2a', borderRadius: 12, background: '#3f1720', padding: 24, color: '#ffd0d4' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ border: '1px solid #1e3a4c', borderRadius: 12, padding: 16, background: '#0f1419' }}>
        <h2 style={{ margin: 0, color: '#e5faff', fontSize: 22 }}>Reports and Analytics</h2>
        <p style={{ margin: '8px 0 0', color: '#9ec5e9', fontSize: 13 }}>
          Session source: {source === 'firestore' ? 'Firestore' : 'Local storage'}
        </p>
      </div>

      <section style={{ border: '1px solid #1e3a4c', borderRadius: 12, padding: 16, background: '#0f1419' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#d6ebff' }}>Overall Performance Summary</h3>
        <div style={{ marginTop: 14, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          <div style={{ background: '#111d2b', border: '1px solid #20425e', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#8fb4d6', fontSize: 12 }}>Total Sessions</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, color: '#f8fdff', fontWeight: 700 }}>{analytics.summary.totalSessions}</p>
          </div>
          <div style={{ background: '#111d2b', border: '1px solid #20425e', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#8fb4d6', fontSize: 12 }}>Average Session Duration</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, color: '#f8fdff', fontWeight: 700 }}>
              {formatDuration(analytics.summary.averageSessionDuration)}
            </p>
          </div>
          <div style={{ background: '#111d2b', border: '1px solid #20425e', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#8fb4d6', fontSize: 12 }}>Average Knee Angle</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, color: '#f8fdff', fontWeight: 700 }}>
              {analytics.summary.averageKneeAngle === null ? 'No data' : `${Math.round(analytics.summary.averageKneeAngle)} deg`}
            </p>
          </div>
          <div style={{ background: '#111d2b', border: '1px solid #20425e', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#8fb4d6', fontSize: 12 }}>Average Hip Angle</p>
            <p style={{ margin: '8px 0 0', fontSize: 24, color: '#f8fdff', fontWeight: 700 }}>
              {analytics.summary.averageHipAngle === null ? 'No data' : `${Math.round(analytics.summary.averageHipAngle)} deg`}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ background: '#102620', border: '1px solid #1f5848', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#9cd8c3', fontSize: 12 }}>Average Performance Score</p>
            <p style={{ margin: '8px 0 0', fontSize: 22, color: '#f8fdff', fontWeight: 700 }}>{analytics.summary.averagePerformanceScore}</p>
          </div>
          <div style={{ background: '#2a1e12', border: '1px solid #664421', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#f7caa8', fontSize: 12 }}>Total Violations Logged</p>
            <p style={{ margin: '8px 0 0', fontSize: 22, color: '#f8fdff', fontWeight: 700 }}>{analytics.summary.totalViolations}</p>
          </div>
          <div style={{ background: '#111d2b', border: '1px solid #20425e', borderRadius: 10, padding: 12 }}>
            <p style={{ margin: 0, color: '#8fb4d6', fontSize: 12 }}>Most Common Errors</p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#f8fdff' }}>
              {analytics.errorFrequency.length === 0
                ? 'No errors recorded'
                : analytics.errorFrequency
                    .slice(0, 3)
                    .map((errorItem) => `${formatRuleName(errorItem.ruleId)} (${errorItem.count})`)
                    .join(', ')}
            </p>
          </div>
        </div>
      </section>

      <section style={{ border: '1px solid #1e3a4c', borderRadius: 12, padding: 16, background: '#0f1419' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#d6ebff' }}>Angle Trends</h3>
        <div style={{ height: 280, marginTop: 14 }}>
          <Line data={kneeChartData} options={chartOptions} />
        </div>
      </section>

      <section style={{ border: '1px solid #1e3a4c', borderRadius: 12, padding: 16, background: '#0f1419' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#d6ebff' }}>Error Breakdown</h3>
        {analytics.errorFrequency.length === 0 ? (
          <p style={{ margin: '12px 0 0', color: '#9ec5e9', fontSize: 13 }}>No rule violations recorded yet.</p>
        ) : (
          <div style={{ height: 280, marginTop: 14 }}>
            <Bar data={errorChartData} options={chartOptions} />
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #1e3a4c', borderRadius: 12, padding: 16, background: '#0f1419' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#d6ebff' }}>Session Timeline</h3>
        <div style={{ height: 280, marginTop: 14 }}>
          <Line data={durationChartData} options={chartOptions} />
        </div>

        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {mostRecentSessions.length === 0 && (
            <p style={{ margin: 0, color: '#9ec5e9', fontSize: 13 }}>No sessions available yet.</p>
          )}

          {mostRecentSessions.map((item) => (
            <button
              key={item.sessionId}
              onClick={() => setSelectedSessionId(item.sessionId)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                textAlign: 'left',
                border: selectedSessionId === item.sessionId ? '1px solid #22d3ee' : '1px solid #24455f',
                background: selectedSessionId === item.sessionId ? '#173044' : '#111d2b',
                borderRadius: 8,
                padding: 10,
                color: '#d6ebff',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 13 }}>
                {formatTimestamp(item.startTime)} | {item.activityType}
              </span>
              <span style={{ fontSize: 13 }}>
                {formatDuration(item.duration)} | Score {item.performanceScore ?? 'N/A'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {selectedSession && (
        <section>
          <SessionReport session={selectedSession} />
        </section>
      )}
    </div>
  );
}

