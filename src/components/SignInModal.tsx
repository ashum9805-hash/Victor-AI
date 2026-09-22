import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  User,
  ShieldCheck,
  LogOut,
  Sparkles,
  Check,
  Cloud,
  Lock,
} from 'lucide-react';
import { UserProfile } from '../types';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSignIn: (email: string, name?: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onSignOut: () => void;
  currentTaskCount: number;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignIn,
  onGoogleSignIn,
  onSignOut,
  currentTaskCount,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmailInput(currentUser?.email || '');
      setNameInput(currentUser?.name || '');
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSignIn(cleanEmail, nameInput.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!onGoogleSignIn) return;
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      await onGoogleSignIn();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleSignOutClick = () => {
    onSignOut();
    onClose();
  };

  return (
    <div
      id="signin-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="signin-modal-card"
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-modal-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 id="signin-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {currentUser ? 'Your Account & Cloud Sync' : 'Sign In or Stay as Guest'}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {currentUser ? 'Connected with Cloud persistence' : 'Choose how your tasks and chats are saved'}
              </p>
            </div>
          </div>
          <button
            id="signin-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            /* Already Signed In View */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-sm shadow-xs">
                    {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    {currentUser.name && (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {currentUser.name}
                      </p>
                    )}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {currentUser.email}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{currentUser.googleLinked ? 'Gmail Linked & Active' : 'Cloud Sync Active'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 text-xs text-zinc-500 dark:text-zinc-400 flex justify-between items-center">
                  <span>Missions saved to email:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentTaskCount} tasks</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
                <div className="leading-relaxed">
                  Your tasks and conversations are isolated to your email address. Other visitors opening this app cannot see or modify your data.
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  id="signin-signout-btn"
                  onClick={handleSignOutClick}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer active:scale-98"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out to Guest</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-xs font-medium text-white dark:text-zinc-900 transition-all cursor-pointer active:scale-98"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Not Signed In: Sign In Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feature comparison banner */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-1.5 font-medium text-indigo-900 dark:text-indigo-300 text-[11px] mb-1">
                    <Cloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>With Email Sign In</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                    Your tasks & chats sync to your email across any browser or computer.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-300 text-[11px] mb-1">
                    <Lock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Guest Mode</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Tasks stay strictly local to this specific browser. No server sync.
                  </p>
                </div>
              </div>

              {/* Primary Google Sign In Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="google-signin-btn"
                  onClick={handleGoogleClick}
                  disabled={isGoogleSubmitting || isSubmitting}
                  className="gsi-material-button active:scale-[0.99] transition-transform"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-medium">
                      {isGoogleSubmitting ? 'Authenticating with Google...' : 'Continue with Google Workspace'}
                    </span>
                  </div>
                </button>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
                  Links Gmail, Docs, and Calendar so Victor can execute workspace actions on your command.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">or email only</span>
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="signin-email-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address <span className="text-indigo-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      id="signin-email-input"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signin-name-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Display Name <span className="text-zinc-400 text-[10px] font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      id="signin-name-input"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer active:scale-98"
                >
                  Stay as Guest
                </button>
                <button
                  id="signin-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Connecting...' : 'Sign In & Sync'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
