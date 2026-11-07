'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  CheckSquare,
  Square,
  Trash2,
  Edit3,
  Copy,
  Check,
  X,
  Tag,
  Clock,
  Terminal,
  Sparkles,
  ListTodo,
  BookOpen,
} from 'lucide-react';
import { useCatatanStore } from '@/stores/useCatatanStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  CATATAN_CATEGORY_META,
  CatatanColorTheme,
  CatatanFilterTab,
  CatatanItem,
  CatatanNoteCategory,
  TodoPriority,
} from '@/types/catatan';

const THEME_ACCENT_STYLES: Record<
  CatatanColorTheme,
  { borderLeft: string; headerBg: string; dot: string; label: string }
> = {
  emerald: {
    borderLeft: 'border-l-emerald-600',
    headerBg: 'bg-emerald-50/70',
    dot: 'bg-emerald-600',
    label: 'Hijau Zamrud',
  },
  blue: {
    borderLeft: 'border-l-blue-600',
    headerBg: 'bg-blue-50/70',
    dot: 'bg-blue-600',
    label: 'Biru Panduan',
  },
  amber: {
    borderLeft: 'border-l-amber-500',
    headerBg: 'bg-amber-50/70',
    dot: 'bg-amber-500',
    label: 'Kuning Perhatian',
  },
  rose: {
    borderLeft: 'border-l-rose-600',
    headerBg: 'bg-rose-50/70',
    dot: 'bg-rose-600',
    label: 'Merah Prioritas',
  },
  slate: {
    borderLeft: 'border-l-slate-500',
    headerBg: 'bg-slate-50',
    dot: 'bg-slate-500',
    label: 'Abu Netral',
  },
};

