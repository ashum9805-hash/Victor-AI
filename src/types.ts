export type ChatRole = 'user' | 'assistant';

export type ChatMode = 'casual' | 'math' | 'general';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  mode?: ChatMode;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: ChatMode;
  messages: ChatMessage[];
}

export interface MathSymbol {
  label: string;
  latex: string;
  tooltip: string;
}
