import React, { useState, useMemo } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  Calculator,
  Search,
  User,
  Settings,
} from 'lucide-react';
import { ChatSession, UserProfile } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenSignIn: () => void;
  onOpenSettings: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onClose,
  currentUser,
  onOpenSignIn,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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

        {/* Bottom Bar: User's name/sign-in on bottom left, little gear on bottom right */}
        <div className="p-2.5 sm:p-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-2">
          {currentUser ? (
            <button
              type="button"
              id="sidebar-user-profile-btn"
              onClick={onOpenSignIn}
              title={`Signed in as ${currentUser.email} · Click to manage account`}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 rounded-xl hover:bg-zinc-900 active:bg-zinc-800/80 transition-colors text-left cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                  {currentUser.name || currentUser.email.split('@')[0]}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">Active</span>
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              id="sidebar-signin-btn"
              onClick={onOpenSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-medium text-white transition-all shadow-xs cursor-pointer"
              title="Sign in with email to save tasks"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Gear icon button on the bottom right side, no name needed */}
          <button
            type="button"
            id="sidebar-settings-gear-btn"
            onClick={onOpenSettings}
            title="Settings (Theme, Voice, Account)"
            aria-label="Settings"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-zinc-800/80 group shrink-0"
          >
            <Settings className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </aside>
    </>
  );
};
