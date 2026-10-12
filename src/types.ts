export type ChatRole = 'user' | 'assistant';

export type ChatMode = 'casual' | 'math' | 'general';

export type VoicePersona = 'breeze' | 'cove' | 'ember' | 'juniper' | 'classic';

export type SpeakingStyle = 'conversational' | 'full';

export interface UserMemoryItem {
  id: string;
  text: string;
  createdAt: number;
  source?: 'auto' | 'manual';
}

export interface PersonalizationSettings {
  enabled: boolean;
  memories: UserMemoryItem[];
  customInstructions?: string;
}

export interface UserTask {
  id: string;
  title: string;
  category: 'projects' | 'code' | 'general' | 'personal' | 'learning' | 'college' | 'application';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  projectId?: string;
}

export interface UserNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ProjectNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AtelierProject {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  customInstructions?: string;
  notes: ProjectNote[];
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  email: string;
  name?: string;
  photoURL?: string;
  googleLinked?: boolean;
  signedInAt: number;
}

export interface ActionExecution {
  type:
    | 'add_task'
    | 'complete_task'
    | 'delete_task'
    | 'set_theme'
    | 'save_note'
    | 'save_memory'
    | 'delete_memory'
    | 'send_email'
    | 'draft_email'
    | 'read_emails'
    | 'create_doc'
    | 'create_calendar_event'
    | 'read_calendar'
    | 'save_project_note';
  title?: string;
  category?: 'projects' | 'code' | 'general' | 'personal' | 'learning' | 'college' | 'application';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  theme?: 'dark' | 'light';
  content?: string;
  fact?: string;
  to?: string;
  subject?: string;
  body?: string;
  query?: string;
  startDateTime?: string;
  endDateTime?: string;
  link?: string;
  raw?: string;
  projectId?: string;
}

export interface CodeExecutionInfo {
  language: string;
  code: string;
  outcome?: string;
  output?: string;
}

export interface GroundingSource {
  title?: string;
  uri: string;
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
  groundingSources?: GroundingSource[];
  searchQueries?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: ChatMode;
  messages: ChatMessage[];
  greetingIndex?: number;
  projectId?: string;
}

export interface MathSymbol {
  label: string;
  latex: string;
  tooltip: string;
}
