'use client';

import { useState } from 'react';
import { Experiment, AppStatus } from '../types';

interface ExperimentCardProps {
  experiment: Experiment;
  status: AppStatus;
  explanation?: string | null;
}

const FIELD_META: { key: keyof Experiment; label: string; icon: string; critical: boolean }[] = [
  { key: 'instrument', label: 'Instrument', icon: '📊', critical: true },
  { key: 'timeframe', label: 'Timeframe', icon: '⏱️', critical: false },
  { key: 'entry_condition', label: 'Entry Condition', icon: '🟢', critical: true },
  { key: 'exit_condition', label: 'Exit Condition', icon: '🔴', critical: true },
  { key: 'holding_period', label: 'Holding Period', icon: '🕐', critical: true },
  { key: 'hypothesis', label: 'Hypothesis', icon: '🎯', critical: false },
];

function FieldRow({
  icon,
  label,
  value,
  isMissing,
  delay,
}: {
  icon: string;
  label: string;
  value?: string | null;
  isMissing: boolean;
  delay: number;
}) {
  const filled = !!value;
  return (
    <div
      className="field-row"
      style={{
        animationDelay: `${delay}ms`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: filled
          ? 'rgba(16, 217, 160, 0.06)'
          : isMissing
          ? 'rgba(239, 68, 68, 0.05)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${
          filled
            ? 'rgba(16,217,160,0.18)'
            : isMissing
            ? 'rgba(239,68,68,0.2)'
            : 'rgba(255,255,255,0.05)'
        }`,
        transition: 'all 0.3s ease',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1.5, minWidth: 20 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#64748b',
            marginBottom: '2px',
          }}
        >
          {label}
        </div>
        {filled ? (
          <div
            style={{
              fontSize: '13.5px',
              color: '#f1f5f9',
              fontWeight: 500,
              wordBreak: 'break-word',
              lineHeight: 1.45,
            }}
          >
            {value}
          </div>
        ) : (
          <div
            style={{
              fontSize: '12.5px',
              color: isMissing ? '#f87171' : '#475569',
              fontStyle: 'italic',
            }}
          >
            {isMissing ? 'Awaiting clarification in chat…' : 'Not specified'}
          </div>
        )}
      </div>
      <div style={{ minWidth: 20, textAlign: 'right', paddingTop: 2 }}>
        {filled ? (
          <span style={{ color: '#10d9a0', fontSize: '15px', fontWeight: 700 }}>✓</span>
        ) : (
          <span style={{ color: isMissing ? '#ef4444' : '#334155', fontSize: '16px' }}>○</span>
        )}
      </div>
    </div>
  );
}

function CompletionBar({ experiment }: { experiment: Experiment }) {
  const total = FIELD_META.length;
  const filled = FIELD_META.filter(f => {
    const v = experiment[f.key];
    return v !== null && v !== undefined && v !== '';
  }).length;
  const pct = Math.round((filled / total) * 100);

  return (
    <div style={{ marginBottom: '16px', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>
          Experiment Completeness
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: pct === 100 ? '#10d9a0' : '#818cf8',
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: '6px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              pct === 100
                ? 'linear-gradient(90deg, #10d9a0, #3b82f6)'
                : 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
            borderRadius: '3px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function ExperimentCard({ experiment, status, explanation }: ExperimentCardProps) {
  const [copied, setCopied] = useState(false);
  const isIdle = status === 'idle';
  const isComplete = status === 'complete';
  const missingFields = experiment.missing_fields || [];

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(experiment, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(experiment, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradeai-experiment-${(experiment.instrument || 'strategy').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        background: 'rgba(10, 18, 36, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '20px',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
      }}
    >
      {/* ── Fixed Card Header ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#64748b',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Structured
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>
            Experiment Spec
          </h2>
        </div>

        <div
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            background: isComplete
              ? 'rgba(16, 217, 160, 0.15)'
              : isIdle
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(139, 92, 246, 0.15)',
            color: isComplete ? '#10d9a0' : isIdle ? '#64748b' : '#a78bfa',
            border: `1px solid ${
              isComplete
                ? 'rgba(16,217,160,0.3)'
                : isIdle
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(139,92,246,0.3)'
            }`,
          }}
        >
          {isComplete
            ? '✓ COMPLETE'
            : isIdle
            ? 'WAITING'
            : status === 'loading'
            ? 'ANALYZING…'
            : 'IN PROGRESS'}
        </div>
      </div>

      {/* Empty state */}
      {isIdle ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '14px',
            padding: '24px 12px',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              opacity: 0.6,
            }}
          >
            📊
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
              No Experiment Yet
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.6, maxWidth: '280px' }}>
              Ask a question in the chat on the left. The AI will extract and structure every trading parameter into this live card.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <CompletionBar experiment={experiment} />

          {/* ── Scrollable Fields Container (prominent vertical scrollbar) ── */}
          <div
            className="custom-scrollbar"
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {FIELD_META.map((meta, i) => {
              const rawVal = experiment[meta.key];
              const value = Array.isArray(rawVal)
                ? (rawVal as string[]).join(', ')
                : (rawVal as string | null | undefined);
              const isMissing = missingFields.includes(meta.key);
              return (
                <FieldRow
                  key={meta.key}
                  icon={meta.icon}
                  label={meta.label}
                  value={value}
                  isMissing={isMissing}
                  delay={i * 50}
                />
              );
            })}

            {/* Filters */}
            {experiment.filters && experiment.filters.length > 0 && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#60a5fa',
                    marginBottom: '8px',
                  }}
                >
                  🔍 Variables & Regime Filters
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {experiment.filters.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: 'rgba(59,130,246,0.14)',
                        color: '#bfdbfe',
                        border: '1px solid rgba(59,130,246,0.25)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation Summary */}
            {explanation && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(16,217,160,0.05)',
                  border: '1px solid rgba(16,217,160,0.15)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#10d9a0',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  Research Summary
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#cbd5e1',
                    lineHeight: 1.6,
                  }}
                >
                  {explanation}
                </p>
              </div>
            )}

            {/* Action Buttons for structured experiment */}
            {Object.keys(experiment).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={handleCopyJson}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: copied ? '#10d9a0' : '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.08)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.04)')
                  }
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={handleExportJson}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(16, 217, 160, 0.1)',
                    border: '1px solid rgba(16, 217, 160, 0.25)',
                    color: '#10d9a0',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(16, 217, 160, 0.18)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(16, 217, 160, 0.1)')
                  }
                >
                  <span>💾</span>
                  <span>Export JSON</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
