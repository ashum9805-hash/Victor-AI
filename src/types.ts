export type ChatRole = 'user' | 'assistant';

export type ChatMode = 'casual' | 'math' | 'general';

export type VoicePersona = 'breeze' | 'cove' | 'ember' | 'juniper' | 'classic';

export type SpeakingStyle = 'conversational' | 'full';

export interface UserTask {
  id: string;
  title: string;
  category: 'college' | 'code' | 'general' | 'application';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface UserNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface PersonalizationMemory {
  id: string;
  content: string;
  createdAt: number;
  category?: 'preference' | 'project' | 'background' | 'goal' | 'general';
  source?: 'manual' | 'learned';
}

export interface ActionExecution {
  type: 'add_task' | 'complete_task' | 'delete_task' | 'set_theme' | 'save_note' | 'save_memory';
  title?: string;
  category?: 'college' | 'code' | 'general' | 'application';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  theme?: 'dark' | 'light';
  content?: string;
  fact?: string;
  raw?: string;
}

export interface CodeExecutionInfo {
  language: string;
  code: string;
  outcome?: string;
  output?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  mode?: ChatMode;
  error?: boolean;
  actions?: ActionExecution[];
  codeExecutions?: CodeExecutionInfo[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: ChatMode;
  messages: ChatMessage[];
  greetingIndex?: number;
}

export interface MathSymbol {
  label: string;
  latex: string;
  tooltip: string;
}
