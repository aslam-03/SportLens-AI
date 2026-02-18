import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Session } from '../types/session';
import { formatDuration, formatTimestamp } from '../types/session';
import { getSessionAverageHipAngle, getSessionAverageKneeAngle } from '../services/analyticsService';

interface SessionReportProps {
  session: Session;
}

function formatRuleName(ruleId: string): string {
  return ruleId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFilename(session: Session): string {
  const date = new Date(session.startTime);
  const iso = date.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  return `sportlens-session-report-${iso}.pdf`;
}

function getRating(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs Improvement';
  return 'Critical';
}

export default function SessionReport({ session }: SessionReportProps) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const averageKnee = getSessionAverageKneeAngle(session);
  const averageHip = getSessionAverageHipAngle(session);
  const rating = getRating(session.metrics.performanceScore);

  const topErrors = Object.entries(session.metrics.violations).sort((a, b) => b[1] - a[1]);

  const exportPdf = async () => {
    if (!reportRef.current) return;

    setExporting(true);
    setError(null);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;

      let heightLeft = renderHeight;
      let y = margin;

      pdf.addImage(imageData, 'PNG', margin, y, renderWidth, renderHeight, undefined, 'FAST');
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        y = heightLeft - renderHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, y, renderWidth, renderHeight, undefined, 'FAST');
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(buildFilename(session));
    } catch (pdfError) {
      console.error('Failed to export PDF:', pdfError);
      setError('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ border: '1px solid #1e3a4c', borderRadius: 12, overflow: 'hidden', background: '#0f1419' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid #1e3a4c' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#e5faff' }}>Session Report</h3>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ec5e9' }}>
            {formatTimestamp(session.startTime)}
          </p>
        </div>
        <button
          onClick={exportPdf}
          disabled={exporting}
          style={{
            background: exporting ? '#3b5060' : '#0ad4ff',
            color: exporting ? '#bfd8ea' : '#001018',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            padding: '10px 14px',
            cursor: exporting ? 'default' : 'pointer',
          }}
        >
          {exporting ? 'Generating PDF...' : 'Export PDF'}
        </button>
      </div>

      {error && (
        <div style={{ margin: '12px 16px', padding: 10, borderRadius: 8, background: '#502226', color: '#ffd0d4', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div
        ref={reportRef}
        style={{
          background: '#ffffff',
          color: '#111827',
          padding: 24,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>SportLens AI Session Summary</h2>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4b5563' }}>
            Session ID: {session.sessionId}
          </p>
        </div>

        {/* Video player if available */}
        {session.r2Objects?.videoUrl && (
          <div style={{ marginBottom: 20, border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #d1d5db', background: '#f9fafb' }}>
              <h4 style={{ margin: 0, fontSize: 14, color: '#374151' }}>Session Recording</h4>
            </div>
            <video
              controls
              style={{ width: '100%', display: 'block', background: '#000' }}
              preload="metadata"
            >
              <source src={session.r2Objects.videoUrl} type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Duration</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>{formatDuration(session.duration)}</p>
          </div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Activity</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>{session.activityType}</p>
          </div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Performance Score</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>
              {session.metrics.performanceScore} ({rating})
            </p>
          </div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Total Errors</p>
            <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 700 }}>{session.metrics.totalViolations}</p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 16 }}>Key Joint Metrics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Average Knee Angle</p>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700 }}>
                {averageKnee === null ? 'No data' : `${Math.round(averageKnee)} deg`}
              </p>
            </div>
            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Average Hip Angle</p>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700 }}>
                {averageHip === null ? 'No data' : `${Math.round(averageHip)} deg`}
              </p>
            </div>
            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Frames Processed</p>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700 }}>{session.metrics.biomechanics.totalFrames}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 10px', fontSize: 16 }}>Error Distribution</h4>
          {topErrors.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#10b981' }}>No violations recorded in this session.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #d1d5db', padding: '8px 6px' }}>Rule</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #d1d5db', padding: '8px 6px' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {topErrors.map(([ruleId, count]) => (
                  <tr key={ruleId}>
                    <td style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 6px' }}>{formatRuleName(ruleId)}</td>
                    <td style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

