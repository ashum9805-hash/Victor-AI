import React from 'react';
import { Plus, MessageSquare, Trash2, X, Sparkles, Smartphone, Calculator, Sun, Moon } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
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
  isOpen,
  onClose,
  theme,
  onToggleTheme,
}) => {
  return (
    <>
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
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 active:scale-98 text-sm font-medium text-white transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            id="sidebar-close-btn"
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-medium tracking-wider uppercase text-zinc-400">
            Recent Chats
          </div>

          {sessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-400">
              No conversations yet. Start a new chat to begin!
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isMath = session.mode === 'math';

              return (
                <div
                  key={session.id}
                  id={`session-item-${session.id}`}
                  className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-white font-medium shadow-2xs'
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

        {/* Mobile & Cloud information note & Theme Toggle */}
        <div className="p-3 border-t border-zinc-800 text-xs bg-zinc-950/50 space-y-2.5">
          <button
            type="button"
            id="sidebar-theme-toggle"
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
            <Smartphone className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Mobile Ready:</span>{' '}
              Runs directly in your browser. No Termux or Python setup needed!
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Victor · Gemini 3.8 Flash
            </span>
            <span className="text-emerald-400">Online</span>
          </div>
        </div>
      </aside>
    </>
  );
};
