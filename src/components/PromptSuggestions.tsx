import React from 'react';
import { Calculator, Lightbulb, Compass, Code, BookOpen } from 'lucide-react';

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

interface Suggestion {
  title: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const UNIFIED_SUGGESTIONS: Suggestion[] = [
  {
    title: 'Explore an idea',
    prompt: 'Explain quantum computing using an intuitive everyday analogy.',
    icon: Lightbulb,
    tag: 'Curiosity',
  },
  {
    title: 'Draft & create',
    prompt: 'Help me draft an engaging introduction for an article on sustainable cities.',
    icon: BookOpen,
    tag: 'Writing',
  },
  {
    title: 'Work through a problem',
    prompt: 'Solve 2x² + 5x - 3 = 0, showing each step clearly.',
    icon: Calculator,
    tag: 'Problem Solving',
  },
  {
    title: 'Code & logic',
    prompt: 'Write a clean Python function to parse and validate markdown tables.',
    icon: Code,
    tag: 'Coding',
  },
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  onSelectPrompt,
}) => {
  return (
    <div id="prompt-suggestions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full max-w-3xl mx-auto my-4">
      {UNIFIED_SUGGESTIONS.map((item, idx) => {
        const Icon = item.icon;
        return (
          <button
            key={idx}
            type="button"
            id={`suggestion-${idx}`}
            onClick={() => onSelectPrompt(item.prompt)}
            className="flex flex-col text-left p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-98 transition-all shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {item.tag}
              </span>
              <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors" />
            </div>
            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mb-1">
              {item.title}
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              "{item.prompt}"
            </p>
          </button>
        );
      })}
    </div>
  );
};