export default function CatatanModule() {
  const {
    notes,
    isLoading,
    fetchCatatan,
    addCatatan,
    updateCatatan,
    deleteCatatan,
    togglePinCatatan,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
  } = useCatatanStore();

  const { currentAccount, canCreate, canEdit, canDelete } =
    usePagePermission('catatan');

  const [activeTab, setActiveTab] = useState<CatatanFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('note-panduan-waha-gateway');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Input To-Do cepat pada panel detail
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('normal');

  // Toast & Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Buat / Edit Catatan
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CatatanItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formCategory, setFormCategory] = useState<CatatanNoteCategory>('panduan');
  const [formTheme, setFormTheme] = useState<CatatanColorTheme>('emerald');
  const [formPinned, setFormPinned] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formTagsInput, setFormTagsInput] = useState('');
  const [formTodos, setFormTodos] = useState<
    Array<{ id?: string; text: string; completed?: boolean; priority: TodoPriority }>
  >([]);
  const [draftModalTodo, setDraftModalTodo] = useState('');
  const [draftModalTodoPriority, setDraftModalTodoPriority] =
    useState<TodoPriority>('normal');
  const [todoFilterMode, setTodoFilterMode] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    void fetchCatatan();
  }, [fetchCatatan]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleCopyText = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`${label} berhasil disalin ke clipboard.`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      showToast('Gagal menyalin teks ke clipboard.');
    }
  };

  // Ringkasan KPI
  const kpiStats = useMemo(() => {
    let totalTodos = 0;
    let completedTodos = 0;
    let pinnedCount = 0;

    notes.forEach((n) => {
      if (n.isPinned) pinnedCount++;
      n.todos.forEach((t) => {
        totalTodos++;
        if (t.completed) completedTodos++;
      });
    });

    return {
      totalNotes: notes.length,
      pinnedCount,
      totalTodos,
      completedTodos,
      pendingTodos: totalTodos - completedTodos,
    };
  }, [notes]);

  // Filter & Urutkan Catatan (Pinned di atas, lalu terbaru)
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return notes
      .filter((note) => {
        if (activeTab === 'TODO') {
          if (note.todos.length === 0) return false;
          if (todoFilterMode === 'pending' && !note.todos.some((t) => !t.completed)) {
            return false;
          }
        } else if (activeTab !== 'ALL') {
          if (note.category !== activeTab) return false;
        }

        if (q) {
          const matchTitle = note.title.toLowerCase().includes(q);
          const matchSummary = note.summary.toLowerCase().includes(q);
          const matchContent = note.content.toLowerCase().includes(q);
          const matchTags = note.tags.some((t) => t.toLowerCase().includes(q));
          const matchTodo = note.todos.some((t) =>
            t.text.toLowerCase().includes(q)
          );
          if (
            !matchTitle &&
            !matchSummary &&
            !matchContent &&
            !matchTags &&
            !matchTodo
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [notes, activeTab, searchQuery, todoFilterMode]);

  // Catatan aktif yang sedang ditampilkan di panel kanan (sinkron murni dengan hasil filter)
  const activeNote: CatatanItem | null = useMemo(() => {
    if (filteredNotes.length === 0) return null;
    const found = filteredNotes.find((n) => n.id === selectedNoteId);
    return found || filteredNotes[0];
  }, [filteredNotes, selectedNoteId]);

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormSummary('');
    setFormCategory('umum');
    setFormTheme('emerald');
    setFormPinned(false);
    setFormContent('');
    setFormTagsInput('');
    setFormTodos([]);
    setDraftModalTodo('');
    setDraftModalTodoPriority('normal');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (note: CatatanItem) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormSummary(note.summary);
    setFormCategory(note.category);
    setFormTheme(note.colorTheme);
    setFormPinned(note.isPinned);
    setFormContent(note.content);
    setFormTagsInput(note.tags.join(', '));
    setFormTodos([...note.todos]);
    setDraftModalTodo('');
    setDraftModalTodoPriority('normal');
    setIsFormModalOpen(true);
  };

  const handleSaveFormModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul catatan wajib diisi.');
      return;
    }

    const parsedTags = formTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const mergedTodos = [...formTodos];
    if (draftModalTodo.trim()) {
      mergedTodos.push({
        id: `todo-${Date.now()}`,
        text: draftModalTodo.trim(),
        completed: false,
        priority: draftModalTodoPriority,
      });
    }

    if (editingNote) {
      await updateCatatan(editingNote.id, {
        title: formTitle.trim(),
        summary: formSummary.trim() || undefined,
        category: formCategory,
        colorTheme: formTheme,
        isPinned: formPinned,
        content: formContent,
        tags: parsedTags.length > 0 ? parsedTags : editingNote.tags,
        todos: mergedTodos.map((td, idx) => ({
          id: td.id || `todo-${Date.now()}-${idx}`,
          text: td.text,
          completed: Boolean(td.completed),
          priority: td.priority || 'normal',
          createdAt: new Date().toISOString(),
        })),
      });
      showToast('Perubahan catatan berhasil disimpan.');
    } else {
      const created = await addCatatan({
        title: formTitle.trim(),
        summary: formSummary.trim() || undefined,
        content: formContent,
        category: formCategory,
        colorTheme: formTheme,
        isPinned: formPinned,
        todos: mergedTodos.map((td) => ({
          text: td.text,
          priority: td.priority,
        })),
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        author: currentAccount?.full_name || 'Master Administrator',
      });
      setSelectedNoteId(created.id);
      showToast('Catatan baru berhasil ditambahkan.');
    }

    setIsFormModalOpen(false);
  };

  const handleAddTodoInDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !newTodoText.trim()) return;
    await addTodoItem(activeNote.id, newTodoText.trim(), newTodoPriority);
    setNewTodoText('');
    setNewTodoPriority('normal');
  };

  const handleDeleteNote = async (note: CatatanItem) => {
    if (!confirm(`Hapus catatan "${note.title}"?`)) return;
    await deleteCatatan(note.id);
    showToast('Catatan berhasil dihapus.');
  };

  const filterTabs: Array<{ id: CatatanFilterTab; label: string }> = [
    { id: 'ALL', label: `Semua (${notes.length})` },
    { id: 'TODO', label: `To-Do List (${kpiStats.pendingTodos} Aktif)` },
    { id: 'panduan', label: 'Panduan & Sistem IT' },
    { id: 'muhafadzoh', label: 'PKM. Muhafadzoh' },
    { id: 'kurikulum', label: 'PKM. Kurikulum' },
    { id: 'kesiswaan', label: 'PKM. Kesiswaan' },
    { id: 'umum', label: 'Umum & Rapat' },
  ];

  const renderFormattedContent = (text: string) => {
    if (!text) return 'Belum ada uraian teks pada catatan ini.';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline font-semibold hover:text-emerald-900 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderNoteDetailContent = (note: CatatanItem) => {
    const catMeta = CATATAN_CATEGORY_META[note.category] || CATATAN_CATEGORY_META.umum;
    const doneCount = note.todos.filter((t) => t.completed).length;
    const totalCount = note.todos.length;
    const progressPct =
      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    const isDefaultUnmodifiedWaha =
      note.id === 'note-panduan-waha-gateway' &&
      note.structuredSections &&
      note.structuredSections.length > 0;

    return (
      <div className="space-y-6">
        {/* Header Detail Catatan */}
        <div className="pb-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${catMeta.badgeClass}`}
              >
                {catMeta.label}
              </span>
              {note.isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                  <Pin className="w-3 h-3 fill-amber-500 text-amber-600" />
                  Disematkan
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="btn-copy-full-note"
                onClick={() =>
                  void handleCopyText(
                    `full-${note.id}`,
                    `${note.title}\n\n${note.content}`,
                    'Seluruh isi catatan'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
                title="Salin seluruh isi catatan"
              >
                {copiedKey === `full-${note.id}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Salin Catatan</span>
              </button>

              {canEdit && (
                <>
                  <button
                    type="button"
                    data-testid={`btn-pin-detail-${note.id}`}
                    onClick={() => void togglePinCatatan(note.id)}
                    className={`p-1.5 rounded-xl border transition cursor-pointer ${
                      note.isPinned
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                    title={
                      note.isPinned
                        ? 'Lepas sematan catatan'
                        : 'Sematkan catatan ke urutan paling atas'
                    }
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    data-testid="btn-edit-catatan"
                    onClick={() => handleOpenEditModal(note)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit</span>
                  </button>
                </>
              )}

              {canDelete && note.id !== 'note-panduan-waha-gateway' && (
                <button
                  type="button"
                  data-testid="btn-delete-catatan"
                  onClick={() => void handleDeleteNote(note)}
                  className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                  title="Hapus catatan ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <h2
            data-testid="detail-note-title"
            className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug"
          >
            {note.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Diperbarui: {new Date(note.updatedAt).toLocaleDateString('id-ID')}
            </span>
            <span>•</span>
            <span>Oleh: {note.author}</span>
            {note.tags.length > 0 && (
              <>
                <span>•</span>
                <div className="flex flex-wrap items-center gap-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Isi Dokumen Catatan */}
        <div
          data-testid="detail-note-body"
          className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed"
        >
          {isDefaultUnmodifiedWaha ? (
            <div className="space-y-5">
              {note.structuredSections!.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3"
                >
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{sec.heading}</span>
                  </h3>

                  {sec.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {p}
                    </p>
                  ))}

                  {sec.codeSnippet && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100">
                      <div className="px-3.5 py-2 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>{sec.codeSnippet.label}</span>
                        </span>
                        <button
                          type="button"
                          data-testid={`btn-copy-snippet-${sec.id}`}
                          onClick={() =>
                            void handleCopyText(
                              `snippet-${sec.id}`,
                              sec.codeSnippet!.code,
                              sec.codeSnippet!.label
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white font-semibold cursor-pointer transition"
                        >
                          {copiedKey === `snippet-${sec.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Salin</span>
                        </button>
                      </div>
                      <pre className="p-3.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-emerald-100">
                        {sec.codeSnippet.code}
                      </pre>
                    </div>
                  )}

                  {sec.bullets && sec.bullets.length > 0 && (
                    <ul className="space-y-2 pl-4 list-disc text-xs sm:text-sm text-slate-700">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 whitespace-pre-wrap break-words font-sans text-xs sm:text-sm text-slate-800 leading-relaxed">
              {renderFormattedContent(note.content)}
            </div>
          )}
        </div>

        {/* Bagian To-Do List Interaktif */}
        <div
          data-testid="catatan-todo-section"
          className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <ListTodo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Daftar Tugas / To-Do List Catatan Ini
                </h3>
                <p className="text-[11px] text-slate-500">
                  Centang langkah atau tugas yang sudah selesai dikerjakan
                </p>
              </div>
            </div>

            <span
              data-testid="todo-progress-badge"
              className="px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-800 font-mono text-xs font-bold"
            >
              {doneCount} / {totalCount} Selesai ({progressPct}%)
            </span>
          </div>

          {/* Progress Bar To-Do */}
          {totalCount > 0 && (
            <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-emerald-100">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* Daftar Item To-Do */}
          {note.todos.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-center text-xs text-slate-400">
              Belum ada daftar tugas (To-Do) pada catatan ini. Tambahkan tugas baru di bawah.
            </div>
          ) : (
            <div className="space-y-2">
              {note.todos.map((todo) => (
                <div
                  key={todo.id}
                  data-testid={`todo-item-${todo.id}`}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                    todo.completed
                      ? 'bg-slate-50/90 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200/90 text-slate-800 shadow-2xs'
                  }`}
                >
                  <button
                    type="button"
                    data-testid={`checkbox-todo-${todo.id}`}
                    onClick={() => void toggleTodoItem(note.id, todo.id)}
                    className="flex items-start gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    {todo.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 hover:text-emerald-700 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-xs sm:text-sm font-medium break-words ${
                          todo.completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {todo.text}
                      </span>
                      {todo.priority === 'penting' && !todo.completed && (
                        <span className="ml-2 inline-block px-2 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                          Prioritas Penting
                        </span>
                      )}
                    </div>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      data-testid={`btn-delete-todo-${todo.id}`}
                      onClick={() => void deleteTodoItem(note.id, todo.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                      title="Hapus item tugas ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form Tambah Item To-Do Cepat */}
          {canEdit && (
            <form
              onSubmit={handleAddTodoInDetail}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1"
            >
              <input
                type="text"
                data-testid="input-new-todo"
                placeholder="Tambah item tugas / to-do baru..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newTodoPriority}
                  onChange={(e) =>
                    setNewTodoPriority(e.target.value as TodoPriority)
                  }
                  aria-label="Prioritas Tugas"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="normal">Normal</option>
                  <option value="penting">Penting</option>
                </select>
                <button
                  type="submit"
                  data-testid="btn-add-todo"
                  className="px-4 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Utama & Ringkasan KPI */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1
              data-testid="heading-catatan-module"
              className="text-xl sm:text-2xl font-extrabold text-slate-900"
            >
              Catatan & To-Do List Madrasah
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 max-w-2xl">
              Pusat penyimpanan catatan operasional, dokumentasi sistem (termasuk panduan keamanan WAHA Gateway), dan daftar tugas pengurus.
            </p>
          </div>
        </div>

        {/* Statistik Ringkas & Tombol Buat Catatan */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500">Total Catatan: </span>
            <strong className="font-mono text-slate-900">{kpiStats.totalNotes}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-emerald-800">To-Do Selesai: </span>
            <strong className="font-mono text-emerald-950">
              {kpiStats.completedTodos}/{kpiStats.totalTodos}
            </strong>
          </div>

          {canCreate && (
            <button
              type="button"
              data-testid="btn-buat-catatan-baru"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Catatan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Bilah Filter Kategori & Pencarian */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tab Kategori */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {filterTabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`tab-catatan-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-[#134e3a] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Input Pencarian */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="input-search-catatan"
              placeholder="Cari judul, isi catatan, atau tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Workspace Dua Panel (Kiri: Daftar Kartu 5 Kolom, Kanan: Pembaca & To-Do 7 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Kiri: Daftar Kartu Catatan */}
        <div className="lg:col-span-5 min-w-0 space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1.5">
          {activeTab === 'TODO' && (
            <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 px-3.5 py-2 rounded-xl text-xs">
              <span className="font-bold text-emerald-950">Filter To-Do:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTodoFilterMode('pending')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    todoFilterMode === 'pending'
                      ? 'bg-[#134e3a] text-white shadow-2xs'
                      : 'bg-white/80 text-emerald-800 hover:bg-white'
                  }`}
                >
                  Tugas Aktif ({kpiStats.pendingTodos})
                </button>
                <button
                  type="button"
                  onClick={() => setTodoFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    todoFilterMode === 'all'
                      ? 'bg-[#134e3a] text-white shadow-2xs'
                      : 'bg-white/80 text-emerald-800 hover:bg-white'
                  }`}
                >
                  Semua ({notes.filter((n) => n.todos.length > 0).length})
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
              Memuat daftar catatan...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Tidak ada catatan yang cocok
              </p>
              <p className="text-xs text-slate-500">
                Ubah filter kategori atau buat catatan baru menggunakan tombol di atas.
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              const catMeta =
                CATATAN_CATEGORY_META[note.category] || CATATAN_CATEGORY_META.umum;
              const themeStyle =
                THEME_ACCENT_STYLES[note.colorTheme] || THEME_ACCENT_STYLES.emerald;
              const doneTodos = note.todos.filter((t) => t.completed).length;
              const totalTodos = note.todos.length;

              return (
                <div
                  key={note.id}
                  data-testid={`catatan-card-${note.id}`}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setIsMobileDetailOpen(true);
                  }}
                  className={`p-4 rounded-2xl bg-white border border-l-4 transition cursor-pointer shadow-2xs ${
                    themeStyle.borderLeft
                  } ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`btn-quick-pin-${note.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePinCatatan(note.id);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition cursor-pointer ${
                          note.isPinned
                            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                        title={
                          note.isPinned
                            ? 'Lepas sematan'
                            : 'Sematkan catatan ke urutan paling atas'
                        }
                      >
                        <Pin
                          className={`w-2.5 h-2.5 ${
                            note.isPinned
                              ? 'fill-amber-500 text-amber-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>{note.isPinned ? 'Disematkan' : 'Sematkan'}</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {note.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {note.summary}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                    {totalTodos > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                        <CheckSquare className="w-3 h-3 text-emerald-600" />
                        <span>
                          To-Do: {doneTodos}/{totalTodos}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Catatan Dokumen</span>
                    )}

                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(note.updatedAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Kanan: Pembaca Catatan & To-Do List Interaktif (Desktop) */}
        <div
          data-testid="catatan-detail-panel"
          className="lg:col-span-7 min-w-0 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs"
        >
          {activeNote ? (
            renderNoteDetailContent(activeNote)
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Pilih salah satu catatan di sebelah kiri untuk membaca isi lengkap dan mengelola daftar tugas (To-Do List).
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Catatan khusus Tampilan HP (Mobile) */}
      {isMobileDetailOpen && activeNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex flex-col bg-white overflow-y-auto"
        >
          <div className="sticky top-0 z-10 px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 truncate">
              Detail Catatan & To-Do List
            </span>
            <button
              type="button"
              onClick={() => setIsMobileDetailOpen(false)}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </button>
          </div>
          <div className="p-4 flex-1">{renderNoteDetailContent(activeNote)}</div>
        </div>
      )}

      {/* Modal Buat / Edit Catatan */}
      {isFormModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-form-catatan"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingNote ? 'Edit Catatan' : 'Buat Catatan & To-Do Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveFormModal}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Catatan *
                </label>
                <input
                  type="text"
                  required
                  data-testid="input-judul-catatan"
                  placeholder="Contoh: Notulensi Rapat Evaluasi Muhafadzoh..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika ingin ringkasan otomatis dibuat dari isi catatan..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Bidang
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as CatatanNoteCategory)
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="panduan">Panduan & Sistem IT</option>
                    <option value="muhafadzoh">PKM. Muhafadzoh</option>
                    <option value="kurikulum">PKM. Kurikulum</option>
                    <option value="kesiswaan">PKM. Kesiswaan</option>
                    <option value="umum">Umum & Rapat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warna Aksen Kartu
                  </label>
                  <select
                    value={formTheme}
                    onChange={(e) =>
                      setFormTheme(e.target.value as CatatanColorTheme)
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="emerald">Hijau Zamrud</option>
                    <option value="blue">Biru Panduan</option>
                    <option value="amber">Kuning Perhatian</option>
                    <option value="rose">Merah Prioritas</option>
                    <option value="slate">Abu Netral</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="rounded text-emerald-700 accent-emerald-700 w-4 h-4"
                  />
                  <span>Sematkan catatan ini di urutan paling atas</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Catatan / Dokumentasi
                </label>
                <textarea
                  rows={6}
                  data-testid="input-isi-catatan"
                  placeholder="Tuliskan rincian catatan, panduan, atau notulensi di sini..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    {editingNote
                      ? 'Daftar Tugas / To-Do List Catatan'
                      : 'Daftar Tugas / To-Do Awal (Opsional)'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {formTodos.length} tugas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    data-testid="input-modal-todo-draft"
                    placeholder="Ketik item tugas lalu klik + Tambah..."
                    value={draftModalTodo}
                    onChange={(e) => setDraftModalTodo(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!draftModalTodo.trim()) return;
                        setFormTodos((prev) => [
                          ...prev,
                          {
                            text: draftModalTodo.trim(),
                            priority: draftModalTodoPriority,
                          },
                        ]);
                        setDraftModalTodo('');
                      }
                    }}
                  />
                  <select
                    value={draftModalTodoPriority}
                    onChange={(e) =>
                      setDraftModalTodoPriority(e.target.value as TodoPriority)
                    }
                    aria-label="Prioritas To-Do"
                    className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    <option value="normal">Normal</option>
                    <option value="penting">Penting</option>
                  </select>
                  <button
                    type="button"
                    data-testid="btn-modal-add-todo-draft"
                    onClick={() => {
                      if (!draftModalTodo.trim()) return;
                      setFormTodos((prev) => [
                        ...prev,
                        {
                          text: draftModalTodo.trim(),
                          priority: draftModalTodoPriority,
                        },
                      ]);
                      setDraftModalTodo('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold cursor-pointer"
                  >
                    + Tambah
                  </button>
                </div>

                {formTodos.length > 0 && (
                  <ul className="space-y-1 text-xs text-slate-700 max-h-36 overflow-y-auto">
                    {formTodos.map((td, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate">• {td.text}</span>
                          {td.priority === 'penting' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold shrink-0">
                              Penting
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormTodos((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-rose-500 hover:text-rose-700 text-[11px] font-bold shrink-0 ml-2"
                        >
                          Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Label / Tag (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat, Kurikulum, Target Mingguan"
                  value={formTagsInput}
                  onChange={(e) => setFormTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-catatan"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
