import React from 'react';
import { MessageSquare, Calculator, Sparkles } from 'lucide-react';
import { ChatMode } from '../types';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onSelectMode: (mode: ChatMode) => void;
  disabled?: boolean;
}

interface ModeOption {
  id: ChatMode;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const MODES: ModeOption[] = [
  {
    id: 'casual',
    title: 'Casual Chat',
    icon: MessageSquare,
    description: 'Friendly, engaging, just like ChatGPT & Gemini',
  },
  {
    id: 'math',
    title: 'Math Solver',
    icon: Calculator,
    description: 'Step-by-step formulas, LaTeX equations & proofs',
  },
  {
    id: 'general',
    title: 'General Assistant',
    icon: Sparkles,
    description: 'Q&A, writing, coding & broad explanations',
  },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div
      id="mode-selector"
      className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 gap-1 transition-colors"
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            id={`mode-btn-${mode.id}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelectMode(mode.id)}
            title={mode.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`} />
            <span className="whitespace-nowrap">{mode.title}</span>
          </button>
        );
      })}
    </div>
  );
};
