import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, AnalyzeResponse, Experiment } from '@/app/types';

// ─── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI trading research assistant that converts natural language trading questions into structured experiments.

CRITICAL: You must ALWAYS respond with ONLY valid JSON. No prose, no markdown, no extra text outside the JSON object.

Your response must follow this exact schema:
{
  "status": "clarifying" | "complete",
  "experiment": {
    "instrument": "string or null — the trading instrument (e.g. NIFTY 50, BTC/USD, AAPL)",
    "timeframe": "string or null — chart timeframe (e.g. Daily, 1H, Weekly). Default to 'Daily' if instrument is known but timeframe is unspecified.",
    "entry_condition": "string or null — a clear description of when to enter the trade",
    "exit_condition": "string or null — a clear description of when to exit the trade",
    "holding_period": "string or null — how long to hold the position (e.g. 3 days, 1 week)",
    "filters": ["array of additional filter conditions"],
    "hypothesis": "string or null — what the user wants to find out or prove",
    "missing_fields": ["list of field names that are still unclear or missing"]
  },
  "clarification_question": "string or null — ask ONE focused question if status is clarifying",
  "explanation": "string or null — 1-2 sentence summary of what this experiment tests"
}

Rules:
1. Extract MAXIMUM information from the full conversation. Be smart — if a user says "after a 1% fall" that is an entry condition of "Price falls ≥ 1% on the day".
2. "High volatility" is a FILTER, not an entry condition.
3. CRITICAL fields required for status "complete": instrument, entry_condition, AND at least one of (holding_period OR exit_condition).
4. If any critical field is missing, set status to "clarifying" and ask exactly ONE targeted clarification for the most critical missing field.
5. missing_fields should list field names: "instrument", "entry_condition", "exit_condition", "holding_period", etc.
6. Never invent information not implied by the conversation.
7. Preserve all accumulated experiment info across turns — never lose previously extracted fields.`;

// ─── Smart mock for when no API key is configured ───────────────────────────
function getMockResponse(messages: ChatMessage[]): AnalyzeResponse {
  const allUser = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  const userCount = messages.filter(m => m.role === 'user').length;

  // Instrument detection
  let instrument: string | null = null;
  if (/bank\s*nifty/.test(allUser)) instrument = 'BANK NIFTY';
  else if (/nifty/.test(allUser)) instrument = 'NIFTY 50';
  else if (/btc|bitcoin/.test(allUser)) instrument = 'BTC/USD';
  else if (/eth|ethereum/.test(allUser)) instrument = 'ETH/USD';
  else if (/aapl|apple/.test(allUser)) instrument = 'AAPL';
  else if (/sensex/.test(allUser)) instrument = 'SENSEX';
  else if (/gold/.test(allUser)) instrument = 'GOLD';

  // Timeframe detection
  let timeframe = 'Daily';
  if (/hourly|1[\s-]?hour|1h\b/.test(allUser)) timeframe = '1H';
  else if (/weekly|1[\s-]?week/.test(allUser)) timeframe = 'Weekly';
  else if (/15[\s-]?min/.test(allUser)) timeframe = '15M';

  // Entry condition detection
  let entryCondition: string | null = null;
  const fallMatch = allUser.match(/falls?\s*(?:by\s*)?(?:≥\s*|>=\s*|over\s*|more\s*than\s*)?(\d+(?:\.\d+)?)\s*%/);
  const dropMatch = allUser.match(/drops?\s*(?:by\s*)?(?:≥\s*|>=\s*|over\s*|more\s*than\s*)?(\d+(?:\.\d+)?)\s*%/);
  const riseMatch = allUser.match(/rises?\s*(?:by\s*)?(?:≥\s*|>=\s*|over\s*|more\s*than\s*)?(\d+(?:\.\d+)?)\s*%/);
  const downMatch = allUser.match(/down\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%/);
  const upMatch = allUser.match(/up\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*%/);

  if (fallMatch || dropMatch || downMatch) {
    const pct = (fallMatch || dropMatch || downMatch)![1];
    entryCondition = `Price falls ≥ ${pct}% on the day`;
  } else if (riseMatch || upMatch) {
    const pct = (riseMatch || upMatch)![1];
    entryCondition = `Price rises ≥ ${pct}% on the day`;
  } else if (/crossover|cross\s+above|cross\s+above/.test(allUser)) {
    entryCondition = 'Moving average crossover signal';
  } else if (/break\s*out/.test(allUser)) {
    entryCondition = 'Breakout above resistance level';
  }

  // Holding period / exit detection
  let holdingPeriod: string | null = null;
  let exitCondition: string | null = null;
  const holdMatch = allUser.match(/(\d+)\s*(day|week|hour|session)/i);
  if (holdMatch) {
    const n = parseInt(holdMatch[1]);
    const unit = holdMatch[2].toLowerCase();
    holdingPeriod = `${n} ${unit}${n > 1 ? 's' : ''}`;
    exitCondition = `Close at end of day +${n}`;
  } else if (/next\s+day|following\s+day|day\s+after/.test(allUser)) {
    holdingPeriod = '1 day';
    exitCondition = 'Close of next trading session';
  } else if (/eod|end\s+of\s+day|close\s+of\s+day/.test(allUser)) {
    holdingPeriod = '1 day';
    exitCondition = 'Close of same trading session';
  }

  // Filters detection
  const filters: string[] = [];
  if (/high.?volat|volat.*high/.test(allUser)) filters.push('High volatility (VIX > 20)');
  if (/low.?volat|volat.*low/.test(allUser)) filters.push('Low volatility (VIX < 15)');
  if (/above\s+200|200.?sma|200.?ma/.test(allUser)) filters.push('Price above 200-day SMA');
  if (/below\s+200/.test(allUser)) filters.push('Price below 200-day SMA');
  if (/bull\s+market|uptrend/.test(allUser)) filters.push('Bullish market regime');
  if (/bear\s+market|downtrend/.test(allUser)) filters.push('Bearish market regime');
  if (/rsi/.test(allUser)) filters.push('RSI oversold condition');

  // Hypothesis
  let hypothesis: string | null = null;
  if (/better during|compare|vs\.|versus/.test(allUser)) {
    hypothesis = `Is the strategy more effective during high-volatility periods compared to normal periods?`;
  } else if (/edge|alpha|work|profitable/.test(allUser)) {
    hypothesis = instrument
      ? `Does buying ${instrument} after the specified drop produce a statistically significant positive edge?`
      : 'Does this entry strategy produce a statistically significant positive edge?';
  }

  // Determine missing fields
  const missingFields: string[] = [];
  if (!instrument) missingFields.push('instrument');
  if (!entryCondition) missingFields.push('entry_condition');
  if (!holdingPeriod && !exitCondition) {
    missingFields.push('holding_period');
    missingFields.push('exit_condition');
  }

  const criticalMissing = ['instrument', 'entry_condition', 'holding_period'].filter(f =>
    missingFields.includes(f)
  );

  if (criticalMissing.length > 0 && userCount <= 3) {
    let question = '';
    if (criticalMissing.includes('instrument')) {
      question = 'Which market or instrument would you like to test this on? For example: NIFTY 50, BANK NIFTY, BTC/USD, AAPL, or SENSEX?';
    } else if (criticalMissing.includes('entry_condition')) {
      question = 'What should trigger the entry signal? For example: a price drop of a specific percentage, a moving average crossover, or a specific price level?';
    } else {
      question = 'How long should the position be held after entry? For example: exit at the close of the same day, hold for 3 days, or use a price target / stop loss?';
    }

    return {
      status: 'clarifying',
      experiment: {
        instrument, timeframe, entry_condition: entryCondition,
        exit_condition: exitCondition, holding_period: holdingPeriod,
        filters, hypothesis, missing_fields: missingFields
      },
      clarification_question: question,
      explanation: instrument
        ? `Analyzing the statistical edge of trading ${instrument} based on the conditions you've described.`
        : 'Analyzing your trading strategy to structure it as a testable experiment.'
    };
  }

  // Complete
  return {
    status: 'complete',
    experiment: {
      instrument: instrument || 'NIFTY 50',
      timeframe,
      entry_condition: entryCondition || 'Price falls ≥ 1% on the day',
      exit_condition: exitCondition || 'Close of position at end of day +3',
      holding_period: holdingPeriod || '3 days',
      filters,
      hypothesis: hypothesis || `Does buying ${instrument || 'NIFTY 50'} after the specified entry condition produce a positive edge?`,
      missing_fields: []
    },
    explanation: `This experiment tests whether buying ${instrument || 'NIFTY 50'} after a significant price decline${filters.length > 0 ? `, filtered by ${filters.join(' and ')}` : ''}, yields positive returns over a ${holdingPeriod || '3-day'} holding period.`
  };
}

// ─── Route handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: ChatMessage[] };
    const apiKey = process.env.GEMINI_API_KEY;

    // No API key — use smart mock
    if (!apiKey) {
      const mock = getMockResponse(messages);
      return NextResponse.json(mock);
    }

    // Gemini API call with automatic fallback
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const conversationText = messages
        .map((m: ChatMessage) => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
        .join('\n');

      const prompt = `${SYSTEM_PROMPT}\n\nConversation so far:\n${conversationText}\n\nReturn the structured experiment JSON now.`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      const cleanJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed: AnalyzeResponse = JSON.parse(cleanJson);
      return NextResponse.json(parsed);
    } catch (geminiErr) {
      console.warn('Gemini API call failed, falling back to intelligent parser:', geminiErr);
      const mock = getMockResponse(messages);
      return NextResponse.json(mock);
    }
  } catch (err) {
    console.error('Analyze API request error:', err);
    return NextResponse.json(getMockResponse([]));
  }
}
