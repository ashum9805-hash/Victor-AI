import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Briefcase,
  Code2,
  Layers,
  BookOpen,
  Heart,
  GraduationCap,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { UserTask, UserProfile } from '../types';

interface TaskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: UserTask[];
  onAddTask: (task: Omit<UserTask, 'id' | 'createdAt' | 'completed'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onClearCompleted: () => void;
  currentUser?: UserProfile | null;
  onOpenSignIn?: () => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearCompleted,
  currentUser,
  onOpenSignIn,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<UserTask['category']>('projects');
  const [newPriority, setNewPriority] = useState<UserTask['priority']>('high');
  const [newDueDate, setNewDueDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active' && task.completed) return false;
    if (filter === 'completed' && !task.completed) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      dueDate: newDueDate.trim() || undefined,
    });
    setNewTitle('');
    setNewDueDate('');
    setShowAddForm(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'code':
        return <Code2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'projects':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
      case 'learning':
        return <BookOpen className="w-3.5 h-3.5 text-sky-500" />;
      case 'personal':
        return <Heart className="w-3.5 h-3.5 text-rose-500" />;
      case 'college':
        return <GraduationCap className="w-3.5 h-3.5 text-purple-500" />;
      case 'application':
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-900/60">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-900/60">
            Medium
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
            Low
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-950 h-full flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Mission Board and Tasks"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
              V
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                Mission Board & Tasks
              </h2>
              <div className="flex items-center gap-1.5 text-[11px]">
                {currentUser ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate max-w-[180px]">Synced to {currentUser.email}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSignIn}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                  >
                    Local Only · Sign In to Sync
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task board"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3 bg-zinc-100/60 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Milestone Progress</span>
            <span className="text-zinc-500 font-mono">
              {completedCount} / {tasks.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filters and Add button */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'active'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Active ({tasks.length - completedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'completed'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Done ({completedCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Cancel' : 'New Task'}</span>
          </button>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2.5"
          >
            <input
              type="text"
              placeholder="e.g., Build new feature, test code, or draft thoughts"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <div className="flex gap-2 text-xs">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2 py-1.5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                <option value="projects">Projects</option>
                <option value="code">Code & Dev</option>
                <option value="learning">Learning & Study</option>
                <option value="personal">Personal</option>
                <option value="general">General</option>
              </select>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="px-2 py-1.5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <input
                type="text"
                placeholder="Due date (optional)"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Add Task
            </button>
          </form>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-400">
              <Layers className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">No tasks in this view</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                You can ask Victor in chat: <br />
                <span className="italic font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                  "Victor, add 'Build async API' to my tasks"
                </span>
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-60'
                    : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="mt-0.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                  title={task.completed ? 'Mark as active' : 'Mark as completed'}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium leading-snug break-words ${
                      task.completed
                        ? 'line-through text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {task.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                      {getCategoryIcon(task.category)}
                      {task.category}
                    </span>
                    {getPriorityBadge(task.priority)}
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                        <Clock className="w-3 h-3" />
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 transition-all rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {completedCount > 0 && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs bg-zinc-50 dark:bg-zinc-900/40">
            <span className="text-[11px] text-zinc-500">
              {completedCount} completed task{completedCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={onClearCompleted}
              className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
            >
              Clear completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
