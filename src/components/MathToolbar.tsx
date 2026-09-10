import React from 'react';
import { MathSymbol } from '../types';

interface MathToolbarProps {
  onInsert: (snippet: string) => void;
}

const MATH_SYMBOLS: MathSymbol[] = [
  { label: '√x', latex: '\\sqrt{}', tooltip: 'Square Root' },
  { label: 'x²', latex: '^2', tooltip: 'Squared' },
  { label: 'xⁿ', latex: '^{}', tooltip: 'Power / Exponent' },
  { label: 'a/b', latex: '\\frac{a}{b}', tooltip: 'Fraction' },
  { label: 'π', latex: '\\pi', tooltip: 'Pi' },
  { label: '±', latex: '\\pm', tooltip: 'Plus-Minus' },
  { label: '×', latex: '\\times', tooltip: 'Multiply' },
  { label: '÷', latex: '\\div', tooltip: 'Divide' },
  { label: '≠', latex: '\\neq', tooltip: 'Not Equal' },
  { label: '≤', latex: '\\leq', tooltip: 'Less than or equal' },
  { label: '≥', latex: '\\geq', tooltip: 'Greater than or equal' },
  { label: '≈', latex: '\\approx', tooltip: 'Approximately' },
  { label: '∞', latex: '\\infty', tooltip: 'Infinity' },
  { label: '∫', latex: '\\int', tooltip: 'Integral' },
  { label: '∑', latex: '\\sum', tooltip: 'Summation' },
  { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
  { label: 'Δ', latex: '\\Delta', tooltip: 'Delta' },
];

export const MathToolbar: React.FC<MathToolbarProps> = ({ onInsert }) => {
  return (
    <div
      id="math-toolbar"
      className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none text-xs"
    >
      <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[11px] whitespace-nowrap pl-1 pr-1">
        Math keys:
      </span>
      {MATH_SYMBOLS.map((sym) => (
        <button
          key={sym.label}
          type="button"
          id={`math-key-${sym.label}`}
          title={sym.tooltip}
          onClick={() => onInsert(sym.latex)}
          className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-zinc-200 rounded-md font-mono text-xs border border-zinc-200 dark:border-zinc-700 transition-colors shrink-0 shadow-2xs"
        >
          {sym.label}
        </button>
      ))}
    </div>
  );
};
