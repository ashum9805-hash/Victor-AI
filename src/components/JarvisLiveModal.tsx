import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  Radio,
  Zap,
  RefreshCw,
  Send,
  AlertCircle,
  PhoneOff,
} from 'lucide-react';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  speakText,
  stopSpeaking,
  isSpeechRecognitionSupported,
  VoicePersona,
  SpeakingStyle,
  VOICE_PERSONAS,
  getStoredVoicePersona,
  setStoredVoicePersona,
  getStoredSpeakingStyle,
  setStoredSpeakingStyle,
  previewVoicePersona,
} from '../utils/voiceService';
import { GeminiLiveSession, LiveSessionStatus } from '../utils/geminiLiveService';
import { VoiceSettingsModal } from './VoiceSettingsModal';

interface JarvisLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string>;
  latestAssistantText?: string;
  isGenerating?: boolean;
}

// Map personas to Gemini Multimodal Live API prebuilt voices
const PERSONA_TO_GEMINI_LIVE_VOICE: Record<VoicePersona, string> = {
  breeze: 'Zephyr',
  cove: 'Charon',
  ember: 'Puck',
  juniper: 'Kore',
  classic: 'Fenrir',
};

export const JarvisLiveModal: React.FC<JarvisLiveModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  latestAssistantText,
}) => {
  // Mode: 'gemini-live' (real-time native multimodal audio) vs 'standard' (turn-based fallback)
  const [audioMode, setAudioMode] = useState<'gemini-live' | 'standard'>('gemini-live');

  // Gemini Live State
  const [liveStatus, setLiveStatus] = useState<LiveSessionStatus>('idle');
  const [liveStatusDetail, setLiveStatusDetail] = useState<string>('');
  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);
  const [isLiveMuted, setIsLiveMuted] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);

  // Standard Voice Chat State
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [standardTranscript, setStandardTranscript] = useState('');
  const [standardInterim, setStandardInterim] = useState('');
  const [standardStatus, setStandardStatus] = useState('Tap to start talking');
  const [lastResponse, setLastResponse] = useState('');

  // Voice Persona and Settings
  const [currentPersona, setCurrentPersona] = useState<VoicePersona>(getStoredVoicePersona);
  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>(getStoredSpeakingStyle);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Refs
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const stopRecRef = useRef<(() => void) | null>(null);

  // Auto-connect to Gemini Live when modal opens in 'gemini-live' mode
  useEffect(() => {
    if (!isOpen) {
      cleanupAllSessions();
      return;
    }

    setCurrentPersona(getStoredVoicePersona());
    setSpeakingStyle(getStoredSpeakingStyle());

    if (audioMode === 'gemini-live') {
      startLiveConnection();
    } else if (latestAssistantText && voiceOutputEnabled) {
      setLastResponse(latestAssistantText);
      setIsSpeakingState(true);
      speakText(latestAssistantText, {
        persona: getStoredVoicePersona(),
        style: getStoredSpeakingStyle(),
        onStart: () => setIsSpeakingState(true),
        onEnd: () => setIsSpeakingState(false),
      });
    }

    return () => {
      cleanupAllSessions();
    };
  }, [isOpen, audioMode]);

  const cleanupAllSessions = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
      liveSessionRef.current = null;
    }
    if (stopRecRef.current) {
      stopRecRef.current();
      stopRecRef.current = null;
    }
    stopSpeaking();
    setIsListening(false);
    setIsSpeakingState(false);
    setInputVolume(0);
    setOutputVolume(0);
  };

  // Start Gemini Multimodal Live Connection
  const startLiveConnection = async (targetPersona?: VoicePersona) => {
    cleanupAllSessions();
    setLiveErrorMessage(null);

    const persona = targetPersona || currentPersona;
    const liveVoice = PERSONA_TO_GEMINI_LIVE_VOICE[persona] || 'Zephyr';

    const session = new GeminiLiveSession({
      onStatusChange: (status, detail) => {
        setLiveStatus(status);
        if (detail) setLiveStatusDetail(detail);
      },
      onAudioLevels: (inLevel, outLevel) => {
        setInputVolume(inLevel);
        setOutputVolume(outLevel);
      },
      onTranscript: (text) => {
        setLiveTranscript((prev) => (prev ? `${prev} ${text}` : text));
      },
      onError: (err) => {
        setLiveErrorMessage(err);
      },
      onClose: () => {
        // Session closed
      },
    });

    liveSessionRef.current = session;

    try {
      await session.connect(liveVoice);
    } catch (err: any) {
      console.warn('[Live Connect Handler Caught]:', err);
      // Fallback hint shown in UI
    }
  };

  // Switch voice persona
  const handlePersonaChange = (p: VoicePersona) => {
    setCurrentPersona(p);
    setStoredVoicePersona(p);

    if (audioMode === 'gemini-live') {
      // Reconnect with new voice
      startLiveConnection(p);
    } else {
      previewVoicePersona(p);
    }
  };

  // Toggle Mute in Gemini Live
  const handleToggleMute = () => {
    if (liveSessionRef.current) {
      const nextMuted = !isLiveMuted;
      liveSessionRef.current.setMuted(nextMuted);
      setIsLiveMuted(nextMuted);
    }
  };

  // Interrupt Victor (barge-in)
  const handleInterrupt = () => {
    if (liveSessionRef.current) {
      // Simulate barge-in by interrupting current audio playback
      (liveSessionRef.current as any).handleInterruption?.();
    }
    if (isSpeakingState) {
      stopSpeaking();
      setIsSpeakingState(false);
    }
  };

  // Send quick text in live session
  const handleSendLiveText = (textToSend?: string) => {
    const message = (textToSend || textInput).trim();
    if (!message) return;

    if (audioMode === 'gemini-live' && liveSessionRef.current) {
      liveSessionRef.current.sendTextMessage(message);
      setLiveTranscript((prev) => `${prev ? prev + '\n' : ''}You: ${message}`);
      setTextInput('');
    } else {
      handleDispatchStandardQuery(message);
      setTextInput('');
    }
  };

  // Standard Voice Chat Recognition Toggle
  const handleToggleStandardListening = () => {
    if (isListening) {
      if (stopRecRef.current) {
        stopRecRef.current();
        stopRecRef.current = null;
      }
      stopSpeechRecognition();
      setIsListening(false);
      setStandardStatus('Paused');
    } else {
      if (!isSpeechRecognitionSupported()) {
        setStandardStatus('Speech recognition not supported in browser');
        return;
      }

      stopSpeaking();
      setIsSpeakingState(false);
      setStandardTranscript('');
      setStandardInterim('');
      setStandardStatus('Listening... go ahead!');
      setIsListening(true);

      const stopFn = startSpeechRecognition({
        onTranscript: (finalText) => {
          setStandardTranscript(finalText);
          setStandardInterim('');
          handleDispatchStandardQuery(finalText);
        },
        onInterim: (interimText) => {
          setStandardInterim(interimText);
        },
        onEnd: () => {
          setIsListening(false);
          setStandardStatus('Thinking...');
        },
        onError: (err) => {
          console.warn('Standard voice error:', err);
          setIsListening(false);
          setStandardStatus('Microphone access needed');
        },
      });

      stopRecRef.current = stopFn;
    }
  };

  const handleDispatchStandardQuery = async (query: string) => {
    if (!query.trim()) return;
    setStandardStatus('Thinking...');

    try {
      const answer = await onSendMessage(query.trim());
      setLastResponse(answer);
      setStandardStatus('Victor is speaking');

      if (voiceOutputEnabled) {
        setIsSpeakingState(true);
        speakText(answer, {
          persona: currentPersona,
          style: speakingStyle,
          onStart: () => setIsSpeakingState(true),
          onEnd: () => {
            setIsSpeakingState(false);
            setStandardStatus('Tap to reply or ask anything');
          },
        });
      } else {
        setStandardStatus('Tap to reply or ask anything');
      }
    } catch {
      setStandardStatus("Couldn't connect, please try again");
    }
  };

  if (!isOpen) return null;

  // Visualizer radius calculations
  const livePulseScale =
    liveStatus === 'speaking'
      ? 1 + outputVolume * 0.4
      : liveStatus === 'listening'
      ? 1 + inputVolume * 0.3
      : 1;

  return (
    <>
      <div
        id="victor-live-modal"
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950/95 backdrop-blur-xl p-4 sm:p-6 text-white animate-in fade-in duration-300 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Victor Live Voice"
      >
        {/* Top Header */}
        <div className="w-full max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm tracking-wide text-zinc-100">Victor Live</h2>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-medium">
                  {audioMode === 'gemini-live' ? (
                    <>
                      <Zap className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                      Gemini Multimodal Live
                    </>
                  ) : (
                    <>
                      <Radio className="w-2.5 h-2.5 text-zinc-400" />
                      Standard Voice
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {audioMode === 'gemini-live'
                  ? 'Real-time bidirectional neural voice stream'
                  : 'Turn-based voice assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Toggle (Gemini Live vs Standard) */}
            <button
              id="toggle-audio-mode-btn"
              type="button"
              onClick={() => {
                const nextMode = audioMode === 'gemini-live' ? 'standard' : 'gemini-live';
                setAudioMode(nextMode);
              }}
              title={
                audioMode === 'gemini-live'
                  ? 'Switch to Standard Voice Chat'
                  : 'Switch to Gemini Multimodal Live'
              }
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                audioMode === 'gemini-live'
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {audioMode === 'gemini-live' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Standard</span>
                </>
              )}
            </button>

            {/* Voice Settings Button */}
            <button
              id="voice-settings-btn"
              type="button"
              onClick={() => setIsVoiceSettingsOpen(true)}
              title="Voice Personas & Pitch Settings"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close Modal */}
            <button
              id="close-live-modal-btn"
              type="button"
              onClick={onClose}
              aria-label="Close Live Voice"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice Persona Selector Bar */}
        <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800 my-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] text-zinc-400 font-medium shrink-0 mr-0.5">Voice:</span>
            {(['breeze', 'cove', 'ember', 'juniper', 'classic'] as VoicePersona[]).map((p) => {
              const conf = VOICE_PERSONAS[p];
              const active = currentPersona === p;
              const geminiLiveVoice = PERSONA_TO_GEMINI_LIVE_VOICE[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePersonaChange(p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-black font-semibold shadow-xs'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                  title={`${conf.name} (${geminiLiveVoice}) - ${conf.tagline}`}
                >
                  <span className="text-sm leading-none">{conf.icon}</span>
                  <span>{conf.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {audioMode === 'gemini-live' && (
              <button
                type="button"
                onClick={() => startLiveConnection()}
                title="Reconnect Live Stream"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reconnect</span>
              </button>
            )}

            {audioMode === 'standard' && (
              <button
                type="button"
                onClick={() => {
                  const next = speakingStyle === 'conversational' ? 'full' : 'conversational';
                  setSpeakingStyle(next);
                  setStoredSpeakingStyle(next);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-800 text-cyan-300 hover:bg-zinc-700 border border-zinc-700/60 transition-colors cursor-pointer shrink-0"
              >
                {speakingStyle === 'conversational' ? '💬 Casual Chat' : '📖 Full Read'}
              </button>
            )}
          </div>
        </div>

        {/* Center Interactive Visualizer & Live Controls */}
        <div className="flex flex-col items-center justify-center my-auto w-full max-w-lg text-center px-4">
          {/* Animated Visualizer Rings */}
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center mb-6">
            {/* Outer dynamic audio wave */}
            <div
              className={`absolute inset-0 rounded-full border transition-all duration-300 pointer-events-none ${
                liveStatus === 'speaking' || isSpeakingState
                  ? 'border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.2)]'
                  : liveStatus === 'listening' || isListening
                  ? 'border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)]'
                  : 'border-zinc-800/40'
              }`}
              style={{
                transform: `scale(${livePulseScale})`,
              }}
            />

            {/* Glowing animated orbital ring */}
            <div
              className={`absolute inset-3 rounded-full border-2 border-dashed transition-all duration-500 ${
                liveStatus === 'speaking' || isSpeakingState
                  ? 'border-indigo-400 animate-pulse opacity-80 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                  : liveStatus === 'listening' || isListening
                  ? 'border-cyan-400 animate-spin opacity-90 shadow-[0_0_35px_rgba(6,182,212,0.4)]'
                  : 'border-zinc-800 opacity-40'
              }`}
              style={{
                animationDuration:
                  liveStatus === 'listening' || isListening ? '8s' : '3.5s',
              }}
            />

            {/* Inner Core Action Button */}
            {audioMode === 'gemini-live' ? (
              <button
                id="gemini-live-action-btn"
                type="button"
                onClick={() => {
                  if (liveStatus === 'speaking') {
                    handleInterrupt();
                  } else if (liveStatus === 'closed' || liveStatus === 'error') {
                    startLiveConnection();
                  } else {
                    handleToggleMute();
                  }
                }}
                className={`relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xl ${
                  liveStatus === 'speaking'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(99,102,241,0.6)]'
                    : isLiveMuted
                    ? 'bg-amber-600/90 text-white border border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                    : liveStatus === 'listening'
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_45px_rgba(6,182,212,0.6)]'
                    : liveStatus === 'connecting'
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/40 animate-pulse'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
                }`}
                title={
                  liveStatus === 'speaking'
                    ? 'Tap to Interrupt Victor (or just speak!)'
                    : isLiveMuted
                    ? 'Microphone is Muted - Tap to Unmute'
                    : 'Live Voice Active - Tap to Mute Mic'
                }
              >
                {liveStatus === 'speaking' ? (
                  <>
                    <Volume2 className="w-8 h-8 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Speaking
                    </span>
                    <span className="text-[9px] opacity-80 mt-0.5">Tap to interrupt</span>
                  </>
                ) : isLiveMuted ? (
                  <>
                    <MicOff className="w-8 h-8 text-white" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Muted
                    </span>
                    <span className="text-[9px] opacity-80 mt-0.5">Tap to unmute</span>
                  </>
                ) : liveStatus === 'listening' ? (
                  <>
                    <Mic className="w-8 h-8" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Live
                    </span>
                    <span className="text-[9px] opacity-80 mt-0.5">Just talk naturally</span>
                  </>
                ) : liveStatus === 'connecting' ? (
                  <>
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Connecting
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-8 h-8 text-cyan-400" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Tap to Start
                    </span>
                  </>
                )}
              </button>
            ) : (
              /* Standard Voice Button */
              <button
                id="standard-voice-toggle-btn"
                type="button"
                onClick={handleToggleStandardListening}
                className={`relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl ${
                  isListening
                    ? 'bg-cyan-500 text-black scale-105 shadow-[0_0_40px_rgba(6,182,212,0.6)]'
                    : isSpeakingState
                    ? 'bg-indigo-600 text-white shadow-[0_0_35px_rgba(99,102,241,0.5)]'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="w-8 h-8 animate-bounce" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Listening
                    </span>
                  </>
                ) : isSpeakingState ? (
                  <>
                    <Volume2 className="w-8 h-8 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                      Speaking
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8" />
                    <span className="text-[11px] font-medium mt-1 text-zinc-300">Tap to Talk</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-4 shadow-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                liveStatus === 'speaking' || isSpeakingState
                  ? 'bg-indigo-400 animate-pulse'
                  : liveStatus === 'listening' || isListening
                  ? 'bg-cyan-400 animate-pulse'
                  : liveStatus === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : isLiveMuted
                  ? 'bg-amber-500'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="font-medium">
              {audioMode === 'gemini-live'
                ? liveStatus === 'speaking'
                  ? 'Victor is speaking (speak to interrupt)'
                  : isLiveMuted
                  ? 'Microphone muted'
                  : liveStatus === 'listening'
                  ? `Listening live with ${PERSONA_TO_GEMINI_LIVE_VOICE[currentPersona] || 'Zephyr'}...`
                  : liveStatusDetail || 'Connecting to Gemini Live...'
                : standardStatus}
            </span>
          </div>

          {/* Error Notice & Fallback prompt */}
          {liveErrorMessage && audioMode === 'gemini-live' && (
            <div className="w-full bg-red-950/40 border border-red-800/80 p-3 rounded-xl mb-4 text-left text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{liveErrorMessage}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => startLiveConnection()}
                    className="px-2 py-1 rounded bg-red-900/60 hover:bg-red-900 text-red-200 text-[11px] cursor-pointer"
                  >
                    Retry Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMode('standard')}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
                  >
                    Switch to Standard Voice
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Live Transcript or Standard Transcript */}
          {audioMode === 'gemini-live' ? (
            liveTranscript && (
              <div className="w-full bg-zinc-900/70 border border-zinc-800 p-3.5 rounded-2xl mb-4 text-left max-h-32 overflow-y-auto">
                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                  Live Conversation
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {liveTranscript}
                </p>
              </div>
            )
          ) : (
            <>
              {(standardTranscript || standardInterim) && (
                <div className="w-full bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl mb-4 text-left max-h-32 overflow-y-auto">
                  <span className="text-[11px] font-medium text-zinc-400 block mb-1">You said</span>
                  <p className="text-sm text-zinc-200 font-sans">
                    {standardTranscript}{' '}
                    <span className="text-cyan-400 italic opacity-80">{standardInterim}</span>
                  </p>
                </div>
              )}

              {lastResponse && !standardTranscript && (
                <div className="w-full bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl text-left max-h-36 overflow-y-auto mb-4">
                  <span className="text-[11px] font-medium text-indigo-400 block mb-1">Victor</span>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4">
                    {lastResponse.replace(/```[\s\S]*?```/g, '[Code block]')}
                  </p>
                </div>
              )}
            </>
          )}

          {/* In-Call Quick Text Input (for noisy environments) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendLiveText();
            }}
            className="w-full flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 focus-within:border-cyan-500/60 mb-2"
          >
            <input
              id="live-chat-text-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a quick note into the call..."
              className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-hidden"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-1.5 rounded-lg bg-cyan-500 text-black disabled:opacity-30 hover:bg-cyan-400 transition-opacity cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Bottom Conversation Starters & Controls */}
        <div className="w-full max-w-lg text-center text-[11px] text-zinc-400 pb-2">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-500">Quick Prompts:</span>
            {audioMode === 'gemini-live' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isLiveMuted ? <MicOff className="w-3.5 h-3.5 text-amber-400" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isLiveMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="flex items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <span>Interrupt</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center">
            <button
              type="button"
              onClick={() => handleSendLiveText('Victor, remember that I code mostly in Python and keep things concise')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-[11px] cursor-pointer"
            >
              "Remember my Python preference"
            </button>
            <button
              type="button"
              onClick={() => handleSendLiveText('Victor, how should I tackle binary search in Python?')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-[11px] cursor-pointer"
            >
              "How to tackle binary search?"
            </button>
            <button
              type="button"
              onClick={() => handleSendLiveText('Victor, what should I prioritize today?')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-[11px] cursor-pointer"
            >
              "What should I prioritize today?"
            </button>
            <button
              type="button"
              onClick={() => handleSendLiveText('Victor, switch theme to dark')}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors text-[11px] cursor-pointer"
            >
              "Switch to dark mode"
            </button>
          </div>
        </div>
      </div>

      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => {
          setIsVoiceSettingsOpen(false);
          setCurrentPersona(getStoredVoicePersona());
          setSpeakingStyle(getStoredSpeakingStyle());
        }}
        onSettingsChanged={() => {
          setCurrentPersona(getStoredVoicePersona());
          setSpeakingStyle(getStoredSpeakingStyle());
        }}
      />
    </>
  );
};
