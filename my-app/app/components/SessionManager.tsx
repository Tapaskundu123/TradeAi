'use client';

import { useState } from 'react';
import { ChatMessage, AppStatus, Experiment } from '../types';

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  status: AppStatus;
  experiment: Experiment;
  explanation: string | null;
  queries: string[]; // user query history
}

interface SessionManagerProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (session: Session) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  queryHistory: string[];
  onSelectQuery: (q: string) => void;
  onClearQueryHistory: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SessionManager({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  queryHistory,
  onSelectQuery,
  onClearQueryHistory,
  isOpen,
  onClose,
}: SessionManagerProps) {
  const [tab, setTab] = useState<'sessions' | 'history'>('sessions');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitEdit = (id: string) => {
    if (editName.trim()) onRenameSession(id, editName.trim());
    setEditingId(null);
  };

  const statusColors: Record<string, string> = {
    idle: '#64748b',
    clarifying: '#a78bfa',
    loading: '#60a5fa',
    complete: '#10d9a0',
    error: '#f87171',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 110,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 'min(340px, 92vw)',
          zIndex: 120,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(6, 11, 24, 0.98)',
          borderRight: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '8px 0 40px rgba(0,0,0,0.6)',
          animation: 'slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Session History</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {sessions.length} saved · {queryHistory.length} queries
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)')}
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '10px 14px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {(['sessions', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                background: tab === t ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${tab === t ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: tab === t ? '#c4b5fd' : '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {t === 'sessions' ? `💬 Sessions (${sessions.length})` : `🔍 Query History (${queryHistory.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="custom-scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 16px' }}
        >
          {tab === 'sessions' && (
            <>
              {/* New Session Button */}
              <button
                onClick={() => { onNewSession(); onClose(); }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(16,217,160,0.12), rgba(59,130,246,0.08))',
                  border: '1px solid rgba(16,217,160,0.3)',
                  color: '#10d9a0',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,217,160,0.2), rgba(59,130,246,0.14))')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,217,160,0.12), rgba(59,130,246,0.08))')}
              >
                <span style={{ fontSize: '16px' }}>＋</span> New Session
              </button>

              {sessions.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#475569',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                  No saved sessions yet.
                  <br />
                  Start chatting to create one.
                </div>
              )}

              {sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt).map(s => (
                <div
                  key={s.id}
                  onClick={() => { onSelectSession(s); onClose(); }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background:
                      s.id === activeSessionId
                        ? 'rgba(139, 92, 246, 0.12)'
                        : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${s.id === activeSessionId ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255,255,255,0.06)'}`,
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (s.id !== activeSessionId)
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={e => {
                    if (s.id !== activeSessionId)
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  {/* Session name */}
                  {editingId === s.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => commitEdit(s.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(s.id);
                        if (e.key === 'Escape') setEditingId(null);
                        e.stopPropagation();
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(139,92,246,0.5)',
                        borderRadius: '6px',
                        color: '#f1f5f9',
                        padding: '4px 8px',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit',
                        marginBottom: '4px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        paddingRight: '52px',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: statusColors[s.status] ?? '#64748b',
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${statusColors[s.status] ?? '#64748b'}`,
                        }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {s.messages.length} msgs · {timeAgo(s.updatedAt)}
                    {s.experiment.instrument ? ` · ${s.experiment.instrument}` : ''}
                  </div>

                  {/* Action icons */}
                  {editingId !== s.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        display: 'flex',
                        gap: '4px',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        title="Rename"
                        onClick={e => { e.stopPropagation(); startEdit(s); }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '5px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        title="Delete"
                        onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '5px',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {tab === 'history' && (
            <>
              {queryHistory.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <button
                    onClick={onClearQueryHistory}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#f87171',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              {queryHistory.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
                  No queries yet. Your trading questions will appear here.
                </div>
              )}

              {queryHistory
                .slice()
                .reverse()
                .map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelectQuery(q); onClose(); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#cbd5e1',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      lineHeight: 1.5,
                      marginBottom: '6px',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'rgba(139, 92, 246, 0.08)';
                      el.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'rgba(255,255,255,0.02)';
                      el.style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <span style={{ color: '#6366f1', fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>🔁</span>
                    <span style={{ flex: 1 }}>{q}</span>
                  </button>
                ))}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
