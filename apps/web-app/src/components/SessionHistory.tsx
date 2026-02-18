/**
 * Session History Component for SportLens AI
 * 
 * Displays a list of completed training sessions with:
 * - Session metadata (date, duration, activity type)
 * - Performance score
 * - Aggregated biomechanics metrics
 * - Violation summary
 * - Expandable cards for detailed view
 */

import { useEffect, useState } from 'react';
import { SessionStorage } from '../services/sessionStorage';
import { fetchSessions, syncPendingSessions, deleteSession } from '../services/sessionApi';
import type { Session } from '../types/session';
import { formatDuration, formatTimestamp } from '../types/session';
import { useAuth } from '../hooks/useAuth';

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<'all' | 'fitness' | 'cricket'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingFromFirestore, setLoadingFromFirestore] = useState(false);
  const [firestoreAvailable, setFirestoreAvailable] = useState(false);
  const [dataSource, setDataSource] = useState<'local' | 'firestore'>('local');
  
  // Get authenticated user
  const { user } = useAuth();

  // Load sessions on mount and when filter changes
  useEffect(() => {
    loadSessions();
  }, [filter, user]);

  const loadSessions = async () => {
    setLoadingFromFirestore(true);
    try {
      const uid = user?.uid || null;
      
      // Use sessionApi which handles fallback automatically
      const result = await fetchSessions(
        uid,
        filter === 'all' ? undefined : (filter as 'fitness' | 'cricket')
      );
      
      setSessions(result.sessions);
      setFirestoreAvailable(result.source === 'firestore');
      setDataSource(result.source);
      
      console.log(`📚 ${result.message} (source: ${result.source})`);
      
      // If we have pending sessions and user is authenticated, try to sync them
      if (uid && result.source === 'firestore') {
        const allSessions = SessionStorage.getAllSessions();
        const pendingSessions = allSessions.filter(s => s.syncStatus === 'pending');
        
        if (pendingSessions.length > 0) {
          console.log(`🔄 Attempting to sync ${pendingSessions.length} pending sessions...`);
          const syncResult = await syncPendingSessions(uid);
          
          if (syncResult.succeeded > 0) {
            console.log(`✅ Synced ${syncResult.succeeded} pending sessions`);
            // Reload to show updated sync status
            loadSessions();
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // Fallback already handled by fetchSessions
      const allSessions = SessionStorage.getAllSessions();
      setSessions(allSessions);
      setDataSource('local');
      setFirestoreAvailable(false);
    } finally {
      setLoadingFromFirestore(false);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (filter === 'all') return true;
    return s.activityType === filter;
  });

  // Toggle expanded view
  const toggleExpand = (sessionId: string) => {
    setExpandedId(expandedId === sessionId ? null : sessionId);
  };

  // Delete session
  const handleDelete = async (sessionId: string) => {
    if (confirm('Delete this session?')) {
      try {
        const uid = user?.uid || null;
        const success = await deleteSession(sessionId, uid);
        if (success) {
          console.log(`✅ Session deleted: ${sessionId}`);
        }
        // Reload either way
        loadSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
        loadSessions();
      }
    }
  };

  // Clear all sessions
  const handleClearAll = () => {
    if (confirm('Delete ALL sessions? This cannot be undone.')) {
      SessionStorage.clearAllSessions();
      loadSessions();
    }
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 70) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#0b0c10", 
      color: "#e5faff", 
      padding: "24px", 
      fontFamily: "Inter, system-ui, sans-serif" 
    }}>
      {/* Header */}
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", color: "#0ad4ff" }}>
          📊 Session History
        </h1>
        <p style={{ fontSize: "14px", marginBottom: "24px", color: "#b9d7ff" }}>
          Review past training sessions and track your progress
        </p>

        {/* Data Source Indicator */}
        <div style={{ 
          marginBottom: "16px", 
          padding: "10px 14px", 
          background: dataSource === 'backend' ? "#10b98110" : "#f59e0b10",
          border: `1px solid ${dataSource === 'backend' ? '#10b981' : '#f59e0b'}`,
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px"
        }}>
          <span style={{ fontSize: "16px" }}>
            {dataSource === 'firestore' ? '☁️' : '💾'}
          </span>
          <span style={{ color: dataSource === 'firestore' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
            {loadingFromFirestore ? 'Checking Firestore...' : 
             dataSource === 'firestore' ? 'Connected to Firestore' : 'Offline mode (local storage)'}
          </span>
          {!firestoreAvailable && !loadingFromFirestore && (
            <span style={{ color: "#6b7280", fontSize: "11px", marginLeft: "auto" }}>
              {user ? 'Firestore unavailable - showing local sessions only' : 'Not authenticated - showing local sessions only'}
            </span>
          )}
        </div>

        {/* Filter Buttons */}
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <button 
            onClick={() => setFilter('all')}
            style={{ 
              padding: "6px 12px", 
              background: filter === 'all' ? "#0ad4ff" : "#1e3a4c", 
              color: filter === 'all' ? "#001018" : "#7dd3fc",
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            All ({sessions.length})
          </button>
          <button 
            onClick={() => setFilter('fitness')}
            style={{ 
              padding: "6px 12px", 
              background: filter === 'fitness' ? "#0ad4ff" : "#1e3a4c", 
              color: filter === 'fitness' ? "#001018" : "#7dd3fc",
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Fitness ({sessions.filter(s => s.activityType === 'fitness').length})
          </button>
          <button 
            onClick={() => setFilter('cricket')}
            style={{ 
              padding: "6px 12px", 
              background: filter === 'cricket' ? "#0ad4ff" : "#1e3a4c", 
              color: filter === 'cricket' ? "#001018" : "#7dd3fc",
              border: "none", 
              borderRadius: "6px", 
              fontWeight: 700, 
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Cricket ({sessions.filter(s => s.activityType === 'cricket').length})
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button 
              onClick={loadSessions}
              style={{ 
                padding: "6px 12px", 
                background: "#1e3a4c", 
                color: "#7dd3fc",
                border: "none", 
                borderRadius: "6px", 
                fontWeight: 700, 
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              🔄 Refresh
            </button>
            <button 
              onClick={handleClearAll}
              style={{ 
                padding: "6px 12px", 
                background: "#ef4444", 
                color: "#fff",
                border: "none", 
                borderRadius: "6px", 
                fontWeight: 700, 
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredSessions.length === 0 && (
          <div style={{ 
            padding: "48px 24px", 
            textAlign: "center", 
            background: "#0f1419", 
            border: "1px solid #1e3a4c", 
            borderRadius: "8px" 
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#7dd3fc", marginBottom: "8px" }}>
              No sessions yet
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280" }}>
              Complete a training session in Live Coaching to see it here
            </p>
          </div>
        )}

        {/* Session Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredSessions.map((session) => {
            const isExpanded = expandedId === session.sessionId;
            const scoreColor = getScoreColor(session.metrics.performanceScore);

            return (
              <div 
                key={session.sessionId} 
                style={{ 
                  background: "#0f1419", 
                  border: "1px solid #1e3a4c", 
                  borderRadius: "8px",
                  overflow: "hidden"
                }}
              >
                {/* Card Header (Always Visible) */}
                <div 
                  onClick={() => toggleExpand(session.sessionId)}
                  style={{ 
                    padding: "16px", 
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background 0.2s",
                    background: isExpanded ? "#1a2332" : "transparent"
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = "#131a24";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                      <span style={{ 
                        fontSize: "11px", 
                        fontWeight: 700, 
                        padding: "4px 8px", 
                        background: session.activityType === 'fitness' ? "#10b98120" : "#f59e0b20",
                        color: session.activityType === 'fitness' ? "#10b981" : "#f59e0b",
                        borderRadius: "4px",
                        textTransform: "uppercase"
                      }}>
                        {session.activityType}
                      </span>
                      <span style={{ fontSize: "13px", color: "#b9d7ff" }}>
                        {formatTimestamp(session.startTime)}
                      </span>
                      {session.syncStatus === 'synced' && (
                        <span style={{ fontSize: "11px", color: "#10b981" }}>✓ Synced</span>
                      )}
                      {session.syncStatus === 'pending' && (
                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>⏳ Pending</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "20px", fontSize: "13px" }}>
                      <span style={{ color: "#7dd3fc" }}>
                        ⏱️ {formatDuration(session.duration)}
                      </span>
                      <span style={{ color: "#7dd3fc" }}>
                        📹 {session.metrics.biomechanics.totalFrames} frames
                      </span>
                      <span style={{ color: "#7dd3fc" }}>
                        ⚠️ {session.metrics.totalViolations} violations
                      </span>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div style={{ 
                    fontSize: "32px", 
                    fontWeight: 700, 
                    color: scoreColor,
                    marginRight: "16px"
                  }}>
                    {session.metrics.performanceScore}
                  </div>

                  {/* Expand Icon */}
                  <div style={{ 
                    fontSize: "20px", 
                    color: "#7dd3fc",
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)"
                  }}>
                    ▶
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ 
                    padding: "0 16px 16px 16px", 
                    borderTop: "1px solid #1e3a4c",
                    background: "#0b0c10"
                  }}>
                    {/* Biomechanics Summary */}
                    <div style={{ marginTop: "16px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0ad4ff", marginBottom: "12px" }}>
                        📊 Biomechanics Summary
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        {session.metrics.biomechanics.leftKnee && (
                          <div style={{ fontSize: "12px" }}>
                            <strong style={{ color: "#7dd3fc" }}>Left Knee:</strong>
                            <div style={{ color: "#e5faff", marginTop: "4px" }}>
                              Avg: {session.metrics.biomechanics.leftKnee.avg}° | 
                              Min: {session.metrics.biomechanics.leftKnee.min}° | 
                              Max: {session.metrics.biomechanics.leftKnee.max}°
                            </div>
                          </div>
                        )}
                        {session.metrics.biomechanics.rightKnee && (
                          <div style={{ fontSize: "12px" }}>
                            <strong style={{ color: "#7dd3fc" }}>Right Knee:</strong>
                            <div style={{ color: "#e5faff", marginTop: "4px" }}>
                              Avg: {session.metrics.biomechanics.rightKnee.avg}° | 
                              Min: {session.metrics.biomechanics.rightKnee.min}° | 
                              Max: {session.metrics.biomechanics.rightKnee.max}°
                            </div>
                          </div>
                        )}
                        {session.metrics.biomechanics.leftHip && (
                          <div style={{ fontSize: "12px" }}>
                            <strong style={{ color: "#7dd3fc" }}>Left Hip:</strong>
                            <div style={{ color: "#e5faff", marginTop: "4px" }}>
                              Avg: {session.metrics.biomechanics.leftHip.avg}° | 
                              Min: {session.metrics.biomechanics.leftHip.min}° | 
                              Max: {session.metrics.biomechanics.leftHip.max}°
                            </div>
                          </div>
                        )}
                        {session.metrics.biomechanics.rightHip && (
                          <div style={{ fontSize: "12px" }}>
                            <strong style={{ color: "#7dd3fc" }}>Right Hip:</strong>
                            <div style={{ color: "#e5faff", marginTop: "4px" }}>
                              Avg: {session.metrics.biomechanics.rightHip.avg}° | 
                              Min: {session.metrics.biomechanics.rightHip.min}° | 
                              Max: {session.metrics.biomechanics.rightHip.max}°
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Violation Summary */}
                    {session.metrics.totalViolations > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0ad4ff", marginBottom: "12px" }}>
                          ⚠️ Common Issues
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {Object.entries(session.metrics.violations)
                            .sort(([, a], [, b]) => b - a) // Sort by count descending
                            .slice(0, 5) // Show top 5
                            .map(([ruleId, count]) => (
                              <div 
                                key={ruleId} 
                                style={{ 
                                  fontSize: "12px", 
                                  color: "#e5faff",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  padding: "6px 12px",
                                  background: "#1a2332",
                                  borderRadius: "4px"
                                }}
                              >
                                <span>{ruleId.replace(/-/g, ' ')}</span>
                                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{count}×</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {session.notes && (
                      <div style={{ marginTop: "16px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0ad4ff", marginBottom: "8px" }}>
                          📝 Notes
                        </h3>
                        <p style={{ fontSize: "12px", color: "#b9d7ff" }}>{session.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.sessionId);
                        }}
                        style={{ 
                          padding: "6px 12px", 
                          background: "#ef4444", 
                          color: "#fff",
                          border: "none", 
                          borderRadius: "6px", 
                          fontWeight: 700, 
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Storage Info */}
        <div style={{ 
          marginTop: "24px", 
          padding: "12px", 
          background: "#0f1419", 
          border: "1px solid #1e3a4c", 
          borderRadius: "8px",
          fontSize: "12px",
          color: "#6b7280"
        }}>
          <strong style={{ color: "#7dd3fc" }}>Storage:</strong> {SessionStorage.getStats().estimatedSizeKB} KB used | 
          {" "}{sessions.length} total sessions ({SessionStorage.getStats().fitnessSessions} fitness, {SessionStorage.getStats().cricketSessions} cricket)
        </div>
      </div>
    </div>
  );
}
