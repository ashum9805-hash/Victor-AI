import React, { useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  FolderPlus,
  Sparkles,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  CheckSquare,
  Copy,
  Layers,
  FileText,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AtelierProject, ProjectNote, UserTask } from '../types';
import {
  createAtelierProject,
  updateAtelierProject,
  deleteAtelierProject,
  addProjectNote,
  updateProjectNote,
  deleteProjectNote,
} from '../utils/atelierService';

interface AtelierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: AtelierProject[];
  onProjectsChange: (projects: AtelierProject[]) => void;
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onStartProjectChat: (project: AtelierProject) => void;
  tasks: UserTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (title: string, projectId?: string) => void;
}

export const AtelierDrawer: React.FC<AtelierDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  onProjectsChange,
  activeProjectId,
  onSelectProject,
  onStartProjectChat,
  tasks,
  onToggleTask,
  onAddTask,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'directives' | 'tasks' | 'all_projects'>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Note edit/create state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteTitleDraft, setNoteTitleDraft] = useState('');
  const [noteContentDraft, setNoteContentDraft] = useState('');

  // Project edit/create state
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectDirectives, setNewProjectDirectives] = useState('');
  const [newProjectIcon, setNewProjectIcon] = useState('📁');

  // Directives edit state
  const [directivesDraft, setDirectivesDraft] = useState('');
  const [isEditingDirectives, setIsEditingDirectives] = useState(false);

  // New task inline state
  const [newTaskInput, setNewTaskInput] = useState('');

  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  const projectTasks = tasks.filter((t) => t.projectId === activeProject?.id);

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const created = createAtelierProject(
      newProjectTitle,
      newProjectDesc,
      newProjectDirectives,
      newProjectIcon
    );
    const updated = [created, ...projects];
    onProjectsChange(updated);
    onSelectProject(created.id);
    setIsCreatingProject(false);
    setNewProjectTitle('');
    setNewProjectDesc('');
    setNewProjectDirectives('');
    setActiveTab('notes');
  };

  const handleSaveNote = () => {
    if (!activeProject || !noteTitleDraft.trim()) return;

    if (selectedNoteId) {
      const updated = updateProjectNote(
        activeProject.id,
        selectedNoteId,
        noteTitleDraft,
        noteContentDraft
      );
      onProjectsChange(updated);
    } else {
      const res = addProjectNote(activeProject.id, noteTitleDraft, noteContentDraft);
      if (res) {
        onProjectsChange(res.updatedProjects);
        setSelectedNoteId(res.newNote.id);
      }
    }
    setIsEditingNote(false);
  };

  const handleDeleteCurrentNote = (noteId: string) => {
    if (!activeProject) return;
    const updated = deleteProjectNote(activeProject.id, noteId);
    onProjectsChange(updated);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setIsEditingNote(false);
    }
  };

  const handleSaveDirectives = () => {
    if (!activeProject) return;
    const updated: AtelierProject = {
      ...activeProject,
      customInstructions: directivesDraft,
    };
    const nextList = updateAtelierProject(updated);
    onProjectsChange(nextList);
    setIsEditingDirectives(false);
  };

  const handleDeleteProject = (projId: string) => {
    const nextList = deleteAtelierProject(projId);
    onProjectsChange(nextList);
    if (activeProjectId === projId) {
      const fallback = nextList[0]?.id || null;
      onSelectProject(fallback);
    }
  };

  const selectedNote = activeProject?.notes.find((n) => n.id === selectedNoteId);

  return (
    <>
      {/* Backdrop */}
      <div
        id="atelier-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
      />

      {/* Drawer */}
      <div
        id="atelier-drawer"
        className="fixed top-0 bottom-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 font-serif font-bold text-sm">
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Atelier
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-medium">
                  Workspace
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {activeProject ? activeProject.title : 'Creative & Project Studio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="atelier-new-workspace-btn"
              onClick={() => setIsCreatingProject((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
              title="Create a new Atelier workspace"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              type="button"
              id="atelier-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close Atelier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Selector Bar */}
        <div className="px-5 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            {projects.map((proj) => {
              const isSelected = proj.id === activeProject?.id;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(proj.id);
                    setSelectedNoteId(null);
                    setIsEditingNote(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{proj.icon || '📁'}</span>
                  <span className="truncate max-w-[120px]">{proj.title}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('all_projects')}
            className={`text-[11px] shrink-0 font-medium px-2 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'all_projects'
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Manage
          </button>
        </div>

        {/* New Project Creator Dropdown */}
        {isCreatingProject && (
          <form
            onSubmit={handleCreateNewProject}
            className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-200 dark:border-indigo-900/60 space-y-3 shrink-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                Create Atelier Workspace
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Icon (e.g. 📚, 🔬, 💻)"
                value={newProjectIcon}
                onChange={(e) => setNewProjectIcon(e.target.value)}
                className="w-14 text-center text-sm p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
              <input
                type="text"
                required
                placeholder="Workspace Title (e.g. Biology Research, Novel Draft)"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="flex-1 text-xs p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            <input
              type="text"
              placeholder="Brief overview or goal (optional)"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full text-xs p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />

            <textarea
              rows={2}
              placeholder="Custom instructions for Victor in this workspace (e.g. Speak as a writing coach; use APA format)..."
              value={newProjectDirectives}
              onChange={(e) => setNewProjectDirectives(e.target.value)}
              className="w-full text-xs p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </form>
        )}

        {/* Tab Navigation */}
        {activeTab !== 'all_projects' && (
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-200 dark:border-zinc-800 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('notes');
                setIsEditingNote(false);
              }}
              className={`pb-2 px-1 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Notebook</span>
              <span className="text-[10px] text-zinc-400">({activeProject?.notes.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('directives');
                setDirectivesDraft(activeProject?.customInstructions || '');
              }}
              className={`pb-2 px-1 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ml-3 ${
                activeTab === 'directives'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Directives</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`pb-2 px-1 border-b-2 font-medium transition-colors flex items-center gap-1.5 cursor-pointer ml-3 ${
                activeTab === 'tasks'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
              <span className="text-[10px] text-zinc-400">({projectTasks.length})</span>
            </button>

            {activeProject && (
              <button
                type="button"
                onClick={() => {
                  onStartProjectChat(activeProject);
                  onClose();
                }}
                className="ml-auto pb-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Launch a chat with this workspace context loaded"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Chat in Workspace</span>
              </button>
            )}
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. NOTEBOOK / NOTES TAB */}
          {activeTab === 'notes' && activeProject && (
            <div className="space-y-4">
              {isEditingNote ? (
                /* Note Editor */
                <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedNoteId ? 'Edit Reference Note' : 'New Reference Note'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Note Title (e.g. Chapter 1 Outline, Exam Formulas)"
                    value={noteTitleDraft}
                    onChange={(e) => setNoteTitleDraft(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />

                  <textarea
                    rows={8}
                    placeholder="Write reference notes, requirements, or documentation in Markdown..."
                    value={noteContentDraft}
                    onChange={(e) => setNoteContentDraft(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono resize-y leading-relaxed"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-400">
                      Markdown supported · Injected into Victor's context
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ) : selectedNote ? (
                /* Selected Note Detail View */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSelectedNoteId(null)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>← Back to all notes</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedNote.content);
                          setCopiedNoteId(selectedNote.id);
                          setTimeout(() => setCopiedNoteId(null), 2000);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                        title="Copy note text"
                      >
                        {copiedNoteId === selectedNote.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNoteTitleDraft(selectedNote.title);
                          setNoteContentDraft(selectedNote.content);
                          setIsEditingNote(true);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                        title="Edit note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCurrentNote(selectedNote.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedNote.title}
                  </h3>

                  <div className="prose prose-zinc dark:prose-invert max-w-none text-xs leading-relaxed p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80">
                    <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                /* Notes List */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Pinned Notes & References
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Victor automatically reads these notes whenever you converse in this workspace.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNoteId(null);
                        setNoteTitleDraft('');
                        setNoteContentDraft('');
                        setIsEditingNote(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Note</span>
                    </button>
                  </div>

                  {activeProject.notes.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 space-y-2">
                      <FileText className="w-6 h-6 mx-auto text-zinc-400" />
                      <p>No reference notes yet.</p>
                      <p className="text-[11px] text-zinc-500">
                        Add project outlines, specs, or summaries so Victor always has them in context!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeProject.notes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/70 hover:bg-white dark:bg-zinc-900/50 dark:hover:bg-zinc-900 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {note.title}
                            </h4>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                              {note.content}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. DIRECTIVES TAB */}
          {activeTab === 'directives' && activeProject && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60">
                <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Workspace Persona & Directives</span>
                </div>
                <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                  These instructions are automatically prepended to every conversation you start in this workspace. Use them to tailor Victor's tone, focus areas, formatting, or constraints.
                </p>
              </div>

              {isEditingDirectives ? (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    value={directivesDraft}
                    onChange={(e) => setDirectivesDraft(e.target.value)}
                    placeholder="e.g., Speak like a Senior Software Architect; keep answers concise and provide unit test examples; assume Python 3.12..."
                    className="w-full text-xs p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDirectives(false)}
                      className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDirectives}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
                    >
                      Save Directives
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {activeProject.customInstructions ? (
                      activeProject.customInstructions
                    ) : (
                      <span className="italic text-zinc-400">
                        No custom directives set for this workspace. Victor will follow his standard adaptive companion behavior.
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDirectivesDraft(activeProject.customInstructions || '');
                      setIsEditingDirectives(true);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Directives</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. WORKSPACE TASKS TAB */}
          {activeTab === 'tasks' && activeProject && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskInput.trim()) return;
                  onAddTask(newTaskInput.trim(), activeProject.id);
                  setNewTaskInput('');
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder={`Add a task for "${activeProject.title}"...`}
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors shrink-0"
                >
                  Add Task
                </button>
              </form>

              {projectTasks.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <CheckSquare className="w-5 h-5 mx-auto text-zinc-400" />
                  <p>No missions linked to this workspace yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {projectTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onToggleTask(t.id)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => {}}
                        className="rounded accent-indigo-600 pointer-events-none"
                      />
                      <span
                        className={`flex-1 truncate ${
                          t.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.priority && (
                        <span className="text-[10px] uppercase font-mono text-zinc-400">
                          {t.priority}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. ALL PROJECTS MANAGER TAB */}
          {activeTab === 'all_projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  All Atelier Workspaces
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Workspace</span>
                </button>
              </div>

              <div className="space-y-2">
                {projects.map((proj) => {
                  const isCurrent = proj.id === activeProject?.id;
                  return (
                    <div
                      key={proj.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-indigo-500/80 bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          setActiveTab('notes');
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className="text-base">{proj.icon || '📁'}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {proj.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {proj.notes.length} notes · {proj.description || 'No description'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onStartProjectChat(proj);
                            onClose();
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="Open new chat with this workspace"
                        >
                          Chat
                        </button>

                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectProject(null);
                    onClose();
                  }}
                  className="w-full py-2 text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Exit Workspace Mode (Standard Chat)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
