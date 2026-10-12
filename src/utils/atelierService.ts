import { AtelierProject, ProjectNote } from '../types';

const STORAGE_KEY_PROJECTS = 'victor_atelier_projects_v1';
const STORAGE_KEY_ACTIVE_PROJECT = 'victor_active_project_id_v1';

const DEFAULT_PROJECTS: AtelierProject[] = [
  {
    id: 'proj_default_1',
    title: 'Research & Ideas Studio',
    description: 'A focused space for deep dives, literature synthesis, and knowledge curation.',
    icon: '💡',
    customInstructions: 'Act as a rigorous researcher and analytical collaborator. Challenge assumptions and cite clear conceptual models.',
    notes: [
      {
        id: 'note_1',
        title: 'Project Objectives & Scope',
        content: '# Research Objectives\n- Synthesize key insights across domains\n- Maintain clear summaries with actionable conclusions\n- Keep reference notes updated after every productive session.',
        createdAt: Date.now() - 1000 * 60 * 60 * 48,
        updatedAt: Date.now() - 1000 * 60 * 60 * 12,
      },
      {
        id: 'note_2',
        title: 'Working Hypotheses & Guidelines',
        content: 'Focus on clear logic, high-signal information density, and structured outlines.',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        updatedAt: Date.now() - 1000 * 60 * 60 * 6,
      },
    ],
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
  },
];

export function getAtelierProjects(): AtelierProject[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_PROJECTS;
  } catch (err) {
    console.warn('Failed to load Atelier projects from localStorage:', err);
    return DEFAULT_PROJECTS;
  }
}

export function saveAtelierProjects(projects: AtelierProject[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.warn('Failed to save Atelier projects to localStorage:', err);
  }
}

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT) || null;
  } catch {
    return null;
  }
}

export function setActiveProjectId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PROJECT);
    }
  } catch (err) {
    console.warn('Failed to save active Atelier project id:', err);
  }
}

export function createAtelierProject(
  title: string,
  description?: string,
  customInstructions?: string,
  icon: string = '📁'
): AtelierProject {
  const current = getAtelierProjects();
  const newProj: AtelierProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || 'Untitled Workspace',
    description: description?.trim() || '',
    customInstructions: customInstructions?.trim() || '',
    icon,
    notes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updated = [newProj, ...current];
  saveAtelierProjects(updated);
  return newProj;
}

export function updateAtelierProject(updatedProj: AtelierProject): AtelierProject[] {
  const current = getAtelierProjects();
  const next = current.map((p) =>
    p.id === updatedProj.id ? { ...updatedProj, updatedAt: Date.now() } : p
  );
  saveAtelierProjects(next);
  return next;
}

export function deleteAtelierProject(id: string): AtelierProject[] {
  const current = getAtelierProjects();
  const next = current.filter((p) => p.id !== id);
  saveAtelierProjects(next);
  if (getActiveProjectId() === id) {
    setActiveProjectId(null);
  }
  return next;
}

export function addProjectNote(
  projectId: string,
  title: string,
  content: string
): { updatedProjects: AtelierProject[]; newNote: ProjectNote } | null {
  const current = getAtelierProjects();
  const target = current.find((p) => p.id === projectId);
  if (!target) return null;

  const newNote: ProjectNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim() || 'Untitled Note',
    content: content.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedTarget: AtelierProject = {
    ...target,
    notes: [newNote, ...target.notes],
    updatedAt: Date.now(),
  };

  const next = current.map((p) => (p.id === projectId ? updatedTarget : p));
  saveAtelierProjects(next);
  return { updatedProjects: next, newNote };
}

export function updateProjectNote(
  projectId: string,
  noteId: string,
  title: string,
  content: string
): AtelierProject[] {
  const current = getAtelierProjects();
  const target = current.find((p) => p.id === projectId);
  if (!target) return current;

  const updatedNotes = target.notes.map((n) =>
    n.id === noteId
      ? {
          ...n,
          title: title.trim() || n.title,
          content: content.trim(),
          updatedAt: Date.now(),
        }
      : n
  );

  const updatedTarget: AtelierProject = {
    ...target,
    notes: updatedNotes,
    updatedAt: Date.now(),
  };

  const next = current.map((p) => (p.id === projectId ? updatedTarget : p));
  saveAtelierProjects(next);
  return next;
}

export function deleteProjectNote(projectId: string, noteId: string): AtelierProject[] {
  const current = getAtelierProjects();
  const target = current.find((p) => p.id === projectId);
  if (!target) return current;

  const updatedTarget: AtelierProject = {
    ...target,
    notes: target.notes.filter((n) => n.id !== noteId),
    updatedAt: Date.now(),
  };

  const next = current.map((p) => (p.id === projectId ? updatedTarget : p));
  saveAtelierProjects(next);
  return next;
}

/**
 * Builds the contextual directives injected into Victor's prompt when inside an Atelier Workspace.
 */
export function buildAtelierContext(project: AtelierProject | null): string {
  if (!project) return '';

  const notesList = project.notes
    .map(
      (n, i) => `### Note ${i + 1}: ${n.title}\n${n.content}`
    )
    .join('\n\n');

  return `
# ACTIVE ATELIER WORKSPACE: "${project.title}"
You are operating within the user's dedicated Atelier workspace titled "${project.title}".
${project.description ? `Workspace Overview: ${project.description}` : ''}
${project.customInstructions ? `Workspace Custom Directives: ${project.customInstructions}` : ''}

${
  notesList
    ? `Pinned Workspace Reference Documents & Notebook Notes:\n${notesList}`
    : 'No reference notes have been pinned in this workspace yet.'
}

Instruction: Ground your recommendations and tone within this workspace context. When the user asks you to take notes, update their project scratchpad, or save thoughts to Atelier, you can save a note into this project workspace by appending:
\`\`\`action
{"type": "save_project_note", "title": "Note Title", "content": "Full markdown note content"}
\`\`\`
`.trim();
}

/**
 * Syncs Atelier projects with the server when a user signs in.
 */
export async function syncAtelierWithServer(email: string): Promise<AtelierProject[]> {
  if (!email) return getAtelierProjects();
  try {
    const res = await fetch('/api/atelier', {
      headers: { 'x-user-email': email },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        saveAtelierProjects(data.projects);
        return data.projects;
      }
    }
  } catch (err) {
    console.warn('Could not sync Atelier projects from server:', err);
  }
  return getAtelierProjects();
}

/**
 * Persists Atelier projects to the server for a logged-in user.
 */
export function saveAtelierProjectsToServer(projects: AtelierProject[], email: string): void {
  if (!email) return;
  fetch('/api/atelier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': email,
    },
    body: JSON.stringify({ projects }),
  }).catch((err) => {
    console.warn('Failed saving Atelier projects to server:', err);
  });
}
