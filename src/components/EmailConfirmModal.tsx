import React, { useState } from 'react';
import { Mail, Send, X, AlertTriangle, CheckCircle2, Loader2, FileEdit } from 'lucide-react';
import { SendEmailPayload } from '../utils/gmailService';

interface EmailConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: SendEmailPayload;
  onConfirmSend: (payload: SendEmailPayload) => Promise<void>;
  onSaveDraft?: (payload: SendEmailPayload) => Promise<void>;
}

export const EmailConfirmModal: React.FC<EmailConfirmModalProps> = ({
  isOpen,
  onClose,
  payload,
  onConfirmSend,
  onSaveDraft,
}) => {
  const [to, setTo] = useState(payload.to || '');
  const [subject, setSubject] = useState(payload.subject || '');
  const [body, setBody] = useState(payload.body || '');
  const [isSending, setIsSending] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to || !subject) {
      setStatusMessage({ type: 'error', text: 'Recipient and Subject are required.' });
      return;
    }
    setIsSending(true);
    setStatusMessage(null);
    try {
      await onConfirmSend({ to, subject, body });
      setStatusMessage({ type: 'success', text: 'Email successfully sent via Gmail!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to dispatch email.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleDraft = async () => {
    if (!onSaveDraft) return;
    setIsDrafting(true);
    setStatusMessage(null);
    try {
      await onSaveDraft({ to, subject, body });
      setStatusMessage({ type: 'success', text: 'Draft saved to your Gmail!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save draft.' });
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Confirm Email Action</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold">
                  Review
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Victor prepared this message per your instructions. Review before dispatching.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Recipient (To)
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@domain.com"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Message Body
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email contents..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs leading-relaxed resize-none font-sans"
            />
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending || isDrafting}
            className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {onSaveDraft && (
              <button
                type="button"
                onClick={handleDraft}
                disabled={isSending || isDrafting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-medium transition-colors"
              >
                {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileEdit className="w-3.5 h-3.5" />}
                <span>Save Draft</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || isDrafting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSending ? 'Sending via Gmail...' : 'Send Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
