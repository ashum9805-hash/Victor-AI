import React from 'react';
import { ChatMode } from '../types';
import { MessageSquare, Calculator, Lightbulb, Compass } from 'lucide-react';

interface PromptSuggestionsProps {
  mode: ChatMode;
  onSelectPrompt: (prompt: string) => void;
}

interface Suggestion {
  title: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const SUGGESTIONS: Record<ChatMode, Suggestion[]> = {
  casual: [
    {
      title: 'Brainstorm ideas',
      prompt: "What are some fun, creative weekend projects I can build on my phone or laptop?",
      icon: Lightbulb,
      tag: 'Creative',
    },
    {
      title: 'Casual question',
      prompt: "If you could visit any place in history for one afternoon, where would you go and why?",
      icon: Compass,
      tag: 'Discussion',
    },
    {
      title: 'Quick recommendation',
      prompt: "Give me 3 captivating sci-fi or mystery books that are hard to put down.",
      icon: MessageSquare,
      tag: 'Reading',
    },
  ],
  math: [
    {
      title: 'Quadratic Equation',
      prompt: "Solve step-by-step: 2x² + 5x - 3 = 0, and show the quadratic formula.",
      icon: Calculator,
      tag: 'Algebra',
    },
    {
      title: 'Calculus derivative',
      prompt: "Find the derivative of f(x) = (3x^2 + 1) * sin(x) using the product rule.",
      icon: Calculator,
      tag: 'Calculus',
    },
    {
      title: 'Word problem',
      prompt: "A train leaves City A at 60 mph. Two hours later, a faster train leaves City A at 90 mph on the same track. When will it catch up?",
      icon: Calculator,
      tag: 'Word Problem',
    },
  ],
  general: [
    {
      title: 'Concept explanation',
      prompt: "Explain how neural networks learn with a simple everyday metaphor.",
      icon: Lightbulb,
      tag: 'AI Concept',
    },
    {
      title: 'Code assistance',
      prompt: "Write a clean Python function to check if a word is a palindrome.",
      icon: Compass,
      tag: 'Programming',
    },
    {
      title: 'Study guide',
      prompt: "Summarize the key principles of Newton's 3 laws of motion with real-world examples.",
      icon: MessageSquare,
      tag: 'Physics',
    },
  ],
};

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  mode,
  onSelectPrompt,
}) => {
  const list = SUGGESTIONS[mode] || SUGGESTIONS.casual;

  return (
    <div id="prompt-suggestions" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-2xl mx-auto my-4">
      {list.map((item, idx) => {
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
