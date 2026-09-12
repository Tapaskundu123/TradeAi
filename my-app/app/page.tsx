'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ChatMessage, AppStatus, Experiment, AnalyzeResponse } from './types';
import ChatInterface from './components/ChatInterface';
import ExperimentCard from './components/ExperimentCard';
import BacktestPreview from './components/BacktestPreview';
import SessionManager, { Session } from './components/SessionManager';
import { useLocalStorage } from './hooks/useLocalStorage';

// ── helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeSessionName(messages: ChatMessage[]) {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New Session';
  return first.content.length > 45
    ? first.content.slice(0, 45) + '…'
    : first.content;
}

// ── component ──────────────────────────────────────────────────────────────

export default function Home() {
  // ── localStorage ──────────────────────────────────────────────────────
  const [sessions, setSessions] = useLocalStorage<Session[]>('tradeai-sessions', []);
  const [queryHistory, setQueryHistory] = useLocalStorage<string[]>('tradeai-query-history', []);
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string | null>('tradeai-active-session', null);

  // ── ephemeral UI state ─────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [experiment, setExperiment] = useState<Experiment>({});
  const [explanation, setExplanation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'card'>('chat');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | undefined>(undefined);

  // ── restore last active session on first mount ─────────────────────────
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    if (activeSessionId) {
      const s = sessions.find(x => x.id === activeSessionId);
      if (s) {
        setMessages(s.messages);
        setStatus(s.status);
        setExperiment(s.experiment);
        setExplanation(s.explanation);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-save current session whenever state changes ─────────────────
  const saveCurrentSession = useCallback(
    (
      msgs: ChatMessage[],
      st: AppStatus,
      exp: Experiment,
      expl: string | null,
      sessionId: string | null
    ) => {
      if (msgs.length === 0 || !sessionId) return;
      setSessions(prev => {
        const idx = prev.findIndex(s => s.id === sessionId);
        const now = Date.now();
        if (idx === -1) {
          // Create new session record
          const newSession: Session = {
            id: sessionId,
            name: makeSessionName(msgs),
            createdAt: now,
            updatedAt: now,
            messages: msgs,
            status: st,
            experiment: exp,
            explanation: expl,
            queries: msgs.filter(m => m.role === 'user').map(m => m.content),
          };
          return [...prev, newSession];
        }
        // Update existing
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          updatedAt: now,
          messages: msgs,
          status: st,
          experiment: exp,
          explanation: expl,
          queries: msgs.filter(m => m.role === 'user').map(m => m.content),
        };
        return updated;
      });
    },
    [setSessions]
  );

  // ── track current session id ──────────────────────────────────────────
  const currentSessionIdRef = useRef<string | null>(activeSessionId);

  const ensureSessionId = () => {
    if (!currentSessionIdRef.current) {
      const id = generateId();
      currentSessionIdRef.current = id;
      setActiveSessionId(id);
    }
    return currentSessionIdRef.current!;
  };

  // ── completeness pct ───────────────────────────────────────────────────
  const completionPct = useMemo(() => {
    const keys: (keyof Experiment)[] = [
      'instrument', 'timeframe', 'entry_condition',
      'exit_condition', 'holding_period', 'hypothesis',
    ];
    const filled = keys.filter(k => {
      const v = experiment[k];
      return v !== null && v !== undefined && v !== '';
    }).length;
    return Math.round((filled / keys.length) * 100);
  }, [experiment]);

  // ── send message ───────────────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (content: string) => {
      const sessionId = ensureSessionId();

      const userMessage: ChatMessage = {
        role: 'user',
        content,
        id: `u-${Date.now()}`,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setStatus('loading');

      // Save user query to history (deduplicated, max 80)
      setQueryHistory(prev => {
        const filtered = prev.filter(q => q !== content);
        return [...filtered, content].slice(-80);
      });

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        if (!res.ok) throw new Error('API error');
        const data: AnalyzeResponse = await res.json();

        setExperiment(data.experiment);
        setExplanation(data.explanation ?? null);

        let finalMessages = updatedMessages;
        let finalStatus: AppStatus = 'loading';

        if (data.status === 'clarifying' && data.clarification_question) {
          const aiMsg: ChatMessage = {
            role: 'assistant',
            content: data.clarification_question,
            id: `a-${Date.now()}`,
          };
          finalMessages = [...updatedMessages, aiMsg];
          finalStatus = 'clarifying';
        } else if (data.status === 'complete') {
          const aiMsg: ChatMessage = {
            role: 'assistant',
            content: `Your experiment is fully structured! 🎯\n\n${
              data.explanation ?? 'All mandatory parameters have been identified.'
            }\n\nReview the parameters or export backtest JSON schema.`,
            id: `a-${Date.now()}`,
          };
          finalMessages = [...updatedMessages, aiMsg];
          finalStatus = 'complete';
        }

        setMessages(finalMessages);
        setStatus(finalStatus);
        saveCurrentSession(finalMessages, finalStatus, data.experiment, data.explanation ?? null, sessionId);

      } catch {
        const finalStatus: AppStatus = 'error';
        const errMsg: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I had trouble processing that. Please try again or rephrase.',
          id: `a-err-${Date.now()}`,
        };
        const finalMessages = [...updatedMessages, errMsg];
        setMessages(finalMessages);
        setStatus(finalStatus);
        saveCurrentSession(finalMessages, finalStatus, experiment, explanation, sessionId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, experiment, explanation, saveCurrentSession, setQueryHistory]
  );

  // ── reset / new session ────────────────────────────────────────────────
  const handleReset = () => {
    currentSessionIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setStatus('idle');
    setExperiment({});
    setExplanation(null);
    setActiveTab('chat');
  };

  const handleNewSession = () => {
    handleReset();
  };

  // ── load a session ─────────────────────────────────────────────────────
  const handleSelectSession = (s: Session) => {
    currentSessionIdRef.current = s.id;
    setActiveSessionId(s.id);
    setMessages(s.messages);
    setStatus(s.status);
    setExperiment(s.experiment);
    setExplanation(s.explanation);
    setActiveTab('chat');
  };

  // ── delete session ─────────────────────────────────────────────────────
  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) handleReset();
  };

  // ── rename session ─────────────────────────────────────────────────────
  const handleRenameSession = (id: string, name: string) => {
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, name } : s))
    );
  };

  // ── pick a query from history ──────────────────────────────────────────
  const handleSelectQuery = (q: string) => {
    setPendingInput(q);
  };

  // ── clear query history ────────────────────────────────────────────────
  const handleClearQueryHistory = () => {
    setQueryHistory([]);
  };

  // Reset pendingInput once consumed by ChatInterface
  const handleSendWithPending = useCallback(
    (content: string) => {
      setPendingInput(undefined);
      handleSendMessage(content);
    },
    [handleSendMessage]
  );

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Session Drawer ────────────────────────────────────────── */}
      <SessionManager
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        queryHistory={queryHistory}
        onSelectQuery={handleSelectQuery}
        onClearQueryHistory={handleClearQueryHistory}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        style={{
          padding: '0 18px',
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(6,11,24,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        {/* Brand + History button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* History / session drawer toggle */}
          <button
            onClick={() => setDrawerOpen(true)}
            id="open-sessions-btn"
            title="View session history"
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              position: 'relative',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.12)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.35)';
              (e.currentTarget as HTMLButtonElement).style.color = '#c4b5fd';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.09)';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
            }}
          >
            📂
            {sessions.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#7c3aed',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sessions.length > 9 ? '9+' : sessions.length}
              </span>
            )}
          </button>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #10d9a0, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 2px 12px rgba(16, 217, 160, 0.3)',
            }}
          >
            🔬
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>
              TradeAI
              <span
                style={{
                  marginLeft: 6,
                  fontSize: '9.5px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  background: 'linear-gradient(135deg, #10d9a0, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                RESEARCH
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1, marginTop: '2px' }}>
              AI Trading Experiment Builder
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status !== 'idle' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                background:
                  status === 'complete'
                    ? 'rgba(16,217,160,0.1)'
                    : status === 'loading'
                    ? 'rgba(59,130,246,0.1)'
                    : 'rgba(139,92,246,0.1)',
                border: `1px solid ${
                  status === 'complete'
                    ? 'rgba(16,217,160,0.3)'
                    : status === 'loading'
                    ? 'rgba(59,130,246,0.3)'
                    : 'rgba(139,92,246,0.3)'
                }`,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    status === 'complete'
                      ? '#10d9a0'
                      : status === 'loading'
                      ? '#3b82f6'
                      : '#a78bfa',
                  animation: status === 'loading' ? 'glowPulse 1s ease-in-out infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color:
                    status === 'complete'
                      ? '#10d9a0'
                      : status === 'loading'
                      ? '#60a5fa'
                      : '#a78bfa',
                }}
              >
                {status === 'complete'
                  ? 'Complete'
                  : status === 'loading'
                  ? 'Analyzing'
                  : 'Clarifying'}
              </span>
            </div>
          )}

          {status !== 'idle' && (
            <button
              onClick={handleReset}
              id="reset-experiment-btn"
              title="Reset experiment and start over"
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              }}
            >
              ↺ New
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile Tab Bar (< 1024px) ───────────────────────────── */}
      <div
        className="mobile-only-tab-bar"
        style={{
          padding: '8px 16px',
          background: 'rgba(10, 18, 36, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '8px',
          zIndex: 40,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '10px',
            background: activeTab === 'chat' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${
              activeTab === 'chat' ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.06)'
            }`,
            color: activeTab === 'chat' ? '#f1f5f9' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>💬 Research Chat</span>
          {messages.length > 0 && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.3)',
                color: '#c4b5fd',
              }}
            >
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('card')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '10px',
            background: activeTab === 'card' ? 'rgba(16, 217, 160, 0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${
              activeTab === 'card' ? 'rgba(16, 217, 160, 0.4)' : 'rgba(255,255,255,0.06)'
            }`,
            color: activeTab === 'card' ? '#10d9a0' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>📊 Experiment Card</span>
          {completionPct > 0 && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: completionPct === 100 ? 'rgba(16, 217, 160, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                color: completionPct === 100 ? '#6ee7b7' : '#93c5fd',
                fontWeight: 700,
              }}
            >
              {completionPct}%
            </span>
          )}
        </button>
      </div>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: '16px',
          padding: '14px 18px',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          minHeight: 0,
          height: 'calc(100% - 58px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Chat Panel */}
        <div
          className={activeTab === 'card' ? 'mobile-hide' : 'mobile-full'}
          style={{
            flex: '1 1 58%',
            minWidth: 0,
            height: '100%',
            minHeight: 0,
          }}
        >
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendWithPending}
            isLoading={status === 'loading'}
            status={status}
            pendingInput={pendingInput}
          />
        </div>

        {/* Experiment Card & Backtest Panel */}
        <div
          className={`custom-scrollbar ${activeTab === 'chat' ? 'mobile-hide' : 'mobile-full'}`}
          style={{
            flex: '0 0 440px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            paddingRight: '2px',
          }}
        >
          <div
            style={{
              flex: status === 'complete' ? '1 1 auto' : '1 1 100%',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ExperimentCard
              experiment={experiment}
              status={status}
              explanation={explanation}
            />
          </div>

          {status === 'complete' && (
            <div style={{ flexShrink: 0 }}>
              <BacktestPreview experiment={experiment} />
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile Floating Switcher Button ─────────────────────── */}
      {status !== 'idle' && (
        <div
          className="mobile-only-tab-bar"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            pointerEvents: 'auto',
          }}
        >
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'card' : 'chat')}
            style={{
              padding: '10px 18px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #10d9a0, #3b82f6)',
              border: 'none',
              boxShadow: '0 6px 20px rgba(16, 217, 160, 0.4)',
              color: '#04101f',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {activeTab === 'chat' ? (
              <>
                <span>📊 View Experiment Card</span>
                <span
                  style={{
                    background: 'rgba(4, 16, 31, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                >
                  {completionPct}%
                </span>
              </>
            ) : (
              <>
                <span>💬 Back to Chat</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
