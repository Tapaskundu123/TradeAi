# 🔬 TradeAI Research — AI-Native Trading Experiment Builder

A web prototype where users describe trading ideas in natural language, and the system parses them into structured, testable experiments — asking clarifying questions when information is missing.

## Live Demo

> Deploy to Vercel with one click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## Architecture

```
User (Natural Language Question)
        │
        ▼
  Next.js Frontend (React 19 + TypeScript)
        │  POST /api/analyze
        ▼
  Route Handler  ──►  Gemini 1.5 Flash API
        │               (JSON mode, structured prompt)
        ▼              [Falls back to smart built-in parser
  Structured JSON        if no API key is set]
        │
        ▼
  Frontend renders:
    ├── ChatInterface (multi-turn conversation)
    ├── ExperimentCard (live-updating structured view)
    └── BacktestPreview (bonus: JSON schema for backtester)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Gemini 1.5 Flash + JSON mode** | Fast, free-tier accessible, enforces structured output without schema parsing hacks |
| **Multi-turn conversation** | Each API call includes full chat history so the LLM progressively fills the experiment struct — this is AI-native, not just a chatbot wrapper |
| **Smart mock fallback** | The app works without an API key using a built-in regex/heuristic parser — great for demos |
| **No database** | React `useState` is sufficient for the prototype; clean separation for future DB (Redis/Postgres) addition |
| **Split-pane layout** | Live experiment card on the right updates as conversation progresses — visually demonstrates the "structuring" happening in real time |

---

## Technologies Used

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + custom CSS (glassmorphism, animations)
- **AI/LLM**: Google Gemini 1.5 Flash via `@google/generative-ai`
- **Rendering**: React 19 (client components for the chat UI)

---

## AI Tools Used

| Tool | Purpose |
|---|---|
| **Antigravity (Gemini)** | Primary coding assistant — architecture design, component scaffolding, system prompt engineering |
| **Gemini 1.5 Flash** | Runtime LLM for parsing trading questions into structured experiments |

### What I personally designed:
- The multi-turn experiment structuring flow (not just a one-shot parse)
- The fallback mock parser logic (regex + heuristic field extraction)
- The split-pane UX showing live experiment building
- The BacktestPreview bonus schema structure

### What I reviewed / modified:
- All generated component code was reviewed and refined for correctness
- System prompt was iterated to enforce strict JSON output and proper field extraction rules
- Mock fallback was tuned to handle common trading query patterns

---

## Getting Started

### 1. Install dependencies

```bash
cd my-app
npm install
```

### 2. Configure API key (optional)

```bash
cp .env.local.example .env.local
# Edit .env.local and add your Gemini API key
# Get a free key at: https://aistudio.google.com
```

> The app works without an API key in demo mode.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How It Works

1. **User types** a natural language trading question (e.g. *"Does buying NIFTY after a 1% fall work better during high-volatility periods?"*)
2. **AI parses** the question and extracts: instrument, timeframe, entry condition, exit condition, holding period, filters, and hypothesis
3. **If information is missing** (e.g. holding period), the AI asks ONE targeted clarifying question
4. **User answers** the clarification in the same chat
5. **Once complete**, the structured experiment card is shown alongside a bonus backtest schema JSON

---

## Experiment Structure

```typescript
interface Experiment {
  instrument?: string;       // e.g. "NIFTY 50"
  timeframe?: string;        // e.g. "Daily"
  entry_condition?: string;  // e.g. "Price falls ≥ 1% on the day"
  exit_condition?: string;   // e.g. "Close of position at end of day +3"
  holding_period?: string;   // e.g. "3 days"
  filters?: string[];        // e.g. ["High volatility (VIX > 20)"]
  hypothesis?: string;       // e.g. "Does this strategy have a positive edge?"
  missing_fields?: string[]; // Fields still needing clarification
}
```

---

## What I Would Improve With More Time

1. **Real backtesting integration** — Connect the backtest schema to a VectorBT or Backtrader engine and return actual win rates, Sharpe ratio, drawdown stats
2. **Experiment persistence** — Save experiments to a database (Supabase/Postgres) with user accounts
3. **Experiment history** — Browse and compare past experiments in a sidebar
4. **Richer NLP extraction** — Use function calling / tool use to extract more nuanced conditions (e.g. RSI levels, specific date ranges)
5. **Real market data preview** — Show a quick chart preview of the instrument with entry signals marked
6. **Streaming responses** — Use Gemini's streaming API for a more responsive typing feel
7. **Mobile layout** — Tab-based layout on mobile (Chat / Experiment tabs)
8. **Experiment sharing** — Shareable links for structured experiments

---

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts         # LLM API route handler
│   ├── components/
│   │   ├── ChatInterface.tsx    # Multi-turn chat UI
│   │   ├── ExperimentCard.tsx   # Live experiment struct display
│   │   └── BacktestPreview.tsx  # Bonus: backtest schema preview
│   ├── globals.css              # Design system & animations
│   ├── layout.tsx               # Root layout + SEO metadata
│   ├── page.tsx                 # Main page — state orchestration
│   └── types.ts                 # TypeScript interfaces
├── .env.local.example           # Environment variable template
└── README.md
```
