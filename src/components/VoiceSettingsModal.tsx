import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Play,
  Square,
  Check,
  Sparkles,
  MessageSquare,
  Sliders,
  Radio,
} from 'lucide-react';
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
  getBestVoiceForPersona,
} from '../utils/voiceService';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
}) => {
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona>('breeze');
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>('conversational');
  const [previewingPersona, setPreviewingPersona] = useState<VoicePersona | null>(null);
  const [matchedVoiceName, setMatchedVoiceName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const p = getStoredVoicePersona();
      const s = getStoredSpeakingStyle();
      setSelectedPersona(p);
      setSpeakingStyle(s);

      const matched = getBestVoiceForPersona(p);
      setMatchedVoiceName(matched.voice ? matched.voice.name : 'System Natural Voice');
    } else {
      stopSpeaking();
      setPreviewingPersona(null);
    }
  }, [isOpen]);

  const handleSelectPersona = (id: VoicePersona) => {
    setSelectedPersona(id);
    setStoredVoicePersona(id);
    const matched = getBestVoiceForPersona(id);
    setMatchedVoiceName(matched.voice ? matched.voice.name : 'System Natural Voice');
    onSettingsChanged?.();
  };

  const handleSelectStyle = (style: SpeakingStyle) => {
    setSpeakingStyle(style);
    setStoredSpeakingStyle(style);
    onSettingsChanged?.();
  };

  const handlePreview = (id: VoicePersona, e: React.MouseEvent) => {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 id="voice-settings-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Voice & Speech Style
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure how Victor speaks and converses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice settings"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Speaking Form / Style Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Speaking Form
              </span>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                {speakingStyle === 'conversational' ? 'ChatGPT-style Dialogue' : 'Direct Reading'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Conversational Mode */}
              <button
                type="button"
                onClick={() => handleSelectStyle('conversational')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  speakingStyle === 'conversational'
                    ? 'border-cyan-500/60 bg-cyan-50/50 dark:bg-cyan-950/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-cyan-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                    Conversational
                  </span>
                  {speakingStyle === 'conversational' && (
                    <Check className="w-3.5 h-3.5 text-cyan-500" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Speaks like a human talking across a table. Summarizes code and math verbally, skips reading artifacts, and uses natural pauses.
                </p>
              </button>

              {/* Full Readout Mode */}
              <button
                type="button"
                onClick={() => handleSelectStyle('full')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  speakingStyle === 'full'
                    ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-zinc-900 dark:text-zinc-100 ring-1 ring-indigo-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                    Full Readout
                  </span>
                  {speakingStyle === 'full' && (
                    <Check className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Reads the entire written response word-for-word, clean of raw markdown syntax.
                </p>
              </button>
            </div>
          </div>

          {/* Voice Personas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Voice Personas
              </span>
              <span className="text-[11px] text-zinc-500">
                Tap play to preview
              </span>
            </div>

            <div className="space-y-2">
              {(Object.values(VOICE_PERSONAS)).map((p) => {
                const isSelected = selectedPersona === p.id;
                const isPlaying = previewingPersona === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPersona(p.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500/60 bg-cyan-50/40 dark:bg-cyan-950/20 ring-1 ring-cyan-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl select-none">{p.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {p.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                            {p.tagline}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {p.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handlePreview(p.id, e)}
                      className={`p-2 rounded-lg border transition-all shrink-0 cursor-pointer ${
                        isPlaying
                          ? 'bg-cyan-500 text-white border-cyan-400 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                      title={isPlaying ? 'Stop preview' : `Preview ${p.name}`}
                      aria-label={isPlaying ? 'Stop preview' : `Preview ${p.name}`}
                    >
                      {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engine Voice Info */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Synthesizer Engine:</span>
            <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[240px]" title={matchedVoiceName}>
              {matchedVoiceName}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
