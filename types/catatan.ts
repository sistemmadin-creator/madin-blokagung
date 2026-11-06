export type CatatanNoteCategory =
  | 'panduan'
  | 'kurikulum'
  | 'muhafadzoh'
  | 'kesiswaan'
  | 'umum';

export type CatatanFilterTab = 'ALL' | 'TODO' | CatatanNoteCategory;

export type CatatanColorTheme = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';

export type TodoPriority = 'penting' | 'normal';

export interface CatatanTodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: TodoPriority;
  createdAt: string;
}

export interface CatatanSectionBlock {
  id: string;
  heading: string;
  paragraphs: string[];
  codeSnippet?: {
    label: string;
    language: string;
    code: string;
  };
  bullets?: string[];
}

export interface CatatanItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  structuredSections?: CatatanSectionBlock[];
  category: CatatanNoteCategory;
  colorTheme: CatatanColorTheme;
  isPinned: boolean;
  todos: CatatanTodoItem[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
}

export const CATATAN_CATEGORY_META: Record<
  CatatanNoteCategory,
  { label: string; badgeClass: string }
> = {
  panduan: {
    label: 'Panduan & Sistem IT',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  muhafadzoh: {
    label: 'PKM. Muhafadzoh',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  kurikulum: {
    label: 'PKM. Kurikulum',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  kesiswaan: {
    label: 'PKM. Kesiswaan',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  umum: {
    label: 'Umum & Rapat',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};
