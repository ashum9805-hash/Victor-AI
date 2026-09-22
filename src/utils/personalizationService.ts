import { PersonalizationSettings, UserMemoryItem } from '../types';

const STORAGE_KEY_SETTINGS = 'victor_personalization_v1';
const STORAGE_KEY_MEMORIES = 'victor_memories_v1';

const DEFAULT_MEMORIES: UserMemoryItem[] = [
  {
    id: 'mem_1',
    text: 'Prefers clear, friendly conversation and practical code solutions',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    source: 'auto',
  },
];

export function getPersonalizationSettings(): PersonalizationSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, memories: DEFAULT_MEMORIES };
  }

  try {
    const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const rawMemories = localStorage.getItem(STORAGE_KEY_MEMORIES);

    let enabled = true;
    let customInstructions = '';

    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (typeof parsed.enabled === 'boolean') enabled = parsed.enabled;
      if (typeof parsed.customInstructions === 'string') customInstructions = parsed.customInstructions;
    }

    let memories: UserMemoryItem[] = DEFAULT_MEMORIES;
    if (rawMemories) {
      const parsedMemories = JSON.parse(rawMemories);
      if (Array.isArray(parsedMemories)) {
        memories = parsedMemories;
      }
    }

    return { enabled, memories, customInstructions };
  } catch (e) {
    console.warn('Failed to load personalization settings:', e);
    return { enabled: true, memories: DEFAULT_MEMORIES };
  }
}

export function savePersonalizationSettings(settings: PersonalizationSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      STORAGE_KEY_SETTINGS,
      JSON.stringify({
        enabled: settings.enabled,
        customInstructions: settings.customInstructions || '',
      })
    );
    localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(settings.memories));
  } catch (e) {
    console.warn('Failed to save personalization settings to localStorage:', e);
  }
}

export function addMemory(text: string, source: 'auto' | 'manual' = 'manual'): PersonalizationSettings {
  const trimmed = text.trim();
  const current = getPersonalizationSettings();
  if (!trimmed) return current;

  // Deduplicate case-insensitively
  const exists = current.memories.some(
    (m) => m.text.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return current;

  const newMemory: UserMemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    createdAt: Date.now(),
    source,
  };

  const updatedMemories = [newMemory, ...current.memories].slice(0, 50); // Cap at 50 memories
  const updatedSettings: PersonalizationSettings = {
    ...current,
    memories: updatedMemories,
  };

  savePersonalizationSettings(updatedSettings);
  return updatedSettings;
}

export function removeMemory(id: string): PersonalizationSettings {
  const current = getPersonalizationSettings();
  const updatedSettings: PersonalizationSettings = {
    ...current,
    memories: current.memories.filter((m) => m.id !== id),
  };
  savePersonalizationSettings(updatedSettings);
  return updatedSettings;
}

export function clearAllMemories(): PersonalizationSettings {
  const current = getPersonalizationSettings();
  const updatedSettings: PersonalizationSettings = {
    ...current,
    memories: [],
  };
  savePersonalizationSettings(updatedSettings);
  return updatedSettings;
}

export function togglePersonalization(enabled: boolean): PersonalizationSettings {
  const current = getPersonalizationSettings();
  const updatedSettings: PersonalizationSettings = {
    ...current,
    enabled,
  };
  savePersonalizationSettings(updatedSettings);
  return updatedSettings;
}

export function updateCustomInstructions(instructions: string): PersonalizationSettings {
  const current = getPersonalizationSettings();
  const updatedSettings: PersonalizationSettings = {
    ...current,
    customInstructions: instructions,
  };
  savePersonalizationSettings(updatedSettings);
  return updatedSettings;
}

/**
 * Builds the contextual instructions injected into Victor's prompt when Personalization is ON.
 * If Personalization is OFF, returns empty string.
 */
export function buildPersonalizationContext(settings: PersonalizationSettings): string {
  if (!settings.enabled) {
    return '';
  }

  const memoryLines = settings.memories.map((m) => `- ${m.text}`).join('\n');
  const customInstr = settings.customInstructions?.trim()
    ? `\n# USER CUSTOM DIRECTIVES:\n${settings.customInstructions.trim()}`
    : '';

  if (!memoryLines && !customInstr) {
    return '';
  }

  return `
# ACTIVE PERSONALIZATION & REMEMBERED USER CONTEXT
Personalization is ENABLED. You know the following facts, preferences, and background about the user across conversations:
${memoryLines || '- No specific memories saved yet.'}
${customInstr}

Instruction: Use these facts naturally to tailor your tone, examples, and recommendations without forcing the user to repeat themselves. Adapt to whatever topic the user is actively talking about.
`.trim();
}

/**
 * Sync personalization data with server if email is provided
 */
export async function syncPersonalizationWithServer(
  userEmail?: string | null
): Promise<PersonalizationSettings> {
  const local = getPersonalizationSettings();
  if (!userEmail) return local;

  try {
    const res = await fetch(`/api/personalization?email=${encodeURIComponent(userEmail)}`, {
      headers: {
        'x-user-email': userEmail,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.enabled === 'boolean') {
        const mergedMemories = data.memories || local.memories;
        const merged: PersonalizationSettings = {
          enabled: data.enabled,
          memories: mergedMemories,
          customInstructions: data.customInstructions ?? local.customInstructions,
        };
        savePersonalizationSettings(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not sync personalization from server:', err);
  }

  return local;
}

export async function savePersonalizationToServer(
  settings: PersonalizationSettings,
  userEmail?: string | null
): Promise<void> {
  savePersonalizationSettings(settings);

  if (!userEmail) return;

  try {
    await fetch('/api/personalization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
      },
      body: JSON.stringify({
        email: userEmail,
        enabled: settings.enabled,
        memories: settings.memories,
        customInstructions: settings.customInstructions,
      }),
    });
  } catch (err) {
    console.warn('Could not save personalization to server:', err);
  }
}
