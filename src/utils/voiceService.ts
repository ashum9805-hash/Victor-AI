// Voice Service for Speech-to-Text and Jarvis Speech Synthesis

// Cross-browser SpeechRecognition type definitions
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const isSpeechRecognitionSupported = (): boolean => {
  return !!SpeechRecognitionAPI;
};

export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

let currentRecognition: any = null;

export function startSpeechRecognition({
  onTranscript,
  onInterim,
  onEnd,
  onError,
}: {
  onTranscript: (finalText: string) => void;
  onInterim?: (interimText: string) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): () => void {
  if (!SpeechRecognitionAPI) {
    onError?.('Speech recognition is not supported in this browser.');
    return () => {};
  }

  try {
    if (currentRecognition) {
      try {
        currentRecognition.abort();
      } catch {
        // Ignore
      }
    }

    const recognition = new SpeechRecognitionAPI();
    currentRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalAccumulated = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalAccumulated += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (interim && onInterim) {
        onInterim(interim);
      }
      if (finalAccumulated) {
        onTranscript(finalAccumulated.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Victor Voice] Recognition error:', event.error);
      onError?.(event.error);
    };

    recognition.onend = () => {
      currentRecognition = null;
      onEnd?.();
    };

    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore
      }
    };
  } catch (err) {
    onError?.(err);
    return () => {};
  }
}

export function stopSpeechRecognition() {
  if (currentRecognition) {
    try {
      currentRecognition.stop();
    } catch {
      // Ignore
    }
    currentRecognition = null;
  }
}

export type VoicePersona = 'breeze' | 'cove' | 'ember' | 'juniper' | 'classic';
export type SpeakingStyle = 'conversational' | 'full';

export interface VoicePersonaConfig {
  id: VoicePersona;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  defaultPitch: number;
  defaultRate: number;
  samplePhrase: string;
}

export const VOICE_PERSONAS: Record<VoicePersona, VoicePersonaConfig> = {
  breeze: {
    id: 'breeze',
    name: 'Breeze',
    tagline: 'Casual & Natural',
    description: 'Warm, conversational flow like ChatGPT voice. Natural pauses and friendly rhythm.',
    icon: '🌊',
    defaultPitch: 1.0,
    defaultRate: 1.0,
    samplePhrase: "Hey! I'm Victor. How's your day going?",
  },
  cove: {
    id: 'cove',
    name: 'Cove',
    tagline: 'Calm & Deep',
    description: 'Relaxed, thoughtful, and measured conversational tone for effortless listening.',
    icon: '🌲',
    defaultPitch: 0.9,
    defaultRate: 0.96,
    samplePhrase: "Good to connect with you. What are we working through today?",
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    tagline: 'Lively & Upbeat',
    description: 'Bright, energetic, and expressive with dynamic vocal inflection.',
    icon: '🔥',
    defaultPitch: 1.08,
    defaultRate: 1.04,
    samplePhrase: "Hey there! Ready to jump into some great work together?",
  },
  juniper: {
    id: 'juniper',
    name: 'Juniper',
    tagline: 'Smooth & Warm',
    description: 'Soft, clear, and articulate with an approachable, companionable pace.',
    icon: '🍃',
    defaultPitch: 1.02,
    defaultRate: 0.98,
    samplePhrase: "Hello! I'm right here whenever you'd like to talk things through.",
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    tagline: 'Crisp & Direct',
    description: 'Focused, articulate technical cadences for rapid clarity.',
    icon: '⚡',
    defaultPitch: 1.0,
    defaultRate: 1.06,
    samplePhrase: "Victor online. All systems ready whenever you are.",
  },
};

const STORAGE_KEY_PERSONA = 'victor_voice_persona_v2';
const STORAGE_KEY_STYLE = 'victor_speaking_style_v2';

export function getStoredVoicePersona(): VoicePersona {
  if (typeof window === 'undefined') return 'breeze';
  const val = localStorage.getItem(STORAGE_KEY_PERSONA) as VoicePersona;
  if (val && VOICE_PERSONAS[val]) return val;
  return 'breeze';
}

export function setStoredVoicePersona(persona: VoicePersona): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PERSONA, persona);
  }
}

export function getStoredSpeakingStyle(): SpeakingStyle {
  if (typeof window === 'undefined') return 'conversational';
  const val = localStorage.getItem(STORAGE_KEY_STYLE) as SpeakingStyle;
  if (val === 'conversational' || val === 'full') return val;
  return 'conversational';
}

export function setStoredSpeakingStyle(style: SpeakingStyle): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_STYLE, style);
  }
}

