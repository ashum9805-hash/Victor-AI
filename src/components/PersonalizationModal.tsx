import React, { useState, useEffect } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Lightbulb,
} from 'lucide-react';
import { PersonalizationMemory } from '../types';
import {
  isPersonalizationEnabled,
  setPersonalizationEnabled,
  getStoredMemories,
  addStoredMemory,
  removeStoredMemory,
  clearAllStoredMemories,
} from '../utils/personalizationService';

interface PersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoriesUpdated?: () => void;
}

const QUICK_SUGGESTIONS = [
  'I mostly code in Python and TypeScript',
  'I prefer concise, direct answers with clear examples',
  'I am working on full-stack web applications',
  'I enjoy exploring cooking and recipes',
  'I like step-by-step logic and mathematical clarity',
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  isOpen,
  onClose,
  onMemoriesUpdated,
}) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [memories, setMemories] = useState<PersonalizationMemory[]>([]);
  const [newMemoryText, setNewMemoryText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEnabled(isPersonalizationEnabled());
      setMemories(getStoredMemories());
    }
  }, [isOpen]);

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    setPersonalizationEnabled(next);
    onMemoriesUpdated?.();
  };

  const handleAddMemory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newMemoryText.trim();
    if (!text) return;

    addStoredMemory(text, 'general', 'manual');
    setMemories(getStoredMemories());
    setNewMemoryText('');
    onMemoriesUpdated?.();
  };

  const handleAddQuickSuggestion = (text: string) => {
    addStoredMemory(text, 'preference', 'manual');
    setMemories(getStoredMemories());
    onMemoriesUpdated?.();
  };

  const handleDelete = (id: string) => {
    const updated = removeStoredMemory(id);
    setMemories(updated);
    onMemoriesUpdated?.();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all stored memories?')) {
      clearAllStoredMemories();
      setMemories([]);
      onMemoriesUpdated?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="personalization-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Personalization and Memory Settings"
    >
      <div
        id="personalization-modal"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Personalization & Memory</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cross-chat memory so Victor never forgets what matters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          {/* Main Toggle Switch Card */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Cross-Chat Memory
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    enabled
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                When enabled, Victor recalls your background, preferences, and projects across all chats, so you never have to repeat yourself.
              </p>
            </div>

            <button
              type="button"
              id="toggle-personalization-switch"
              onClick={handleToggle}
              className={`shrink-0 p-1 rounded-full transition-colors cursor-pointer ${
                enabled ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'
              }`}
              title={enabled ? 'Disable Personalization' : 'Enable Personalization'}
            >
              {enabled ? (
                <ToggleRight className="w-8 h-8" />
              ) : (
                <ToggleLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          {/* Add New Memory Form */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Add a Fact or Preference
            </label>
            <form onSubmit={handleAddMemory} className="flex gap-2">
              <input
                id="add-memory-input"
                type="text"
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                placeholder="E.g., I am studying Python, or I enjoy cooking pasta..."
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:border-purple-500 dark:focus:border-purple-400 outline-hidden"
              />
              <button
                type="submit"
                disabled={!newMemoryText.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Remember</span>
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="pt-1">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1 mb-1.5">
                <Lightbulb className="w-3 h-3 text-amber-400" /> Suggested preferences:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((sug, i) => {
                  const alreadySaved = memories.some((m) => m.content.toLowerCase() === sug.toLowerCase());
                  if (alreadySaved) return null;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddQuickSuggestion(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-300 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stored Memories List */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                What Victor Remembers ({memories.length})
              </span>
              {memories.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {memories.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 text-xs">
                No memories saved yet. Add something above, or say "Victor, remember that..." in your chats.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/50 flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
                        {m.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                        <span className="capitalize">{m.category || 'General'}</span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      title="Delete this memory"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex items-start gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your memories are stored privately on your device and are never shared with other users. You can add, review, or clear them anytime.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
