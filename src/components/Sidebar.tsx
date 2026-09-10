import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  Sparkles,
  Smartphone,
  Calculator,
  Sun,
  Moon,
  Search,
  Download,
  Upload,
  FileText,
} from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onExportAllJson: () => void;
  onExportCurrentMarkdown: () => void;
  onImportSessions: (imported: ChatSession[]) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onExportAllJson,
  onExportCurrentMarkdown,
  onImportSessions,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered sessions based on search query
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [sessions, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          onImportSessions(parsed);
        } else {
          alert('Invalid chat backup file format.');
        }
      } catch {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Hidden file input for importing JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed top-0 bottom-0 left-0 right-0 bg-black/30 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed md:static top-0 bottom-0 left-0 z-50 w-72 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & New Chat button */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            id="sidebar-new-chat-btn"
            type="button"
            aria-label="Start a new chat"
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 active:scale-98 text-sm font-medium text-white transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            id="sidebar-close-btn"
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" />
            <input
              id="sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-zinc-950/70 text-zinc-200 placeholder:text-zinc-500 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-medium tracking-wider uppercase text-zinc-400 flex items-center justify-between">
            <span>Recent Chats</span>
            <span className="text-[10px] text-zinc-500">{filteredSessions.length}</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-400">
              {searchQuery
                ? 'No chats matching your search.'
                : 'No conversations yet. Start a new chat to begin!'}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isMath = session.mode === 'math';

              return (
                <div
                  key={session.id}
                  id={`session-item-${session.id}`}
                  className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    {isMath ? (
                      <Calculator className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    )}
                    <span className="truncate">{session.title || 'Untitled Chat'}</span>
                  </button>

                  <button
                    type="button"
                    id={`delete-session-${session.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    title="Delete chat"
                    aria-label={`Delete chat: ${session.title || 'Untitled'}`}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 active:bg-zinc-700 text-zinc-400 hover:text-rose-400 active:text-rose-400 transition-all cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Data export/import actions */}
        <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-950/40 grid grid-cols-3 gap-1 text-[10px]">
          <button
            type="button"
            onClick={onExportCurrentMarkdown}
            title="Export this conversation as Markdown"
            aria-label="Export this conversation as Markdown"
            className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-800/70"
          >
            <FileText className="w-3 h-3 mb-0.5 text-sky-400" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={onExportAllJson}
            title="Backup all chats as JSON"
            aria-label="Backup all chats as JSON"
            className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-800/70"
          >
            <Download className="w-3 h-3 mb-0.5 text-emerald-400" />
            <span>Backup</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import chats from JSON backup"
            aria-label="Import chats from JSON backup"
            className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-800/70"
          >
            <Upload className="w-3 h-3 mb-0.5 text-amber-400" />
            <span>Restore</span>
          </button>
        </div>

        {/* Mobile & Cloud information note & Theme Toggle */}
        <div className="p-3 border-t border-zinc-800 text-xs bg-zinc-950/50 space-y-2.5">
          <button
            type="button"
            id="sidebar-theme-toggle"
            aria-label={`Toggle theme, current is ${theme} mode`}
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer text-xs"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Theme</span>
            </span>
            <span className="text-[11px] font-medium text-zinc-400 capitalize bg-zinc-800 px-2 py-0.5 rounded-md">
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
          </button>

          <div className="flex items-start gap-2 text-zinc-400 text-[11px] leading-relaxed">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Victor Intelligence:</span>{' '}
              Fast responses, step-by-step math solver, and conversational assistance.
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Victor · Gemini
            </span>
            <span className="text-emerald-400">Online</span>
          </div>
        </div>
      </aside>
    </>
  );
};
