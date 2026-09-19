/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Square,
  Menu,
  Calculator,
  Sparkles,
  Bot,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Moon,
  Mic,
  MicOff,
  CheckSquare,
  Radio,
  Download,
} from 'lucide-react';
import {
  ChatMessage,
  ChatSession,
  ChatMode,
  UserTask,
  ActionExecution,
  CodeExecutionInfo,
} from './types';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { MathToolbar } from './components/MathToolbar';
import { PromptSuggestions } from './components/PromptSuggestions';
import { TaskDrawer } from './components/TaskDrawer';
import { JarvisLiveModal } from './components/JarvisLiveModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { parseActionsFromContent } from './utils/actionParser';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  isSpeechRecognitionSupported,
} from './utils/voiceService';

const STORAGE_KEY_SESSIONS = 'ai_assistant_sessions_v1';
const STORAGE_KEY_CURRENT = 'ai_assistant_current_id_v1';
const STORAGE_KEY_THEME = 'victor_theme_mode_v1';
const STORAGE_KEY_TASKS = 'victor_tasks_v1';
const MAX_SAVED_SESSIONS = 50;

const DEFAULT_TASKS: UserTask[] = [
  {
    id: 'task_uchicago_rd',
    title: 'UChicago RD Application (Common App & Supplements)',
    category: 'college',
    priority: 'high',
    dueDate: 'Jan 2',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'task_kaist_intl',
    title: 'KAIST International Application Profile & Document Check',
    category: 'college',
    priority: 'high',
    dueDate: 'Jan 15',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'task_py_fcc',
    title: 'freeCodeCamp Python Track: Data Structures & Algorithms',
    category: 'code',
    priority: 'high',
    completed: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: 'task_victor_pwa',
    title: 'Victor-AI PWA & Jarvis Autonomous Engine Deployment',
    category: 'code',
    priority: 'high',
    completed: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    completedAt: Date.now(),
  },
];

export interface WelcomeGreeting {
  headline: string;
  subtitle: string;
}

export const WELCOME_GREETINGS: WelcomeGreeting[] = [
  {
    headline: "What's on your mind?",
    subtitle: "Ask a question, brainstorm an idea, or start a new thread.",
  },
  {
    headline: "Where should we begin?",
    subtitle: "Explore a concept, work through a problem, or draft your thoughts.",
  },
  {
    headline: "What are you curious about today?",
    subtitle: "From quick questions to deep dives, let's explore it together.",
  },
  {
    headline: "Ready when you are.",
    subtitle: "Got a question, thought, or project you want to untangle?",
  },
  {
    headline: "What would you like to explore?",
    subtitle: "Bring your ideas, questions, or challenges to solve.",
  },
  {
    headline: "How can I help today?",
    subtitle: "Bounce ideas around, clarify complex topics, or create something new.",
  },
  {
    headline: "What are we working on?",
    subtitle: "Draft, analyze, calculate, or just chat through what's on your mind.",
  },
  {
    headline: "Got a spark of an idea?",
    subtitle: "Let's flesh it out, run through the details, and see where it leads.",
  },
];

function getRandomGreetingIndex(excludeIndex?: number): number {
  if (WELCOME_GREETINGS.length <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * WELCOME_GREETINGS.length);
  } while (idx === excludeIndex);
  return idx;
}

function getGreetingForSession(session?: ChatSession | null): WelcomeGreeting {
  if (!session) return WELCOME_GREETINGS[0];
  if (typeof session.greetingIndex === 'number') {
    return WELCOME_GREETINGS[session.greetingIndex % WELCOME_GREETINGS.length];
  }
  let hash = 0;
  for (let i = 0; i < session.id.length; i++) {
    hash = (hash * 31 + session.id.charCodeAt(i)) & 0x7fffffff;
  }
  return WELCOME_GREETINGS[hash % WELCOME_GREETINGS.length];
}

function createNewSession(mode: ChatMode = 'casual', previousGreetingIndex?: number): ChatSession {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode,
    messages: [],
    greetingIndex: getRandomGreetingIndex(previousGreetingIndex),
  };
}

