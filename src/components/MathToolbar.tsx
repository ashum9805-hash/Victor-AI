import React, { useState } from 'react';
import { MathSymbol } from '../types';

interface MathToolbarProps {
  onInsert: (snippet: string) => void;
}

type MathCategory = 'common' | 'algebra' | 'symbols';

const CATEGORIES: { id: MathCategory; label: string; symbols: MathSymbol[] }[] = [
  {
    id: 'common',
    label: 'Common',
    symbols: [
      { label: '√x', latex: '\\sqrt{}', tooltip: 'Square Root' },
      { label: 'x²', latex: '^2', tooltip: 'Squared' },
      { label: 'xⁿ', latex: '^{}', tooltip: 'Power / Exponent' },
      { label: 'a/b', latex: '\\frac{a}{b}', tooltip: 'Fraction' },
      { label: '±', latex: '\\pm', tooltip: 'Plus-Minus' },
      { label: '×', latex: '\\times', tooltip: 'Multiply' },
      { label: '÷', latex: '\\div', tooltip: 'Divide' },
      { label: '=', latex: ' = ', tooltip: 'Equals' },
    ],
  },
  {
    id: 'algebra',
    label: 'Calculus & Algebra',
    symbols: [
      { label: '∫', latex: '\\int_{a}^{b} ', tooltip: 'Definite Integral' },
      { label: '∑', latex: '\\sum_{i=1}^{n} ', tooltip: 'Summation' },
      { label: 'd/dx', latex: '\\frac{d}{dx}', tooltip: 'Derivative' },
      { label: 'lim', latex: '\\lim_{x \\to 0} ', tooltip: 'Limit' },
      { label: '∞', latex: '\\infty', tooltip: 'Infinity' },
      { label: 'log', latex: '\\log_{10}()', tooltip: 'Logarithm' },
      { label: 'ln', latex: '\\ln()', tooltip: 'Natural Log' },
    ],
  },
  {
    id: 'symbols',
    label: 'Symbols & Greek',
    symbols: [
      { label: 'π', latex: '\\pi', tooltip: 'Pi' },
      { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
      { label: 'Δ', latex: '\\Delta', tooltip: 'Delta' },
      { label: 'α', latex: '\\alpha', tooltip: 'Alpha' },
      { label: 'β', latex: '\\beta', tooltip: 'Beta' },
      { label: '≤', latex: '\\leq', tooltip: 'Less than or equal' },
      { label: '≥', latex: '\\geq', tooltip: 'Greater than or equal' },
      { label: '≠', latex: '\\neq', tooltip: 'Not Equal' },
      { label: '≈', latex: '\\approx', tooltip: 'Approximately' },
    ],
  },
];

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert }) => {
  const [activeCategory, setActiveCategory] = useState<MathCategory>('common');

  const currentCategory =
    CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div id="math-toolbar" className="flex flex-col gap-1.5 py-1 px-1 text-xs">
      {/* Category switcher */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
              activeCategory === cat.id
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Symbol Buttons for Active Category */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {currentCategory.symbols.map((sym) => (
          <button
            key={sym.label}
            type="button"
            id={`math-key-${sym.label}`}
            title={sym.tooltip}
            aria-label={`Insert ${sym.tooltip}: ${sym.label}`}
            onClick={() => onInsert(sym.latex)}
            className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-zinc-200 rounded-lg font-mono text-xs border border-zinc-200/80 dark:border-zinc-700/80 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  );
};
