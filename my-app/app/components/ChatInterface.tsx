'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { ChatMessage, AppStatus } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  status: AppStatus;
}

interface ExamplePrompt {
  category: string;
  icon: string;
  badgeColor: string;
  question: string;
  tag: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    category: 'Index Dip',
    icon: '📉',
    badgeColor: 'rgba(59, 130, 246, 0.18)',
    question: 'Does buying NIFTY after a 1% fall work better during high-volatility periods?',
    tag: 'NIFTY 50 · Volatility',
  },
  {
    category: 'Crypto Momentum',
    icon: '⚡',
    badgeColor: 'rgba(234, 179, 8, 0.18)',
    question: 'Is there an edge in buying BTC after a 5% weekly drop?',
    tag: 'BTC · Weekly Mean Reversion',
  },
  {
    category: 'Index Gap Play',
    icon: '🏦',
    badgeColor: 'rgba(16, 217, 160, 0.18)',
    question: 'Does BANK NIFTY outperform when it gaps down more than 0.5% at open?',
    tag: 'Bank Nifty · Intraday Gaps',
  },
  {
    category: 'Technical Filter',
    icon: '📊',
    badgeColor: 'rgba(139, 92, 246, 0.18)',
    question: 'Does buying NIFTY when RSI(14) drops below 28 have a positive 5-day expectancy?',
    tag: 'RSI Filter · 5-Day Holding',
  },
];

const SUGGESTED_QUICK_REPLIES = [
  '⏱️ Hold for 5 trading days',
  '🛡️ 2% stop loss & 4% target',
  '📅 Daily timeframe',
  '⚡ High volatility (VIX > 18)',
  '📈 Exit when 20 EMA is crossed',
];

// Simple markdown formatter
function renderFormattedContent(content: string) {
  const lines = content.split('\n');

  return lines.map((line, lineIdx) => {
    // Bullet point
    const isBullet = line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const cleanLine = isBullet ? line.trim().replace(/^[•\-*]\s+/, '') : line;

    // Parse bold **text** and code `text`
    const parts = cleanLine.split(/(\*\*.*?\*\*|`.*?`)/g);

    const formattedParts = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIdx} style={{ color: '#f8fafc', fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={partIdx}
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.08)',
              color: '#10d9a0',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '3px 0' }}>
          <span style={{ color: '#10d9a0', fontSize: '14px', lineHeight: 1.6 }}>•</span>
          <span style={{ flex: 1 }}>{formattedParts}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} style={{ minHeight: cleanLine ? 'auto' : '8px' }}>
        {formattedParts}
      </div>
    );
  });
}