// Helper to save sessions safely with quota management
function safelyPersistSessions(sessions: ChatSession[]) {
  try {
    const capped = sessions.slice(0, MAX_SAVED_SESSIONS);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(capped));
  } catch (err) {
    console.warn('localStorage quota exceeded. Pruning older sessions...', err);
    try {
      // Retain only 20 newest sessions on storage error
      const pruned = sessions.slice(0, 20);
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(pruned));
    } catch {
      // Quota completely exhausted, cannot persist
    }
  }
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, MAX_SAVED_SESSIONS);
        }
      }
    } catch {
      // Fallback
    }
    return [createNewSession('casual')];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CURRENT);
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (savedId && parsed.some((s: any) => s.id === savedId)) {
            return savedId;
          }
          return parsed[0].id;
        }
      }
    } catch {
      // Fallback
    }
    return '';
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMathToolbar, setShowMathToolbar] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Jarvis Missions & Tasks State
  const [tasks, setTasks] = useState<UserTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_TASKS;
  });

  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const speechStopRef = useRef<(() => void) | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // Ignore
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync with server sessions on mount to guarantee chats persist across tab closes, new tabs, and incognito sessions
  useEffect(() => {
    let active = true;
    const loadServerSessions = async () => {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions((localSessions) => {
            const hasLocalMessages = localSessions.some((s) => s.messages.length > 0);
            if (!hasLocalMessages) {
              // Local is empty/clean, restore full history from server
              safelyPersistSessions(data.sessions);
              return data.sessions;
            }
            // Merge server and local without duplicate IDs
            const localMap = new Map(localSessions.map((s) => [s.id, s]));
            for (const serverS of data.sessions as ChatSession[]) {
              if (!localMap.has(serverS.id)) {
                localMap.set(serverS.id, serverS);
              }
            }
            const merged = Array.from(localMap.values()).slice(0, MAX_SAVED_SESSIONS);
            safelyPersistSessions(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Could not sync sessions with server:', err);
      }
    };

    loadServerSessions();
    return () => {
      active = false;
    };
  }, []);

  // Sync tasks with server on mount
  useEffect(() => {
    let active = true;
    const loadTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.tasks) && data.tasks.length > 0) {
          setTasks(data.tasks);
          try {
            localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(data.tasks));
          } catch {
            // Ignore
          }
        }
      } catch (e) {
        console.warn('Could not sync tasks from server:', e);
      }
    };
    loadTasks();
    return () => {
      active = false;
    };
  }, []);

  const persistTasks = (newTasks: UserTask[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(newTasks));
    } catch {
      // Ignore
    }
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: newTasks }),
    }).catch((e) => console.warn('Could not save tasks to server:', e));
  };

  const handleAddTask = (newTask: Omit<UserTask, 'id' | 'createdAt' | 'completed'>) => {
    const task: UserTask = {
      ...newTask,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      createdAt: Date.now(),
      completed: false,
    };
    persistTasks([task, ...tasks]);
  };

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t
    );
    persistTasks(updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    persistTasks(updated);
  };

  const handleClearCompleted = () => {
    const updated = tasks.filter((t) => !t.completed);
    persistTasks(updated);
  };

  const executeActions = (actions: ActionExecution[]) => {
    if (!actions || actions.length === 0) return;
    setTasks((prev) => {
      let current = [...prev];
      for (const act of actions) {
        if (act.type === 'add_task' && act.title) {
          const newTask: UserTask = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: act.title,
            category: act.category || 'general',
            priority: act.priority || 'medium',
            dueDate: act.dueDate,
            completed: false,
            createdAt: Date.now(),
          };
          current = [newTask, ...current];
        } else if (act.type === 'complete_task' && act.title) {
          const kw = act.title.toLowerCase();
          current = current.map((t) =>
            t.title.toLowerCase().includes(kw)
              ? { ...t, completed: true, completedAt: Date.now() }
              : t
          );
        } else if (act.type === 'delete_task' && act.title) {
          const kw = act.title.toLowerCase();
          current = current.filter((t) => !t.title.toLowerCase().includes(kw));
        } else if (act.type === 'set_theme' && act.theme) {
          setTheme(act.theme);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(current));
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: current }),
        }).catch(() => {});
      } catch {
        // Ignore
      }
      return current;
    });
  };

  // Ensure current session id is always valid
  useEffect(() => {
    if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
      if (sessions.length > 0) {
        setCurrentSessionId(sessions[0].id);
      } else {
        const fresh = createNewSession('casual');
        setSessions([fresh]);
        setCurrentSessionId(fresh.id);
      }
    }
  }, [sessions, currentSessionId]);

  // Persist sessions to both localStorage AND server whenever modified
  useEffect(() => {
    safelyPersistSessions(sessions);
    if (currentSessionId) {
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT, currentSessionId);
      } catch {
        // Ignore
      }
    }

    // Debounced sync to server
    const timer = setTimeout(() => {
      if (sessions.length > 0 && sessions.some((s) => s.messages.length > 0)) {
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: sessions.slice(0, MAX_SAVED_SESSIONS) }),
        }).catch(() => {
          // Background sync fail silent
        });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [sessions, currentSessionId]);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0];

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K for new chat, Esc to close modals)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: New Chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewSession();
      }
      // Escape: Close sidebar or error banner
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        setErrorBanner(null);
      }
      // Ctrl+/ or Cmd+/: Focus chat textarea
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Auto-scroll when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isGenerating]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`;
    }
  };

  const handleNewSession = (mode: ChatMode = currentSession?.mode || 'casual') => {
    if (isGenerating) {
      handleStopGeneration();
    }
    const fresh = createNewSession(mode, currentSession?.greetingIndex);
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setInputPrompt('');
    setErrorBanner(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleShuffleGreeting = () => {
    if (!currentSession || currentSession.messages.length > 0) return;
    const nextIdx = getRandomGreetingIndex(currentSession.greetingIndex);
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? { ...s, greetingIndex: nextIdx } : s))
    );
  };

  const currentGreeting = useMemo(() => {
    return getGreetingForSession(currentSession);
  }, [currentSession]);

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewSession('casual');
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (currentSessionId === id) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleInsertMathSymbol = (snippet: string) => {
    if (!textareaRef.current) {
      setInputPrompt((prev) => prev + snippet);
      return;
    }
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const before = inputPrompt.substring(0, start);
    const after = inputPrompt.substring(end);
    const updated = before + snippet + after;
    setInputPrompt(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = start + snippet.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const sendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? inputPrompt).trim();
    if (!textToSend || isGenerating) return;

    setErrorBanner(null);
    setInputPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId =
      'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 6);

    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode: currentSession.mode,
    };

    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle = isFirstMessage
      ? textToSend.slice(0, 36) + (textToSend.length > 36 ? '...' : '')
      : currentSession.title;

    const updatedMessages = [...currentSession.messages, userMessage];

    // Update session with user message and empty assistant placeholder
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            title: newTitle,
            updatedAt: Date.now(),
            messages: [...updatedMessages, assistantMessage],
          };
        }
        return s;
      }),
    );

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode: currentSession.mode,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported by server');
      }

      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let accumulatedCodeExecutions: CodeExecutionInfo[] = [];
      let buffer = '';
      let rafId: number | null = null;
      let lastFlushedLength = 0;

      // Batch state updates to 60fps display refresh instead of on every 2-character chunk
      const flushUpdate = () => {
        if (accumulatedText.length === lastFlushedLength) return;
        lastFlushedLength = accumulatedText.length;
        const currentText = accumulatedText;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        content: currentText,
                        codeExecutions:
                          accumulatedCodeExecutions.length > 0
                            ? [...accumulatedCodeExecutions]
                            : undefined,
                      }
                    : m,
                ),
              };
            }
            return s;
          }),
        );
      };

      const scheduleFlush = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          flushUpdate();
        });
      };

      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataContent = trimmed.slice(5).trim();
          if (dataContent === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.error) {
              streamError = parsed.error;
              break;
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              scheduleFlush();
            }
            if (parsed.executableCode) {
              accumulatedCodeExecutions.push({
                language: parsed.executableCode.language || 'python',
                code: parsed.executableCode.code || '',
              });
              scheduleFlush();
            }
            if (parsed.codeExecutionResult) {
              if (accumulatedCodeExecutions.length > 0) {
                const last =
                  accumulatedCodeExecutions[accumulatedCodeExecutions.length - 1];
                last.outcome = parsed.codeExecutionResult.outcome;
                last.output = parsed.codeExecutionResult.output;
              }
              scheduleFlush();
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              console.warn('Error parsing stream event', e);
            }
          }
        }

        if (streamError) {
          break;
        }
      }

      if (streamError) {
        throw new Error(streamError);
      }

      // Ensure final complete text is always flushed
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushUpdate();

      // Guard against silent empty stream
      if (!accumulatedText.trim()) {
        throw new Error("Victor was unable to complete the response. Please retry.");
      }

      // Parse and execute Jarvis Actions
      const { actions } = parseActionsFromContent(accumulatedText);
      if (actions.length > 0) {
        executeActions(actions);
      }

      // Finalize message state with actions and code execution
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content: accumulatedText,
                      actions: actions.length > 0 ? actions : undefined,
                      codeExecutions:
                        accumulatedCodeExecutions.length > 0
                          ? accumulatedCodeExecutions
                          : undefined,
                    }
                  : m,
              ),
            };
          }
          return s;
        }),
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted intentionally
      } else {
        console.error('Chat generation error:', err);
        const errorMsg =
          err?.message || 'Failed to generate response. Please try again.';
        setErrorBanner(errorMsg);

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantPlaceholderId
                    ? {
                        ...m,
                        content: `Error: ${errorMsg}`,
                        error: true,
                      }
                    : m,
                ),
              };
            }
            return s;
          }),
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate response at any specific assistant message
  const handleRegenerateAt = (messageId: string) => {
    if (isGenerating || !currentSession) return;
    const targetIdx = currentSession.messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    // Find the user message preceding this message
    let precedingUserIdx = -1;
    for (let i = targetIdx - 1; i >= 0; i--) {
      if (currentSession.messages[i].role === 'user') {
        precedingUserIdx = i;
        break;
      }
    }

    if (precedingUserIdx === -1) return;
    const userPrompt = currentSession.messages[precedingUserIdx].content;

    // Truncate messages up to the user message
    const trimmedMessages = currentSession.messages.slice(0, precedingUserIdx);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId ? { ...s, messages: trimmedMessages } : s,
      ),
    );

    sendMessage(userPrompt);
  };

  // Edit an existing user message
  const handleEditUserMessage = (content: string) => {
    setInputPrompt(content);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200,
      )}px`;
    }
  };

  // Export current conversation to Markdown
  const handleExportCurrentMarkdown = () => {
    if (!currentSession || currentSession.messages.length === 0) {
      alert('No messages to export in this conversation.');
      return;
    }

    const title = currentSession.title || 'Victor Conversation';
    const dateStr = new Date(currentSession.createdAt).toLocaleString();
    let md = `# ${title}\n*Exported from Victor on ${dateStr}*\n\n---\n\n`;

    for (const msg of currentSession.messages) {
      const sender = msg.role === 'assistant' ? 'Victor' : 'You';
      md += `### ${sender} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    link.href = url;
    link.download = `${safeName || 'conversation'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Backup all conversations as JSON
  const handleExportAllJson = () => {
    const jsonStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `victor-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Live Mode Voice Query Handler for JarvisLiveModal
  const handleLiveQuery = async (query: string): Promise<string> => {
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    const updatedMessages = [...(currentSession?.messages || []), userMessage];

    const res = await fetch('/api/chat/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Could not get response from Victor');
    }

    const data = await res.json();
    const replyText = data.text || '';
    const { cleanContent, actions } = parseActionsFromContent(replyText);

    if (actions.length > 0) {
      executeActions(actions);
    }

    const asstMessage: ChatMessage = {
      id: 'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 6),
      role: 'assistant',
      content: replyText,
      timestamp: Date.now(),
      actions: actions.length > 0 ? actions : undefined,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: [...updatedMessages, asstMessage],
          };
        }
        return s;
      }),
    );

    return cleanContent || replyText;
  };

  // Speech-to-text input toggle for textarea
  const handleToggleMicInput = () => {
    if (isMicListening) {
      if (speechStopRef.current) {
        speechStopRef.current();
        speechStopRef.current = null;
      }
      stopSpeechRecognition();
      setIsMicListening(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        setErrorBanner('Speech recognition is not supported in this browser. Please use Chrome or Safari.');
        return;
      }
      setIsMicListening(true);
      const stopFn = startSpeechRecognition({
        onTranscript: (finalText) => {
          setInputPrompt((prev) => (prev ? prev + ' ' + finalText : finalText));
        },
        onEnd: () => {
          setIsMicListening(false);
          speechStopRef.current = null;
        },
        onError: (err) => {
          console.warn('Speech error:', err);
          setIsMicListening(false);
          speechStopRef.current = null;
        },
      });
      speechStopRef.current = stopFn;
    }
  };

  // Restore imported conversations
  const handleImportSessions = (imported: ChatSession[]) => {
    setSessions((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newItems = imported.filter((s) => !existingIds.has(s.id));
      return [...newItems, ...prev];
    });
    if (imported.length > 0) {
      setCurrentSessionId(imported[0].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-app-root flex w-full h-full absolute top-0 bottom-0 left-0 right-0 bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden transition-colors">
      {/* Sidebar for chat history */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onNewSession={() => handleNewSession()}
        onDeleteSession={handleDeleteSession}
        onExportAllJson={handleExportAllJson}
        onExportCurrentMarkdown={handleExportCurrentMarkdown}
        onImportSessions={handleImportSessions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
      />

      {/* Main chat view */}
      <div className="chat-view-container flex-1 flex flex-col w-full h-full min-h-0 min-w-0 bg-white dark:bg-zinc-950 shadow-xs relative transition-colors overflow-hidden">
        {/* Top navigation bar */}
        <header
          id="app-header"
          className="h-14 shrink-0 px-3 sm:px-5 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-2 z-10 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <button
              id="header-sidebar-toggle"
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              title="Open Chat History"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                Victor
              </span>
            </div>
          </div>

          {/* Controls: Live Voice, Missions, Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Live Voice Button */}
            <button
              id="header-live-voice-btn"
              type="button"
              onClick={() => setIsLiveModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-medium active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Open Live Voice Conversation"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-500" />
              <span>Live Voice</span>
            </button>

            {/* Mission Board & Tasks Button */}
            {(() => {
              const pendingCount = tasks.filter((t) => !t.completed).length;
              return (
                <button
                  id="header-tasks-btn"
                  type="button"
                  onClick={() => setIsTaskDrawerOpen(true)}
                  className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer"
                  title="Open Missions & Tasks"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Missions</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white leading-none">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Dark / Light Theme Toggle Button */}
            <button
              id="header-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 active:scale-95 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              )}
            </button>
          </div>
        </header>

        {/* Error notification banner */}
        {errorBanner && (
          <div className="shrink-0 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="font-semibold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat Feed */}
        <main
          id="chat-feed-container"
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
        >
          {currentSession?.messages.length === 0 ? (
            /* Empty state / Welcome screen */
            <div className="flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto py-4 sm:py-8 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-md mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="group relative inline-flex items-center justify-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {currentGreeting.headline}
                </h1>
                <button
                  type="button"
                  onClick={handleShuffleGreeting}
                  title="Shuffle prompt"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  aria-label="Shuffle greeting"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-md mb-5 leading-relaxed">
                {currentGreeting.subtitle}
              </p>

              {/* AI Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Victor · Powered by Gemini</span>
              </div>

              {/* Quick suggestions */}
              <PromptSuggestions
                onSelectPrompt={(prompt) => sendMessage(prompt)}
              />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-3">
              {currentSession.messages.map((message, idx) => {
                const isLatestAssistant =
                  message.role === 'assistant' &&
                  idx === currentSession.messages.length - 1;

                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    isLatestAssistantMessage={isLatestAssistant}
                    onRegenerate={handleRegenerateAt}
                    onEditUserMessage={handleEditUserMessage}
                  />
                );
              })}

              {isGenerating && (
                <div className="flex items-center gap-2.5 p-3 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Thinking and drafting response...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Bar Section */}
        <footer
          id="chat-input-footer"
          className="mt-auto shrink-0 w-full border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-colors z-10"
        >
          <div className="max-w-3xl mx-auto">
            {/* Math symbols quick-toolbar */}
            {(showMathToolbar || currentSession?.mode === 'math') && (
              <div className="mb-2 pb-1 border-b border-zinc-100 dark:border-zinc-850">
                <MathToolbar onInsert={handleInsertMathSymbol} />
              </div>
            )}

            {/* Input area */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 focus-within:border-zinc-900 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-zinc-700/20 transition-all shadow-xs">
              <textarea
                ref={textareaRef}
                id="prompt-textarea"
                rows={1}
                value={inputPrompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentSession?.mode === 'math'
                    ? 'Ask Victor a math problem (e.g. solve 3x + 12 = 45 or integrate x*e^x)...'
                    : 'Message Victor (e.g. chat, ask a question, brainstorm)...'
                }
                className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none min-h-[44px] max-h-[180px] leading-relaxed"
              />

              {/* Bottom bar of input */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200/40 dark:border-zinc-800/80 text-xs">
                {/* Secondary toolbar buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    id="toggle-math-symbols-btn"
                    aria-label="Toggle Math Keyboard Toolbar"
                    onClick={() => setShowMathToolbar((prev) => !prev)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-[11px] cursor-pointer ${
                      showMathToolbar || currentSession?.mode === 'math'
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                    }`}
                    title="Toggle Math Keyboard Toolbar"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Math Symbols</span>
                  </button>

                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline ml-2">
                    Shift+Enter for new line · Ctrl+K for new chat
                  </span>
                </div>

                {/* Voice Input & Send / Stop button */}
                <div className="flex items-center gap-1.5">
                  <button
                    id="mic-speech-input-btn"
                    type="button"
                    aria-label={isMicListening ? 'Stop listening voice' : 'Dictate with voice'}
                    onClick={handleToggleMicInput}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer ${
                      isMicListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                    }`}
                    title={isMicListening ? 'Listening... click to stop' : 'Voice dictation (Speech-to-text)'}
                  >
                    {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {isGenerating ? (
                    <button
                      id="stop-generation-btn"
                      type="button"
                      aria-label="Stop generating response"
                      onClick={handleStopGeneration}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <button
                      id="send-message-btn"
                      type="button"
                      aria-label="Send message to Victor"
                      disabled={!inputPrompt.trim()}
                      onClick={() => sendMessage()}
                      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all shadow-xs ${
                        inputPrompt.trim()
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 cursor-pointer'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                      }`}
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              Victor is powered by Gemini · Check responses for accuracy.
            </div>
          </div>
        </footer>
      </div>

      {/* PWA Install Banner */}
      <PWAInstallBanner />

      {/* Jarvis Missions & Task Drawer */}
      <TaskDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        tasks={tasks}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={handleAddTask}
        onClearCompleted={handleClearCompleted}
      />

      {/* Jarvis Full-Screen Live Voice HUD Modal */}
      <JarvisLiveModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        onSendMessage={handleLiveQuery}
      />

      {/* Voice & Conversational Speech Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
      />
    </div>
  );
}