// Ensure voices are loaded asynchronously across Chrome, Safari, Edge, Android
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Transforms written AI text into ChatGPT-style natural spoken dialogue.
 * Removes mechanical artifact reading (markdown, bullet dashes, code syntax, links)
 * and produces fluent spoken sentences with natural conversational connective phrases.
 */
export function toConversationalSpeech(text: string): string {
  if (!text) return '';

  let speech = text;

  // 1. Strip raw action execution blocks
  speech = speech.replace(/```action[\s\S]*?```/gi, '');

  // 2. Handle code blocks smoothly - instead of reading syntax, speak a natural notice
  const hasCode = /```(?:python|javascript|typescript|bash|sh|json|html|css|cpp|c|sql)?[\s\S]*?```/i.test(speech);
  speech = speech.replace(/```[\s\S]*?```/gi, ' I wrote that code snippet in the chat for you. ');

  // 3. Remove inline code backticks
  speech = speech.replace(/`([^`]+)`/g, '$1');

  // 4. Handle LaTeX equations verbally
  speech = speech.replace(/\$\$[\s\S]*?\$\$/g, ' as shown in the equation in chat. ');
  speech = speech.replace(/\$([^\$]+)\$/g, '$1');

  // 5. Replace markdown headers with natural pauses
  speech = speech.replace(/#{1,6}\s*(.*?)(?:\n|$)/g, '$1. ');

  // 6. Convert markdown links: [Title](url) -> Title
  speech = speech.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove raw URLs
  speech = speech.replace(/https?:\/\/\S+/g, 'link in chat');

  // 7. Remove bold and italics formatting
  speech = speech.replace(/(\*\*|__)(.*?)\1/g, '$2');
  speech = speech.replace(/(\*|_)(.*?)\1/g, '$2');

  // 8. Transform numbered and bulleted lists into smooth spoken conversational transitions
  const rawLines = speech.split('\n').map((l) => l.trim()).filter(Boolean);
  const convertedLines: string[] = [];
  let bulletIndex = 0;

  for (const line of rawLines) {
    const listMatch = line.match(/^(\d+[\.\)]|[\*\-\+])\s+(.*)/);
    if (listMatch) {
      const itemContent = listMatch[2].trim();
      bulletIndex++;
      if (bulletIndex === 1) {
        convertedLines.push(`First, ${itemContent}`);
      } else if (bulletIndex === 2) {
        convertedLines.push(`Also, ${itemContent}`);
      } else if (bulletIndex === 3) {
        convertedLines.push(`Plus, ${itemContent}`);
      } else {
        convertedLines.push(`And ${itemContent}`);
      }
    } else {
      bulletIndex = 0;
      convertedLines.push(line);
    }
  }
  speech = convertedLines.join(' ');

  // 9. Replace stiff / robotic AI cliches with natural spoken expressions
  speech = speech
    .replace(/\bIn order to\b/gi, 'To')
    .replace(/\bFurthermore\b/gi, 'Also')
    .replace(/\bIn addition\b/gi, 'And')
    .replace(/\bIt is important to note that\b/gi, 'Keep in mind that')
    .replace(/\bAs an AI\b/gi, '')
    .replace(/\bAs a language model\b/gi, '')
    .replace(/\bIn conclusion\b/gi, 'Overall')
    .replace(/\bTo summarize\b/gi, 'In short')
    .replace(/\bAction executed:?\b/gi, 'Done,')
    .replace(/\bSystem operational\b/gi, 'All good');

  // 10. Math verbalization
  speech = speech
    .replace(/(\d+)\s*\^\s*(\d+)/g, '$1 to the power of $2')
    .replace(/(\d+)\s*([\+\-\*\/])\s*(\d+)/g, (_match, a, op, b) => {
      const opWord = op === '+' ? 'plus' : op === '-' ? 'minus' : op === '*' ? 'times' : 'divided by';
      return `${a} ${opWord} ${b}`;
    })
    .replace(/(\d+)%/g, '$1 percent');

  // 11. Normalize spaces and excessive punctuation
  speech = speech.replace(/\s+/g, ' ').trim();

  // 12. For conversational speaking, deliver punchy, human-length turns (up to ~3-4 sentences)
  // like ChatGPT voice mode, inviting back-and-forth rather than long monologues
  const sentences = speech.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [speech];
  if (sentences.length > 4) {
    speech = sentences.slice(0, 4).join(' ').trim();
  }

  return speech;
}

// Clean markdown, equations, and code blocks for full reading mode
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' Code snippet in chat. ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove LaTeX math
    .replace(/\$\$[\s\S]*?\$\$/g, ' math equation ')
    .replace(/\$([^\$]+)\$/g, ' $1 ')
    // Remove action blocks
    .replace(/```action[\s\S]*?```/gi, '')
    // Remove markdown headers and emphasis
    .replace(/#{1,6}\s?/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove bullet points
    .replace(/^[\*\-\+]\s+/gm, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent voice selector that scores available system voices
 * to find the highest-quality natural / neural voice matching the requested persona.
 */
export function getBestVoiceForPersona(persona: VoicePersona): {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
} {
  const config = VOICE_PERSONAS[persona] || VOICE_PERSONAS.breeze;
  const voices = loadVoices();
  if (voices.length === 0) {
    return { voice: null, rate: config.defaultRate, pitch: config.defaultPitch };
  }

  const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

  let bestVoice: SpeechSynthesisVoice | null = null;
  let highestScore = -1;

  for (const v of candidatePool) {
    let score = 0;
    const nameLower = v.name.toLowerCase();

    // High quality neural/natural markers
    if (nameLower.includes('natural') || nameLower.includes('online (natural)')) score += 50;
    if (nameLower.includes('enhanced') || nameLower.includes('premium')) score += 40;
    if (nameLower.includes('google')) score += 30;
    if (nameLower.includes('siri') || nameLower.includes('neural')) score += 35;

    // US / GB natural preference
    if (v.lang === 'en-US') score += 15;
    if (v.lang.startsWith('en')) score += 10;

    // Filter out low quality synthetic voices if possible
    if (nameLower.includes('espeak') || nameLower.includes('klatt')) score -= 50;

    // Persona-specific matching
    if (persona === 'breeze') {
      // Warm, natural, casual male/neutral (ChatGPT Breeze archetype)
      if (nameLower.includes('google us english')) score += 40;
      if (nameLower.includes('guy') || nameLower.includes('jenny')) score += 30;
      if (nameLower.includes('alex') || nameLower.includes('samantha')) score += 25;
    } else if (persona === 'cove') {
      // Deep, calm, relaxed
      if (nameLower.includes('guy') || nameLower.includes('daniel') || nameLower.includes('male')) score += 40;
      if (nameLower.includes('alex') || nameLower.includes('david')) score += 30;
    } else if (persona === 'ember') {
      // Lively, upbeat, expressive
      if (nameLower.includes('aria') || nameLower.includes('jenny') || nameLower.includes('female')) score += 40;
      if (nameLower.includes('samantha') || nameLower.includes('victoria')) score += 30;
    } else if (persona === 'juniper') {
      // Smooth, warm, approachable
      if (nameLower.includes('samantha') || nameLower.includes('victoria') || nameLower.includes('serena')) score += 40;
      if (nameLower.includes('natural') && nameLower.includes('female')) score += 35;
    } else if (persona === 'classic') {
      // Crisp, direct, articulate technical
      if (nameLower.includes('google uk english male') || nameLower.includes('daniel')) score += 40;
      if (v.lang === 'en-GB') score += 25;
    }

    if (score > highestScore) {
      highestScore = score;
      bestVoice = v;
    }
  }

  return {
    voice: bestVoice || candidatePool[0] || null,
    rate: config.defaultRate,
    pitch: config.defaultPitch,
  };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  options?: {
    persona?: VoicePersona;
    style?: SpeakingStyle;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }
) {
  if (!isSpeechSynthesisSupported()) return;

  stopSpeaking();

  const persona = options?.persona || getStoredVoicePersona();
  const style = options?.style || getStoredSpeakingStyle();

  // Transform text depending on conversational vs full style
  const formattedText =
    style === 'conversational'
      ? toConversationalSpeech(text)
      : cleanTextForSpeech(text);

  if (!formattedText) {
    options?.onEnd?.();
    return;
  }

  // Split into chunks if exceeds browser speech synthesis length limits
  const sentences = formattedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [formattedText];
  const chunkText =
    style === 'conversational'
      ? sentences.slice(0, 4).join(' ')
      : sentences.slice(0, 8).join(' ');

  const utterance = new SpeechSynthesisUtterance(chunkText);
  activeUtterance = utterance;

  const { voice, rate, pitch } = getBestVoiceForPersona(persona);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.rate = rate;
  utterance.pitch = pitch;

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    activeUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    activeUtterance = null;
    options?.onError?.(e);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Quick preview player to let the user hear a voice persona before picking it.
 */
export function previewVoicePersona(persona: VoicePersona, onEnd?: () => void) {
  if (!isSpeechSynthesisSupported()) return;
  const config = VOICE_PERSONAS[persona];
  if (!config) return;

  speakText(config.samplePhrase, {
    persona,
    style: 'conversational',
    onEnd,
  });
}

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
    activeUtterance = null;
  }
}
