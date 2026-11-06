'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  NotebookPen,
  CheckSquare,
  Square,
  Pin,
  Plus,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { useCatatanStore } from '@/stores/useCatatanStore';

export default function CatatanTodoWidget() {
  const { notes, toggleTodoItem, addTodoItem } = useCatatanStore();
  const [activeTab, setActiveTab] = useState<'todo' | 'pinned'>('todo');
  const [quickTodoText, setQuickTodoText] = useState('');

  // Kumpulkan semua To-Do lintas catatan beserta noteId asalnya
  const todoData = useMemo(() => {
    const items: Array<{
      noteId: string;
      noteTitle: string;
      todoId: string;
      text: string;
      completed: boolean;
      priority: string;
    }> = [];

    notes.forEach((n) => {
      (n.todos || []).forEach((td) => {
        items.push({
          noteId: n.id,
          noteTitle: n.title,
          todoId: td.id,
          text: td.text,
          completed: td.completed,
          priority: td.priority,
        });
      });
    });

    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Urutkan yang belum selesai di atas
    const sorted = [...items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return 0;
    });

    return {
      items: sorted.slice(0, 5),
      total,
      completed,
      pending: total - completed,
      pct,
    };
  }, [notes]);

  const pinnedNotes = useMemo(() => {
    const pinned = notes.filter((n) => n.isPinned);
    return (pinned.length > 0 ? pinned : notes).slice(0, 3);
  }, [notes]);

  const handleQuickAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTodoText.trim();
    if (!trimmed) return;
    const targetNote =
      notes.find((n) => (n.todos || []).length > 0) || notes[0];
    if (!targetNote) return;

    await addTodoItem(targetNote.id, trimmed, 'penting');
    setQuickTodoText('');
  };

  return (
    <div
      data-testid="dashboard-widget-catatan"
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Header Widget */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <NotebookPen className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Catatan & To-Do List Aktif
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Checklist operasional harian & catatan penting yang disematkan
            </p>
          </div>

          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/80 text-[11px] font-bold">
            <button
              type="button"
              data-testid="dashboard-catatan-tab-todo"
              onClick={() => setActiveTab('todo')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'todo'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              To-Do ({todoData.pending})
            </button>
            <button
              type="button"
              data-testid="dashboard-catatan-tab-pinned"
              onClick={() => setActiveTab('pinned')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                activeTab === 'pinned'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Pin className="w-3 h-3 text-amber-600" />
              <span>Disematkan ({pinnedNotes.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'todo' ? (
          <div>
            {/* Bar Progres Penyelesaian To-Do */}
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60 mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-indigo-950">
                  Progres Penyelesaian Tugas
                </span>
                <span className="font-extrabold text-indigo-700">
                  {todoData.completed}/{todoData.total} Selesai ({todoData.pct}%)
                </span>
              </div>
              <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${todoData.pct}%` }}
                />
              </div>
            </div>

            {/* Form Tambah Tugas Cepat dari Dashboard */}
            <form onSubmit={handleQuickAddTodo} className="flex gap-2 mb-3">
              <input
                type="text"
                data-testid="dashboard-quick-todo-input"
                value={quickTodoText}
                onChange={(e) => setQuickTodoText(e.target.value)}
                placeholder="Tambah tugas To-Do cepat dari Dashboard..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
              <button
                type="submit"
                data-testid="dashboard-quick-todo-submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            {/* Daftar Checklist To-Do Interaktif */}
            <div className="space-y-2">
              {todoData.items.map((td) => (
                <button
                  key={`${td.noteId}-${td.todoId}`}
                  type="button"
                  data-testid={`dashboard-todo-item-${td.todoId}`}
                  onClick={() => toggleTodoItem(td.noteId, td.todoId)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    td.completed
                      ? 'bg-slate-50/70 border-slate-200/50 text-slate-400'
                      : 'bg-white hover:bg-indigo-50/30 border-slate-200/80 text-slate-800'
                  }`}
                >
                  {td.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold leading-snug ${
                        td.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {td.text}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      Catatan: {td.noteTitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pinnedNotes.map((note) => (
              <Link
                key={note.id}
                href="/catatan"
                className="block p-3 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/70 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    <Pin className="w-2.5 h-2.5" />
                    {note.category.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {(note.todos || []).length} To-Do
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                  {note.title}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                  {note.summary || note.content}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer Pintasan */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          <span>{notes.length} dokumen catatan tersimpan</span>
        </div>
        <Link
          href="/catatan"
          className="font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 hover:underline"
        >
          <span>Buka Catatan</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
