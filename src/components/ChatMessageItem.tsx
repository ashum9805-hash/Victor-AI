import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, RotateCcw, Bot, User, AlertCircle } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
  isLatestAssistantMessage?: boolean;
  onRegenerate?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLatestAssistantMessage = false,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`flex gap-3 sm:gap-4 p-4 rounded-2xl transition-colors ${
        isAssistant
          ? 'bg-zinc-50/80 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800'
          : 'bg-white dark:bg-zinc-950'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
          isAssistant
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
        }`}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {/* Header with sender and copy action */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
              {isAssistant ? 'Victor' : 'You'}
            </span>
            {message.mode && isAssistant && (
              <span className="text-[10px] px-1.5 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md font-medium capitalize">
                {message.mode}
              </span>
            )}
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
            <button
              id={`copy-btn-${message.id}`}
              type="button"
              onClick={handleCopy}
              title="Copy text"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {isAssistant && isLatestAssistantMessage && onRegenerate && (
              <button
                id={`retry-btn-${message.id}`}
                type="button"
                onClick={onRegenerate}
                title="Regenerate response"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Message body */}
        {message.error ? (
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.content}</span>
          </div>
        ) : isAssistant ? (
          <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code(props) {
                  const { children, className } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  return match ? (
                    <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
                        <span>{match[1]}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(codeString);
                          }}
                          className="hover:text-white transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="p-3 overflow-x-auto m-0">
                        <code>{children}</code>
                      </pre>
                    </div>
                  ) : (
                    <code className="px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 font-mono text-xs">
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="my-3 overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs sm:text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800/90 font-semibold text-zinc-900 dark:text-zinc-100 text-left">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-300">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="text-zinc-900 dark:text-zinc-100 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
};
