import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import {
  PiagamColumnElement,
  PiagamOrientation,
  PiagamTemplatePayload,
} from '@/types/piagam';
import { DEFAULT_PIAGAM_COLUMNS, extractGoogleDriveThumbnail } from '@/lib/utils/piagamHelper';

export const KEY_DB_PIAGAM_TEMPLATES = 'PIAGAM_TEMPLATES_CONFIG';
export const LS_PIAGAM_TEMPLATES = 'MADIN_PIAGAM_TEMPLATES';

interface PiagamState {
  templates: Record<string, PiagamTemplatePayload>;
  activeTemplateName: string;
  orientation: PiagamOrientation;
  driveLink: string;
  customBgUrl: string;
  bgType: 'drive' | 'custom';
  columns: PiagamColumnElement[];
  activeElementId: string | null;
  zoomScale: number; // 0.25 to 1.0
  selectedSantriIndukList: string[];
  currentPreviewIndex: number;
  isSantriModalOpen: boolean;
  isLoadingTemplates: boolean;

  // Actions
  loadTemplates: () => Promise<void>;
  saveTemplate: (name: string) => Promise<boolean>;
  loadTemplateByName: (name: string) => void;
  deleteTemplate: (name: string) => Promise<boolean>;
  setOrientation: (o: PiagamOrientation) => void;
  setDriveLink: (link: string) => void;
  setCustomBgUrl: (url: string) => void;
  clearBackground: () => void;
  setZoomScale: (zoom: number) => void;
  setActiveElementId: (id: string | null) => void;
  addColumn: () => void;
  removeColumn: (id: string) => void;
  updateColumn: (id: string, patch: Partial<PiagamColumnElement>) => void;
  toggleColumnProp: (id: string, prop: 'lockX' | 'lockY' | 'lockSize' | 'isBold') => void;
  resetCanvasToDefault: () => void;
  setSelectedSantriIndukList: (list: string[]) => void;
  setPreviewIndex: (idx: number) => void;
  openSantriModal: () => void;
  closeSantriModal: () => void;
}

