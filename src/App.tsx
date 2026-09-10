/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Square,
  Menu,
  Plus,
  Calculator,
  Sparkles,
  Bot,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { ChatMessage, ChatSession, ChatMode } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ModeSelector } from './components/ModeSelector';
import { MathToolbar } from './components/MathToolbar';
import { PromptSuggestions } from './components/PromptSuggestions';

const STORAGE_KEY_SESSIONS = 'ai_assistant_sessions_v1';
const STORAGE_KEY_CURRENT = 'ai_assistant_current_id_v1';

function createNewSession(mode: ChatMode = 'casual'): ChatSession {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mode,
    messages: [],
  };
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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
      if (savedId) return savedId;
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Ensure current session id is valid
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

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      if (currentSessionId) {
        localStorage.setItem(STORAGE_KEY_CURRENT, currentSessionId);
      }
    } catch {
      // Ignore storage errors
    }
  }, [sessions, currentSessionId]);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) || sessions[0];

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
    const fresh = createNewSession(mode);
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setInputPrompt('');
    setErrorBanner(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

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

  const handleModeChange = (newMode: ChatMode) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, mode: newMode } : s)),
    );
    if (newMode === 'math') {
      setShowMathToolbar(true);
    }
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
      let buffer = '';

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
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantPlaceholderId
                          ? { ...m, content: accumulatedText }
                          : m,
                      ),
                    };
                  }
                  return s;
                }),
              );
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              console.warn('Error parsing stream event', e);
            }
          }
        }
      }
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

  const handleRegenerate = () => {
    if (isGenerating || currentSession.messages.length === 0) return;
    const lastUserMessageIndex = [...currentSession.messages]
      .reverse()
      .findIndex((m) => m.role === 'user');

    if (lastUserMessageIndex === -1) return;
    const actualIndex =
      currentSession.messages.length - 1 - lastUserMessageIndex;
    const lastUserMessage = currentSession.messages[actualIndex];

    // Remove any assistant responses after this user message
    const trimmedMessages = currentSession.messages.slice(0, actualIndex);
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId ? { ...s, messages: trimmedMessages } : s,
      ),
    );

    sendMessage(lastUserMessage.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-100 text-zinc-900 font-sans antialiased overflow-hidden">
      {/* Sidebar for chat history */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onNewSession={() => handleNewSession()}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main chat view */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white shadow-xs relative">
        {/* Top navigation bar */}
        <header
          id="app-header"
          className="h-14 px-3 sm:px-5 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-10"
        >
          <div className="flex items-center gap-2.5">
            <button
              id="header-sidebar-toggle"
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
              title="Open Chat History"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm sm:text-base text-zinc-900 tracking-tight">
                Victor
              </span>
            </div>
          </div>

          {/* Mode Switcher in Header */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ModeSelector
                currentMode={currentSession?.mode || 'casual'}
                onSelectMode={handleModeChange}
                disabled={isGenerating}
              />
            </div>

            <button
              id="header-new-chat-btn"
              type="button"
              onClick={() => handleNewSession()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-xs font-medium text-zinc-800 transition-all cursor-pointer"
              title="Start a new chat session"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">New Chat</span>
            </button>
          </div>
        </header>

        {/* Mobile Mode Switcher row */}
        <div className="sm:hidden px-3 py-2 border-b border-zinc-100 bg-zinc-50 flex justify-center">
          <ModeSelector
            currentMode={currentSession?.mode || 'casual'}
            onSelectMode={handleModeChange}
            disabled={isGenerating}
          />
        </div>

        {/* Error notification banner */}
        {errorBanner && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
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
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4"
        >
          {currentSession?.messages.length === 0 ? (
            /* Empty state / Welcome screen */
            <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto py-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md mb-4">
                {currentSession.mode === 'math' ? (
                  <Calculator className="w-7 h-7" />
                ) : (
                  <Sparkles className="w-7 h-7" />
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight mb-2">
                {currentSession.mode === 'math'
                  ? 'Victor · Math Solver'
                  : currentSession.mode === 'casual'
                  ? 'Chat with Victor'
                  : 'Victor · AI Assistant'}
              </h1>

              <p className="text-sm text-zinc-600 max-w-md mb-6 leading-relaxed">
                {currentSession.mode === 'math'
                  ? 'Ask Victor equations, algebra, calculus, or word problems. Get clear step-by-step solutions with LaTeX formulas.'
                  : currentSession.mode === 'casual'
                  ? 'Chat naturally with Victor about anything on your mind, explore curiosities, or bounce ideas.'
                  : 'Ask questions, draft text, brainstorm ideas, or analyze information with fast answers from Victor.'}
              </p>

              {/* Mobile friendly reminder note */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Runs directly in the cloud. No Termux or phone setup required!</span>
              </div>

              {/* Quick suggestions */}
              <PromptSuggestions
                mode={currentSession.mode}
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
                    onRegenerate={handleRegenerate}
                  />
                );
              })}

              {isGenerating && (
                <div className="flex items-center gap-2.5 p-3 text-xs text-zinc-500 font-medium">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
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
          className="border-t border-zinc-200/80 bg-white p-3 sm:p-4 shrink-0"
        >
          <div className="max-w-3xl mx-auto">
            {/* Math symbols quick-toolbar */}
            {(showMathToolbar || currentSession?.mode === 'math') && (
              <div className="mb-2 pb-1 border-b border-zinc-100">
                <MathToolbar onInsert={handleInsertMathSymbol} />
              </div>
            )}

            {/* Input area */}
            <div className="relative flex flex-col rounded-2xl border border-zinc-300 bg-zinc-50/70 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all shadow-2xs">
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
                className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[44px] max-h-[180px] leading-relaxed"
              />

              {/* Bottom bar of input */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200/40 text-xs">
                {/* Secondary toolbar buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    id="toggle-math-symbols-btn"
                    onClick={() => setShowMathToolbar((prev) => !prev)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-[11px] ${
                      showMathToolbar || currentSession?.mode === 'math'
                        ? 'bg-zinc-200 text-zinc-900 font-medium'
                        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60'
                    }`}
                    title="Toggle Math Keyboard Toolbar"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Math Symbols</span>
                  </button>

                  <span className="text-[11px] text-zinc-400 hidden sm:inline ml-2">
                    Shift+Enter for new line
                  </span>
                </div>

                {/* Send / Stop button */}
                <div>
                  {isGenerating ? (
                    <button
                      id="stop-generation-btn"
                      type="button"
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
                      disabled={!inputPrompt.trim()}
                      onClick={() => sendMessage()}
                      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all shadow-xs ${
                        inputPrompt.trim()
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 cursor-pointer'
                          : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      }`}
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-[11px] text-zinc-500">
              Victor is powered by Gemini 3.8 Flash. Responses can be checked for accuracy.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
