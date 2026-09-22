import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sun,
  Moon,
  Volume2,
  Play,
  Square,
  Check,
  User,
  LogOut,
  Sparkles,
  Cloud,
  ShieldCheck,
  MessageSquare,
  Palette,
  Keyboard,
  Brain,
  Trash2,
  Plus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { UserProfile, PersonalizationSettings } from '../types';
import {
  VoicePersona,
  SpeakingStyle,
  VOICE_PERSONAS,
  getStoredVoicePersona,
  setStoredVoicePersona,
  getStoredSpeakingStyle,
  setStoredSpeakingStyle,
  previewVoicePersona,
  stopSpeaking,
} from '../utils/voiceService';
import {
  getPersonalizationSettings,
  togglePersonalization,
  addMemory,
  removeMemory,
  clearAllMemories,
  updateCustomInstructions,
} from '../utils/personalizationService';

export type SettingsSectionId = 'appearance' | 'personalization' | 'voice' | 'account' | 'shortcuts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSetTheme?: (theme: 'light' | 'dark') => void;
  currentUser: UserProfile | null;
  onOpenSignIn: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onSignOut: () => void;
  tasksCount?: number;
  initialTab?: SettingsSectionId;
  onPersonalizationChange?: (settings: PersonalizationSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onSetTheme,
  currentUser,
  onOpenSignIn,
  onGoogleSignIn,
  onSignOut,
  tasksCount = 0,
  initialTab,
  onPersonalizationChange,
}) => {
  // If activeSection is null, show the clean vertical hub list.
  // When clicked, drill into the selected section's detailed view.
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona>('breeze');
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>('conversational');
  const [previewingPersona, setPreviewingPersona] = useState<VoicePersona | null>(null);

  // Personalization state
  const [personalization, setPersonalization] = useState<PersonalizationSettings>(getPersonalizationSettings());
  const [newMemoryFact, setNewMemoryFact] = useState('');
  const [instructionsDraft, setInstructionsDraft] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPersona(getStoredVoicePersona());
      setSpeakingStyle(getStoredSpeakingStyle());
      const currentPers = getPersonalizationSettings();
      setPersonalization(currentPers);
      setInstructionsDraft(currentPers.customInstructions || '');
      setShowClearConfirm(false);
      // If an initial tab was requested, open directly into that section, otherwise stay on main list
      if (initialTab) {
        setActiveSection(initialTab);
      } else {
        setActiveSection(null);
      }
    } else {
      stopSpeaking();
      setPreviewingPersona(null);
      setActiveSection(null);
    }
  }, [isOpen, initialTab]);

  const handleTogglePersonalization = () => {
    const updated = togglePersonalization(!personalization.enabled);
    setPersonalization(updated);
    onPersonalizationChange?.(updated);
  };

  const handleAddManualMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryFact.trim()) return;
    const updated = addMemory(newMemoryFact.trim(), 'manual');
    setPersonalization(updated);
    setNewMemoryFact('');
    onPersonalizationChange?.(updated);
  };

  const handleDeleteMemory = (id: string) => {
    const updated = removeMemory(id);
    setPersonalization(updated);
    onPersonalizationChange?.(updated);
  };

  const handleClearAllMemories = () => {
    const updated = clearAllMemories();
    setPersonalization(updated);
    setShowClearConfirm(false);
    onPersonalizationChange?.(updated);
  };

  const handleSaveInstructions = () => {
    const updated = updateCustomInstructions(instructionsDraft.trim());
    setPersonalization(updated);
    onPersonalizationChange?.(updated);
  };

  const handleSelectPersona = (id: VoicePersona) => {
    setSelectedPersona(id);
    setStoredVoicePersona(id);
  };

  const handleSelectStyle = (style: SpeakingStyle) => {
    setSpeakingStyle(style);
    setStoredSpeakingStyle(style);
  };

  const handlePreviewVoice = (id: VoicePersona, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingPersona === id) {
      stopSpeaking();
      setPreviewingPersona(null);
    } else {
      stopSpeaking();
      setPreviewingPersona(id);
      previewVoicePersona(id, () => {
        setPreviewingPersona(null);
      });
    }
  };

  const handleChooseTheme = (mode: 'light' | 'dark') => {
    if (theme !== mode) {
      if (onSetTheme) {
        onSetTheme(mode);
      } else {
        onToggleTheme();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            {activeSection ? (
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                aria-label="Back to settings menu"
                className="p-1.5 -ml-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 id="settings-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {activeSection === 'appearance' && 'Theme & Appearance'}
                {activeSection === 'personalization' && 'Personalization & Memory'}
                {activeSection === 'voice' && 'Voice & Speech'}
                {activeSection === 'account' && 'Account & Sync'}
                {activeSection === 'shortcuts' && 'Keyboard Shortcuts'}
                {activeSection === null && 'Settings & Preferences'}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeSection === 'appearance' && 'Choose dark or light visual interface theme'}
                {activeSection === 'personalization' && 'Manage memory bank and adaptive learning'}
                {activeSection === 'voice' && 'Pick speaking voice persona and response style'}
                {activeSection === 'account' && 'Account details and partitioned mission storage'}
                {activeSection === 'shortcuts' && 'Quick navigation and productivity hotkeys'}
                {activeSection === null && 'Select an option to view or customize'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* ======================================================== */}
          {/* MAIN VERTICAL HUB VIEW (When no section is drilled down) */}
          {/* ======================================================== */}
          {activeSection === null && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
                Preferences & Controls
              </span>

              <div className="space-y-2">
                {/* 1. Theme Toggle Row */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3">
                  <div
                    onClick={() => setActiveSection('appearance')}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Theme & Display</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                          {theme}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Toggle light or dark high-contrast mode
                      </p>
                    </div>
                  </div>

                  {/* Inline quick toggle switch for convenience */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTheme();
                      }}
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Light</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="hidden sm:inline">Dark</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('appearance')}
                      aria-label="View theme details"
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Personalization & Memory Row */}
                <button
                  type="button"
                  onClick={() => setActiveSection('personalization')}
                  className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Personalization & Memory</span>
                        {personalization.enabled ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {personalization.memories.length} saved
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Adaptive learning, custom guidance, and long-term memory
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                </button>

                {/* 3. Voice & Speech Row */}
                <button
                  type="button"
                  onClick={() => setActiveSection('voice')}
                  className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Voice & Speech</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 capitalize">
                          {VOICE_PERSONAS[selectedPersona]?.name || selectedPersona}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Voice persona selection and conversational dialogue style
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                </button>

                {/* 4. Account & Sync Row */}
                <button
                  type="button"
                  onClick={() => setActiveSection('account')}
                  className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Account & Data Sync</span>
                        {currentUser ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Synced
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Guest
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {currentUser ? currentUser.email : 'Sign in to partition tasks and sync cross-device'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                </button>

                {/* 5. Keyboard Shortcuts Row */}
                <button
                  type="button"
                  onClick={() => setActiveSection('shortcuts')}
                  className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Keyboard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Keyboard Shortcuts
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        Productivity hotkeys (Cmd+K, Enter, Esc)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DRILLED-DOWN SECTION VIEWS (Active Option Content) */}
          {/* ======================================================== */}

          {/* 1. APPEARANCE & THEME TAB */}
          {activeSection === 'appearance' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                  Interface Theme
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                  Choose your preferred appearance style for Victor.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => handleChooseTheme('dark')}
                    className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-indigo-500 bg-zinc-950 text-white ring-2 ring-indigo-500/30 shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900 text-indigo-400 border border-zinc-800">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>Dark Theme</span>
                          {theme === 'dark' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-normal">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          High contrast dark slate, easy on the eyes.
                        </p>
                      </div>
                    </div>
                    {theme === 'dark' && <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                  </button>

                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => handleChooseTheme('light')}
                    className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-amber-500 bg-amber-50/40 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ring-2 ring-amber-500/30 shadow-md'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 text-amber-500 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>Light Theme</span>
                          {theme === 'light' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-normal">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Crisp, clean layout with high baseline contrast.
                        </p>
                      </div>
                    </div>
                    {theme === 'light' && <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                  </button>
                </div>
              </div>

              {/* Visual accents card */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  Themes automatically adjust LaTeX mathematical formula styling, markdown code syntax blocks, and interactive charts.
                </span>
              </div>
            </div>
          )}

          {/* 2. PERSONALIZATION & MEMORY TAB */}
          {activeSection === 'personalization' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Master Memory Toggle */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Dynamic Memory & Personalization
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        personalization.enabled
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {personalization.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg">
                    When enabled, Victor adapts directly to what you talk about (Python, cooking, writing, or design) and remembers key preferences and facts across different chats so you never have to repeat yourself.
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={handleTogglePersonalization}
                  role="switch"
                  aria-checked={personalization.enabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    personalization.enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      personalization.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Custom Guidance & Response Style */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-instructions" className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Custom Response Guidance
                  </label>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Optional</span>
                </div>
                <div className="space-y-2">
                  <textarea
                    id="custom-instructions"
                    rows={2}
                    placeholder="e.g., Focus mostly on Python and clean code; explain trade-offs conversationally without robotic phrases..."
                    value={instructionsDraft}
                    onChange={(e) => setInstructionsDraft(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveInstructions}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Guidance
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Memory Manually */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Teach Victor a Detail
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {personalization.memories.length} remembered
                  </span>
                </div>
                <form onSubmit={handleAddManualMemory} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., I'm building an async Python API, or I prefer concise bullet points"
                    value={newMemoryFact}
                    onChange={(e) => setNewMemoryFact(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMemoryFact.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              </div>

              {/* Stored Memories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Stored Context & Memories
                  </span>
                  {personalization.memories.length > 0 && (
                    <>
                      {showClearConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-rose-500 font-medium">Delete all?</span>
                          <button
                            type="button"
                            onClick={handleClearAllMemories}
                            className="text-[11px] px-2 py-0.5 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 cursor-pointer"
                          >
                            Yes, Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowClearConfirm(false)}
                            className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(true)}
                          className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </>
                  )}
                </div>

                {personalization.memories.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      No memories saved yet
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Tell Victor in any chat "Remember that..." or add details above to build cross-chat context.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {personalization.memories.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-start justify-between gap-3 text-xs group transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-zinc-800 dark:text-zinc-200 leading-snug">
                            {m.text}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-600 dark:text-zinc-400">
                              {m.source === 'auto' ? 'Chat Learned' : 'Manual'}
                            </span>
                            <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          title="Delete this memory"
                          className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. VOICE & SPEECH TAB */}
          {activeSection === 'voice' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Speaking Form */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Speaking Style
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {speakingStyle === 'conversational' ? 'Conversational Dialogue' : 'Full Response Reading'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectStyle('conversational')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      speakingStyle === 'conversational'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-indigo-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        Conversational
                      </span>
                      {speakingStyle === 'conversational' && (
                        <Check className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Speaks concise dialogue summaries tailored for human conversation.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectStyle('full')}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      speakingStyle === 'full'
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-indigo-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                        <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                        Full Response
                      </span>
                      {speakingStyle === 'full' && (
                        <Check className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                      Reads entire generated output including lists and explanations.
                    </p>
                  </button>
                </div>
              </div>

              {/* Voice Personas */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
                  Voice Persona
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(VOICE_PERSONAS) as VoicePersona[]).map((personaId) => {
                    const persona = VOICE_PERSONAS[personaId];
                    const isSelected = selectedPersona === personaId;
                    const isPlaying = previewingPersona === personaId;

                    return (
                      <div
                        key={personaId}
                        onClick={() => handleSelectPersona(personaId)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                              <span>{persona.icon}</span>
                              <span>{persona.name}</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                              {persona.tagline}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {persona.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handlePreviewVoice(personaId, e)}
                            title={isPlaying ? 'Stop preview' : `Listen to ${persona.name}`}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              isPlaying
                                ? 'bg-rose-500 text-white border-rose-600'
                                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3" />}
                          </button>
                          {isSelected && <Check className="w-4 h-4 text-indigo-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. ACCOUNT & DATA SYNC TAB */}
          {activeSection === 'account' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {currentUser ? (currentUser.name || currentUser.email).charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>{currentUser ? currentUser.name || currentUser.email.split('@')[0] : 'Guest Visitor'}</span>
                      {currentUser ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-300 dark:border-emerald-800">
                          Email-Synced
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                          Local Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {currentUser ? currentUser.email : 'Tasks and chats are saved only in this browser'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSignOut();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSignIn();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-xs cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Sign In & Sync</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gmail Assistant Authorization Card */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Google Workspace Assistant (Docs, Drive, Calendar, Gmail)
                        </h4>
                        {currentUser?.googleLinked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                            Authorized
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Authorize Victor to draft Google Docs, schedule meetings in Google Calendar, and send emails via Gmail on your explicit command.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {currentUser?.googleLinked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                        Linked
                      </span>
                    ) : onGoogleSignIn ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onGoogleSignIn();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-all cursor-pointer"
                      >
                        Link Google Workspace
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Data isolation feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/20">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Private Task Partition</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Signing in guarantees tasks and missions are scoped exclusively to your email. Other users cannot see or touch your data.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/20">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    <Cloud className="w-4 h-4 text-sky-500" />
                    <span>Cross-Tab Sync</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Access your task lists and conversation sessions seamlessly whenever you sign in from any tab or device.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. KEYBOARD SHORTCUTS TAB */}
          {activeSection === 'shortcuts' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                Keyboard Shortcuts
              </span>

              <div className="space-y-2">
                {[
                  { key: 'Cmd/Ctrl + K', desc: 'Start a new chat session immediately' },
                  { key: 'Enter', desc: 'Send your message' },
                  { key: 'Shift + Enter', desc: 'Insert a new line in the message box' },
                  { key: 'Esc', desc: 'Close open dialogs and drawers' },
                ].map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-xs"
                  >
                    <span className="text-zinc-600 dark:text-zinc-300">{sc.desc}</span>
                    <kbd className="px-2 py-1 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Victor Autonomous Engine</span>
          </div>
          <div className="flex items-center gap-2">
            {activeSection !== null && (
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-all cursor-pointer"
              >
                All Settings
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