export const usePiagamStore = create<PiagamState>((set, get) => ({
  templates: {},
  activeTemplateName: '',
  orientation: 'landscape',
  driveLink: '',
  customBgUrl: '',
  bgType: 'drive',
  columns: DEFAULT_PIAGAM_COLUMNS,
  activeElementId: 'col_1',
  zoomScale: 0.45,
  selectedSantriIndukList: [],
  currentPreviewIndex: 0,
  isSantriModalOpen: false,
  isLoadingTemplates: false,

  loadTemplates: async () => {
    set({ isLoadingTemplates: true });
    // 1. Muat dari localStorage
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(LS_PIAGAM_TEMPLATES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            set({ templates: parsed });
          }
        }
      }
    } catch (e) {
      console.warn('Gagal memuat cache template piagam:', e);
    }

    // 2. Muat dari Supabase app_settings
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_PIAGAM_TEMPLATES)
        .maybeSingle();

      if (!error && data && data.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (parsed && typeof parsed === 'object') {
          const merged = { ...get().templates, ...parsed };
          set({ templates: merged });
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_PIAGAM_TEMPLATES, JSON.stringify(merged));
          }
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat template dari Supabase:', err.message);
    } finally {
      set({ isLoadingTemplates: false });
    }
  },

  saveTemplate: async (name: string) => {
    if (!name || !name.trim()) return false;
    const cleanName = name.trim();
    const payload: PiagamTemplatePayload = {
      driveLink: get().driveLink,
      customBgUrl: get().customBgUrl,
      orientation: get().orientation,
      columns: JSON.parse(JSON.stringify(get().columns)),
    };

    const updated = {
      ...get().templates,
      [cleanName]: payload,
    };

    set({ templates: updated, activeTemplateName: cleanName });

    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PIAGAM_TEMPLATES, JSON.stringify(updated));
    }

    try {
      await supabase.from('app_settings').upsert(
        { key: KEY_DB_PIAGAM_TEMPLATES, value: JSON.stringify(updated) },
        { onConflict: 'key' }
      );
      await logActivity('SIMPAN TEMPLATE PIAGAM', `Menyimpan template piagam: "${cleanName}"`);
      return true;
    } catch (err: any) {
      console.warn('Gagal sinkron template ke Supabase:', err.message);
      return false;
    }
  },

  loadTemplateByName: (name: string) => {
    if (!name) {
      set({ activeTemplateName: '' });
      return;
    }
    const tpl = get().templates[name];
    if (!tpl) return;

    set({
      activeTemplateName: name,
      driveLink: tpl.driveLink || '',
      customBgUrl: tpl.customBgUrl || '',
      orientation: tpl.orientation || 'landscape',
      columns: JSON.parse(JSON.stringify(tpl.columns || DEFAULT_PIAGAM_COLUMNS)),
      activeElementId: tpl.columns?.[0]?.id || 'col_1',
    });
  },

  deleteTemplate: async (name: string) => {
    if (!name) return false;
    const updated = { ...get().templates };
    delete updated[name];

    set({
      templates: updated,
      activeTemplateName: get().activeTemplateName === name ? '' : get().activeTemplateName,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_PIAGAM_TEMPLATES, JSON.stringify(updated));
    }

    try {
      await supabase.from('app_settings').upsert(
        { key: KEY_DB_PIAGAM_TEMPLATES, value: JSON.stringify(updated) },
        { onConflict: 'key' }
      );
      await logActivity('HAPUS TEMPLATE PIAGAM', `Menghapus template piagam: "${name}"`);
      return true;
    } catch (err: any) {
      console.warn('Gagal menghapus template dari Supabase:', err.message);
      return false;
    }
  },

  setOrientation: (orientation) => set({ orientation }),
  setDriveLink: (driveLink) => set({ driveLink, bgType: 'drive' }),
  setCustomBgUrl: (customBgUrl) => set({ customBgUrl, bgType: 'custom' }),
  clearBackground: () => set({ driveLink: '', customBgUrl: '', bgType: 'drive' }),
  setZoomScale: (zoomScale) => set({ zoomScale }),
  setActiveElementId: (activeElementId) => set({ activeElementId }),

  addColumn: () => {
    const current = get().columns;
    const nextNum = current.length + 1;
    const newId = `col_${Date.now()}`;
    const newCol: PiagamColumnElement = {
      id: newId,
      title: `Blok Teks ${nextNum}`,
      text: 'Teks Baru...\n<<NAMA>>',
      x: 50,
      y: Math.min(85, 30 + nextNum * 8),
      size: 20,
      color: '#0f172a',
      fontFamily: "'Inter', sans-serif",
      isBold: false,
      align: 'center',
      textTransform: 'none',
      show: true,
      lockX: false,
      lockY: false,
      lockSize: false,
    };

    set({
      columns: [...current, newCol],
      activeElementId: newId,
    });
  },

  removeColumn: (id) => {
    const filtered = get().columns.filter((c) => c.id !== id);
    set({
      columns: filtered,
      activeElementId: get().activeElementId === id ? filtered[0]?.id || null : get().activeElementId,
    });
  },

  updateColumn: (id, patch) => {
    set((state) => ({
      columns: state.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  toggleColumnProp: (id, prop) => {
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === id ? { ...c, [prop]: !c[prop] } : c
      ),
    }));
  },

  resetCanvasToDefault: () => {
    set({
      columns: DEFAULT_PIAGAM_COLUMNS,
      activeElementId: 'col_1',
      orientation: 'landscape',
    });
  },

  setSelectedSantriIndukList: (list) => {
    set({
      selectedSantriIndukList: list,
      currentPreviewIndex: 0,
    });
  },

  setPreviewIndex: (idx) => set({ currentPreviewIndex: idx }),
  openSantriModal: () => set({ isSantriModalOpen: true }),
  closeSantriModal: () => set({ isSantriModalOpen: false }),
}));
