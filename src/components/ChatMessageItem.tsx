import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  Pencil,
  Volume2,
  VolumeX,
  Terminal,
  CheckSquare,
  Brain,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { speakText, stopSpeaking, isSpeechSynthesisSupported } from '../utils/voiceService';
import { parseActionsFromContent } from '../utils/actionParser';

interface ChatMessageItemProps {
  message: ChatMessage;
  isLatestAssistantMessage?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEditUserMessage?: (content: string) => void;
  onOpenTaskBoard?: () => void;
  onOpenPersonalization?: () => void;
}

export const ChatMessageItem = React.memo<ChatMessageItemProps>(
  ({ message, onRegenerate, onEditUserMessage, onOpenTaskBoard, onOpenPersonalization }) => {
    const [copied, setCopied] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const isAssistant = message.role === 'assistant';

    const { cleanContent, actions } = useMemo(() => {
      if (!isAssistant) return { cleanContent: message.content, actions: [] };
      const parsed = parseActionsFromContent(message.content);
      const combinedActions = [...(message.actions || []), ...parsed.actions];
      return { cleanContent: parsed.cleanContent, actions: combinedActions };
    }, [message.content, message.actions, isAssistant]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(cleanContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    };

    const handleToggleSpeech = () => {
      if (isSpeaking) {
        stopSpeaking();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        speakText(cleanContent, {
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    };

  return (
    <div
      id={`message-${message.id}`}
      className={`flex gap-3 sm:gap-4 p-4 rounded-2xl transition-colors ${
        isAssistant
          ? 'bg-zinc-50/80 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800'
          : 'bg-white dark:bg-zinc-950 border border-transparent'
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
        {/* Header with sender and actions */}
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
            {/* User Edit Message */}
            {!isAssistant && onEditUserMessage && (
              <button
                id={`edit-btn-${message.id}`}
                type="button"
                onClick={() => onEditUserMessage(message.content)}
                title="Edit and resend"
                aria-label="Edit and resend message"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Copy Button */}
            <button
              id={`copy-btn-${message.id}`}
              type="button"
              onClick={handleCopy}
              title="Copy text"
              aria-label="Copy message text"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Assistant Speak Audio Button */}
            {isAssistant && (
              <button
                type="button"
                onClick={handleToggleSpeech}
                title={isSpeaking ? 'Stop speaking' : 'Listen to Victor'}
                aria-label={isSpeaking ? 'Stop speaking' : 'Listen to Victor'}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'text-cyan-500 bg-cyan-100 dark:bg-cyan-950/60'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Assistant Regenerate Button */}
            {isAssistant && onRegenerate && (
              <button
                id={`retry-btn-${message.id}`}
                type="button"
                onClick={() => onRegenerate(message.id)}
                title="Regenerate this response"
                aria-label="Regenerate this response"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Message body */}
        {message.error ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-200 dark:border-rose-900/60">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{message.content}</span>
            </div>
            {onRegenerate && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 dark:hover:bg-rose-800/80 text-xs font-medium text-rose-700 dark:text-rose-200 transition-colors shrink-0 w-fit cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        ) : isAssistant ? (
          <div className="flex flex-col gap-2">
            {/* Action Badges */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 my-1">
                {actions.map((act, idx) => {
                  const isMemory = act.type === 'save_memory';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={isMemory ? onOpenPersonalization : onOpenTaskBoard}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer text-left shadow-2xs ${
                        isMemory
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/70 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60'
                          : 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/70 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60'
                      }`}
                    >
                      {isMemory ? (
                        <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      )}
                      <span>
                        {act.type === 'add_task' && `Added to missions: "${act.title}"`}
                        {act.type === 'complete_task' && `Completed: "${act.title}"`}
                        {act.type === 'delete_task' && `Removed: "${act.title}"`}
                        {act.type === 'set_theme' && `Switched to ${act.theme} mode`}
                        {act.type === 'save_note' && `Saved note: "${act.title}"`}
                        {act.type === 'save_memory' && `Remembered: "${act.fact || act.title}"`}
                      </span>
                      {act.priority && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-200/70 dark:bg-cyan-900/70 uppercase font-mono font-bold">
                          {act.priority}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Python Code Execution Output */}
            {message.codeExecutions && message.codeExecutions.length > 0 && (
              <div className="my-2 rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-950 text-xs font-mono">
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Terminal className="w-3.5 h-3.5" />
                    Python Sandbox Execution
                  </span>
                  <span className="text-[10px] text-zinc-500">Gemini Native Runtime</span>
                </div>
                <pre className="p-3 bg-zinc-900/40 border-b border-zinc-800/80 text-zinc-300 overflow-x-auto m-0 font-mono">
                  <code>{message.codeExecutions[0].code}</code>
                </pre>
                {message.codeExecutions[0].output && (
                  <div className="p-3 bg-black/90 text-emerald-400 overflow-x-auto font-mono">
                    <span className="text-[10px] text-zinc-500 uppercase block mb-1">Execution Output</span>
                    <pre className="m-0 font-mono whitespace-pre-wrap">{message.codeExecutions[0].output}</pre>
                  </div>
                )}
              </div>
            )}

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
                {cleanContent}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="text-zinc-900 dark:text-zinc-100 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.error === nextProps.message.error &&
    prevProps.isLatestAssistantMessage === nextProps.isLatestAssistantMessage
  );
});
