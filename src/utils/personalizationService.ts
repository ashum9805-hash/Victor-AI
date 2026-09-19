import { PersonalizationMemory } from '../types';

const STORAGE_KEY_ENABLED = 'victor_personalization_enabled_v1';
const STORAGE_KEY_MEMORIES = 'victor_memories_v1';

export const DEFAULT_INITIAL_MEMORIES: PersonalizationMemory[] = [
  {
    id: 'mem_py_cs',
    content: 'User is heavily focused on Python programming, computer science, and full-stack development.',
    category: 'project',
    source: 'manual',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'mem_tone',
    content: 'Prefers clean, readable code and natural, conversational explanations without robotic jargon.',
    category: 'preference',
    source: 'manual',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
];

export function isPersonalizationEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_ENABLED);
    if (val === null) return true; // Enabled by default
    return val === 'true';
  } catch {
    return true;
  }
}

export function setPersonalizationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
  } catch {
    // Fallback
  }
}

export function getStoredMemories(): PersonalizationMemory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_INITIAL_MEMORIES;
}

export function saveStoredMemories(memories: PersonalizationMemory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(memories));
  } catch {
    // Fallback
  }
}

export function addStoredMemory(
  content: string,
  category: PersonalizationMemory['category'] = 'general',
  source: PersonalizationMemory['source'] = 'manual'
): PersonalizationMemory {
  const current = getStoredMemories();
  const trimmed = content.trim();
  
  // Check if a similar memory already exists
  const existing = current.find(
    (m) => m.content.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    return existing;
  }

  const newMem: PersonalizationMemory = {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    content: trimmed,
    category,
    source,
    createdAt: Date.now(),
  };

  const updated = [newMem, ...current];
  saveStoredMemories(updated);
  return newMem;
}

export function removeStoredMemory(id: string): PersonalizationMemory[] {
  const current = getStoredMemories();
  const updated = current.filter((m) => m.id !== id);
  saveStoredMemories(updated);
  return updated;
}

export function clearAllStoredMemories(): void {
  saveStoredMemories([]);
}

export function formatMemoriesForSystemInstruction(): string {
  if (!isPersonalizationEnabled()) {
    return '';
  }

  const memories = getStoredMemories();
  if (memories.length === 0) {
    return '';
  }

  const bullets = memories.map((m) => `- ${m.content}`).join('\n');

  return `
# USER PERSONALIZATION & CROSS-CHAT MEMORY (Active)
The user has enabled Personalization. You remember these preferences, ongoing projects, and background facts across all conversations so they never need to repeat themselves:
${bullets}

Guidelines for Memory:
- Seamlessly adapt your answers to these details when relevant.
- Do NOT artificially force or mention these facts if the user is asking about an unrelated topic (e.g. if they ask about cooking or a recipe, focus purely on cooking).
- If the user asks you to remember something new (e.g. "Remember that...", "Note that..."), acknowledge it naturally and output an action block: \`\`\`action
{"type": "save_memory", "fact": "..."}
\`\`\`
`.trim();
}