function MessageBubble({
  message,
  onCopy,
  isCopied,
}: {
  message: ChatMessage;
  onCopy: (text: string, id: string) => void;
  isCopied: boolean;
}) {
  const isUser = message.role === 'user';
  const time = useMemo(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: '4px',
        animation: 'fadeInUp 0.3s ease-out',
        maxWidth: '100%',
      }}
    >
      {/* Sender Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 4px',
          fontSize: '11px',
          color: '#64748b',
        }}
      >
        <span style={{ fontWeight: 600, color: isUser ? '#c4b5fd' : '#10d9a0' }}>
          {isUser ? 'Trader' : 'TradeAI Research'}
        </span>
        <span>·</span>
        <span>{time}</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          gap: '8px',
          width: '100%',
        }}
      >
        {!isUser && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10d9a0, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              flexShrink: 0,
              boxShadow: '0 2px 10px rgba(16, 217, 160, 0.25)',
            }}
          >
            🔬
          </div>
        )}

        {/* Message bubble body */}
        <div
          style={{
            maxWidth: 'min(88%, 680px)',
            position: 'relative',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: isUser
                ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
                : 'rgba(15, 23, 42, 0.85)',
              border: isUser ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: isUser
                ? '0 4px 20px rgba(124, 58, 237, 0.25)'
                : '0 4px 20px rgba(0, 0, 0, 0.25)',
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#f1f5f9',
              wordBreak: 'break-word',
            }}
          >
            {renderFormattedContent(message.content)}
          </div>

          {/* Quick copy icon */}
          <button
            onClick={() => onCopy(message.content, message.id)}
            title="Copy message"
            style={{
              position: 'absolute',
              top: '6px',
              right: isUser ? 'auto' : '-32px',
              left: isUser ? '-32px' : 'auto',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isCopied ? '#10d9a0' : '#94a3b8',
              fontSize: '11px',
              transition: 'all 0.2s ease',
              opacity: 0.7,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.7';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            }}
          >
            {isCopied ? '✓' : '📋'}
          </button>
        </div>

        {isUser && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0,
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.25)',
            }}
          >
            👤
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatInterface({ messages, onSendMessage, isLoading, status }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isIdle = status === 'idle';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle scroll detection for "scroll to bottom" button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isUp);
  };

  const handleSend = (text?: string) => {
    const toSend = text || input;
    const trimmed = toSend.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    onSendMessage(trimmed);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'rgba(10, 18, 36, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* ── Chat Header ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(6, 11, 24, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10d9a0',
              boxShadow: '0 0 10px #10d9a0',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
              Research Chat Assistant
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {isIdle
                ? 'Ready for your trading question'
                : status === 'clarifying'
                ? 'Clarifying missing experiment parameters'
                : status === 'complete'
                ? 'Experiment parameters locked'
                : 'Formulating structured hypothesis…'}
            </span>
          </div>
        </div>

        {/* Status Indicator Chip */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <span>💬</span>
          <span>{messages.length} messages</span>
        </div>
      </div>

      {/* ── Messages Container (with prominent vertical scrollbar) ── */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="custom-scrollbar"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Welcome Empty State */}
        {isIdle && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              padding: '24px 8px',
              textAlign: 'center',
              gap: '24px',
            }}
          >
            <div style={{ maxWidth: '440px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(16, 217, 160, 0.15), rgba(59, 130, 246, 0.15))',
                  border: '1px solid rgba(16, 217, 160, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  margin: '0 auto 16px auto',
                  boxShadow: '0 8px 24px rgba(16, 217, 160, 0.1)',
                }}
              >
                🧠
              </div>
              <h3
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#f8fafc',
                  letterSpacing: '-0.02em',
                }}
              >
                What market hypothesis would you like to test?
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                }}
              >
                Describe any setup, technical rule, or price anomaly in natural language.
                The assistant structures it into an institutional-grade backtest experiment.
              </p>
            </div>

            {/* Prompt Cards Grid */}
            <div style={{ width: '100%', maxWidth: '640px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  padding: '0 4px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  Example Hypotheses (Click to test)
                </span>
                <span style={{ fontSize: '11px', color: '#475569' }}>1-Click Load</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '10px',
                }}
              >
                {EXAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(prompt.question)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      color: '#cbd5e1',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'rgba(139, 92, 246, 0.08)';
                      el.style.borderColor = 'rgba(139, 92, 246, 0.35)';
                      el.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = 'rgba(255, 255, 255, 0.02)';
                      el.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                      el.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                        <span>{prompt.icon}</span>
                        <span>{prompt.category}</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: prompt.badgeColor,
                          color: '#e2e8f0',
                          fontWeight: 500,
                        }}
                      >
                        {prompt.tag}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.4 }}>
                      &ldquo;{prompt.question}&rdquo;
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            message={m}
            onCopy={handleCopy}
            isCopied={copiedId === m.id}
          />
        ))}

        {/* Contextual Quick Reply Chips (Only show during clarifying phase) */}
        {status === 'clarifying' && !isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              margin: '6px 0 6px 40px',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Suggested Quick Answers:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTED_QUICK_REPLIES.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(reply.replace(/^[^\s]+\s*/, ''))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: 'rgba(16, 217, 160, 0.08)',
                    border: '1px solid rgba(16, 217, 160, 0.25)',
                    color: '#6ee7b7',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16, 217, 160, 0.18)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(16, 217, 160, 0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16, 217, 160, 0.08)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(16, 217, 160, 0.25)';
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing Loading Indicator */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
              animation: 'fadeInUp 0.2s ease-out',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10d9a0, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                flexShrink: 0,
              }}
            >
              🔬
            </div>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Structuring experiment</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#10d9a0',
                      animation: 'pulseDot 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completed Experiment Notice */}
        {status === 'complete' && !isLoading && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16,217,160,0.1), rgba(59,130,246,0.06))',
              border: '1px solid rgba(16,217,160,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'fadeInUp 0.4s ease-out',
            }}
          >
            <div style={{ fontSize: '24px' }}>🎯</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#10d9a0' }}>
                Experiment Fully Structured
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                All mandatory parameters identified. Review the parameters card on the right.
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '24px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          ↓
        </button>
      )}

      {/* ── Input Box ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(6, 11, 24, 0.75)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '8px 12px',
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={
              status === 'clarifying'
                ? 'Answer the clarification question or provide parameters…'
                : status === 'complete'
                ? 'Ask to refine this setup or test another hypothesis…'
                : 'Ask a trading question in plain English (e.g. "Does buying NIFTY after a 1% dip work?")…'
            }
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: '#f1f5f9',
              fontSize: '14px',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              minHeight: '26px',
              maxHeight: '120px',
            }}
          />

          {/* Clear input button */}
          {input && (
            <button
              onClick={() => setInput('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '4px',
                alignSelf: 'center',
              }}
              title="Clear input"
            >
              ✕
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            id="send-message-btn"
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              flexShrink: 0,
              background:
                !input.trim() || isLoading
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'linear-gradient(135deg, #10d9a0, #3b82f6)',
              border: 'none',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: !input.trim() || isLoading ? '#475569' : '#04101f',
              fontWeight: 700,
              fontSize: '17px',
              transition: 'all 0.2s ease',
              boxShadow:
                input.trim() && !isLoading ? '0 2px 12px rgba(16, 217, 160, 0.35)' : 'none',
            }}
          >
            ↑
          </button>
        </div>

        {/* Input Helper Bar */}
        <div
          style={{
            marginTop: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#475569',
            padding: '0 4px',
          }}
        >
          <span>
            <strong style={{ color: '#64748b' }}>Enter ↵</strong> to send · <strong style={{ color: '#64748b' }}>Shift+Enter</strong> for newline
          </span>
          {input.length > 0 && <span>{input.length} characters</span>}
        </div>
      </div>
    </div>
  );
}
