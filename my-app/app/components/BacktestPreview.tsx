'use client';

import { useState } from 'react';
import { Experiment } from '../types';

interface BacktestPreviewProps {
  experiment: Experiment;
}

function buildBacktestSchema(experiment: Experiment) {
  return {
    engine: 'TradeAI Backtester v1',
    version: '1.0',
    created_at: new Date().toISOString(),
    instrument: {
      symbol: experiment.instrument,
      exchange: experiment.instrument?.includes('NIFTY') || experiment.instrument?.includes('SENSEX') ? 'NSE' : 'AUTO',
      asset_class: experiment.instrument?.includes('BTC') || experiment.instrument?.includes('ETH') ? 'crypto' : 'equity_index',
    },
    data: {
      timeframe: experiment.timeframe || 'Daily',
      lookback_years: 10,
      data_source: 'Historical OHLCV',
      adjust_for_splits: true,
    },
    strategy: {
      entry_condition: experiment.entry_condition,
      exit_condition: experiment.exit_condition,
      holding_period: experiment.holding_period,
      filters: experiment.filters && experiment.filters.length > 0 ? experiment.filters : null,
    },
    hypothesis: experiment.hypothesis,
    metrics_requested: [
      'win_rate',
      'avg_return',
      'median_return',
      'max_drawdown',
      'sharpe_ratio',
      'profit_factor',
      'total_trades',
      'expectancy',
    ],
    segmentation: experiment.filters?.some(f => f.toLowerCase().includes('volatil'))
      ? { split_by: 'volatility_regime', regimes: ['low_vol', 'high_vol'] }
      : null,
  };
}

export default function BacktestPreview({ experiment }: BacktestPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const schema = buildBacktestSchema(experiment);

  return (
    <div style={{
      marginTop: '12px',
      background: 'rgba(13, 20, 40, 0.85)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        id="toggle-backtest-preview-btn"
        style={{
          width: '100%', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(59,130,246,0.15)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800,
            letterSpacing: '0.12em', background: 'rgba(59,130,246,0.15)',
            color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', textTransform: 'uppercase',
          }}>
            BONUS
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
            Backtest Schema Preview
          </span>
        </div>
        <span style={{ color: '#475569', fontSize: '12px', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ animation: 'fadeInUp 0.2s ease-out' }}>
          <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.04)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
              This JSON payload would be passed to a backtesting engine to evaluate your experiment historically.
            </p>
          </div>
          <pre style={{
            margin: 0,
            padding: '16px 20px',
            overflowX: 'auto',
            fontSize: '11px',
            lineHeight: 1.7,
            color: '#94a3b8',
            fontFamily: '"Geist Mono", "Fira Code", "Courier New", monospace',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <code>
              {JSON.stringify(schema, null, 2)
                .replace(/"([^"]+)":/g, (_, k) => `"<span style="color:#7dd3fc">${k}</span>":`)
              }
            </code>
          </pre>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: 1.5 }}>
              💡 A real integration would pass this schema to a vectorised backtesting engine (e.g. Backtrader, VectorBT, or a custom engine) and return statistical metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
