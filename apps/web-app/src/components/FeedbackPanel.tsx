import { RuleViolation, RuleSeverity } from '../rules/ruleEngine';

interface FeedbackPanelProps {
  violations: RuleViolation[];
  onClear?: () => void;
}

/**
 * FeedbackPanel - Displays real-time coaching feedback
 * Shows active rule violations as coaching cues
 */
export default function FeedbackPanel({ violations, onClear }: FeedbackPanelProps) {
  // Get icon and color based on severity
  const getSeverityStyle = (severity: RuleSeverity) => {
    switch (severity) {
      case 'error':
        return {
          icon: '🔴',
          bgColor: '#2d1a1a',
          borderColor: '#ff4d4f',
          textColor: '#ffb3b8',
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: '#2d2418',
          borderColor: '#faad14',
          textColor: '#ffd666',
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: '#1a2332',
          borderColor: '#0ad4ff',
          textColor: '#7dd3fc',
        };
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#0f1419', 
      border: '1px solid #1e3a4c', 
      borderRadius: '8px', 
      padding: '16px',
      minHeight: '120px',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: 700, 
          color: '#0ad4ff',
          margin: 0,
        }}>
          🎯 Live Coaching Feedback
        </h2>
        
        {onClear && violations.length > 0 && (
          <button 
            onClick={onClear}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: 'transparent',
              border: '1px solid #1e3a4c',
              borderRadius: '4px',
              color: '#7dd3fc',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {violations.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80px',
          color: '#6b7280',
          fontSize: '13px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
            <div>Form looks good! Keep it up.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {violations.map((violation, index) => {
            const style = getSeverityStyle(violation.severity);
            
            return (
              <div
                key={`${violation.ruleId}-${index}`}
                style={{
                  backgroundColor: style.bgColor,
                  border: `1px solid ${style.borderColor}`,
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  animation: 'fadeIn 0.3s ease-in',
                }}
              >
                <div style={{ fontSize: '18px', lineHeight: 1 }}>
                  {style.icon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: style.textColor,
                    marginBottom: '4px',
                  }}>
                    {violation.message}
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: '#9fb6d1',
                    display: 'flex',
                    gap: '12px',
                  }}>
                    <span>
                      {violation.jointName}: {violation.actualValue !== null ? Math.round(violation.actualValue) + '°' : '—'}
                    </span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {violation.severity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
