export interface Experiment {
  instrument?: string | null;
  timeframe?: string | null;
  entry_condition?: string | null;
  exit_condition?: string | null;
  holding_period?: string | null;
  filters?: string[];
  hypothesis?: string | null;
  missing_fields?: string[];
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  id: string;
}

export type AppStatus = 'idle' | 'clarifying' | 'complete' | 'loading' | 'error';

export interface AnalyzeResponse {
  status: 'clarifying' | 'complete';
  experiment: Experiment;
  clarification_question?: string | null;
  explanation?: string | null;
}
