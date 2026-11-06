import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConfigMenuGroup, SidebarConfigState, CloudSyncStatus } from '@/types/sidebar-config';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

export const DEFAULT_SIDEBAR_GROUPS: ConfigMenuGroup[] = [
  {
    id: 'grp-beranda',
    group: 'Beranda',
    items: [
      {
        id: 'item-dashboard',
        title: 'Dashboard',
        href: '/dashboard',
        iconName: 'LayoutDashboard',
        badge: 'Live',
      },
    ],
  },
  {
    id: 'grp-utama',
    group: 'Utama',
    items: [
      { id: 'item-santri', title: 'Data Santri', href: '/santri', iconName: 'Users' },
      { id: 'item-asatidz', title: 'Data Asatidz', href: '/asatidz', iconName: 'UserCheck' },
      { id: 'item-catatan', title: 'Catatan', href: '/catatan', iconName: 'FileText' },
    ],
  },
  {
    id: 'grp-kurikulum',
    group: 'PKM. Kurikulum',
    items: [
      {
        id: 'item-jadwal-kbm',
        title: 'Jadwal KBM',
        href: '/jadwal-kbm',
        iconName: 'Calendar',
        children: [
          { id: 'sub-jadwal-kelas', title: 'Jadwal KBM Per Kelas', href: '/jadwal-kbm', iconName: 'Calendar' },
          { id: 'sub-hari-kbm', title: 'Hari KBM', href: '/hari-kbm', iconName: 'CalendarDays' },
          { id: 'sub-kalender-kegiatan', title: 'Kalender Kegiatan', href: '/kalender-kegiatan', iconName: 'CalendarDays' },
        ],
      },
      {
        id: 'item-formasi',
        title: 'Formasi Kelas',
        href: '/formasi',
        iconName: 'Building2',
        children: [
          { id: 'sub-formasi-all', title: 'Semua Kelas (Master)', href: '/formasi' },
          { id: 'sub-formasi-pa', title: 'Kelas Putra', href: '/formasi/pa' },
          { id: 'sub-formasi-pi', title: 'Kelas Putri', href: '/formasi/pi' },
        ],
      },
      {
        id: 'item-fan',
        title: 'Fan Pelajaran',
        href: '/fan/pelajaran',
        iconName: 'BookMarked',
        children: [
          { id: 'sub-fan-all', title: 'Daftar Fan Pelajaran', href: '/fan/pelajaran' },
          { id: 'sub-fan-pengajar', title: 'Pengajar Fan', href: '/fan/pengajar' },
        ],
      },
      { id: 'item-pendidik', title: 'Daftar Pendidik', href: '/daftar-pendidik', iconName: 'GraduationCap' },
    ],
  },
  {
    id: 'grp-muhafadzoh',
    group: 'PKM. Muhafadzoh',
    items: [
      { id: 'item-setoran', title: 'Setoran', href: '/setoran', iconName: 'Grid' },
      {
        id: 'item-setor-mustahiq',
        title: 'Setor Mustahiq',
        href: '/setor-mustahiq',
        iconName: 'BookOpen',
        children: [
          {
            id: 'sub-setor-kelas',
            title: 'Setor Kelas',
            href: '/setor-mustahiq',
            iconName: 'BookOpen',
          },
          {
            id: 'sub-rekap-setor-mustahiq',
            title: 'Rekap Setor',
            href: '/setor-mustahiq/rekap',
            iconName: 'BarChart2',
          },
        ],
      },
      { id: 'item-rekap-hafalan', title: 'Rekap Hafalan', href: '/rekap-hafalan', iconName: 'BarChart2' },
      { id: 'item-piagam', title: 'Cetak Piagam', href: '/piagam', iconName: 'Award' },
      { id: 'item-kirim-wa', title: 'Kirim WhatsApp', href: '/kirim-wa', iconName: 'MessageSquare' },
    ],
  },
  {
    id: 'grp-kesiswaan',
    group: 'PKM. Kesiswaan',
    items: [
      { id: 'item-absensi', title: 'Absensi Asatidz', href: '/absensi', iconName: 'ClipboardCheck' },
      { id: 'item-absen-cepat', title: 'Absen Cepat', href: '/absen-cepat', iconName: 'Zap' },
      { id: 'item-absen-konsorsium', title: 'Absen Konsorsium', href: '/absen-konsorsium', iconName: 'BookOpen' },
      {
        id: 'item-rekap-absensi',
        title: 'Rekap Absensi',
        href: '/rekap-absensi',
        iconName: 'BarChart2',
        children: [
          {
            id: 'sub-rekap-asatidz',
            title: 'Rekap Per Asatidz',
            href: '/rekap-absensi',
            iconName: 'BarChart2',
          },
          {
            id: 'sub-rekap-status',
            title: 'Rekap Status',
            href: '/rekap-absensi/status',
            iconName: 'ClipboardCheck',
          },
        ],
      },
    ],
  },
  {
    id: 'grp-sapras',
    group: 'PKM. Sapras',
    items: [
      {
        id: 'item-sapras-inventaris',
        title: 'Inventaris Kelas',
        href: '/sapras/inventaris-kelas',
        iconName: 'Package',
      },
      {
        id: 'item-sapras-perbaikan',
        title: 'Kerusakan & Perbaikan',
        href: '/sapras/perbaikan',
        iconName: 'Wrench',
      },
      {
        id: 'item-sapras-logistik',
        title: 'Logistik & ATK KBM',
        href: '/sapras/logistik',
        iconName: 'Grid',
      },
      {
        id: 'item-sapras-rekap',
        title: 'Rekap & Audit Sapras',
        href: '/sapras/rekap',
        iconName: 'BarChart2',
      },
    ],
  },
  {
    id: 'grp-publikasi',
    group: 'PKM. Publikasi & Warta',
    items: [
      { id: 'item-berita', title: 'Kelola Berita', href: '/kelola-berita', iconName: 'Newspaper' },
    ],
  },
  {
    id: 'grp-pengaturan',
    group: 'Pengaturan',
    items: [
      {
        id: 'item-pengaturan-hub',
        title: 'Pengaturan',
        href: '/pengaturan',
        iconName: 'Settings',
        children: [
          { id: 'sub-tahun-ajaran', title: 'Tahun Ajaran Aktif', href: '/pengaturan?tab=tahun-ajaran', iconName: 'CalendarDays' },
          { id: 'sub-akun', title: 'Kelola Akun & Otoritas', href: '/pengaturan?tab=akun', iconName: 'ShieldCheck' },
          { id: 'sub-hierarki', title: 'Pusat Kendali Admin', href: '/pengaturan?tab=hierarki', iconName: 'Sliders' },
          { id: 'sub-sidebar', title: 'Ubah Sidebar', href: '/pengaturan?tab=sidebar', iconName: 'LayoutList' },
          { id: 'sub-akademik', title: 'Aturan KBM & Libur', href: '/pengaturan?tab=akademik', iconName: 'CalendarDays' },
          { id: 'sub-muhafadzoh', title: 'Aturan Muhafadzoh', href: '/pengaturan?tab=muhafadzoh', iconName: 'BookOpen' },
          { id: 'sub-audit', title: 'Log Aktivitas Sistem', href: '/pengaturan?tab=audit', iconName: 'ShieldCheck' },
        ],
      },
    ],
  },
];

function mergeMissingDefaultItems(loadedGroups: ConfigMenuGroup[]): ConfigMenuGroup[] {
  if (!Array.isArray(loadedGroups) || loadedGroups.length === 0) return DEFAULT_SIDEBAR_GROUPS;

  const existingGroupIds = new Set(loadedGroups.map((g) => g.id));
  const existingItemIds = new Set<string>();
  loadedGroups.forEach((g) => {
    (g.items || []).forEach((it) => {
      existingItemIds.add(it.id);
    });
  });

  // 1. Merge missing items into existing groups and ensure essential groups are visible
  const merged = loadedGroups.map((g) => {
    const defGroup = DEFAULT_SIDEBAR_GROUPS.find((dg) => dg.id === g.id);
    if (!defGroup) return g;

    const missingItems = defGroup.items.filter((dit) => !existingItemIds.has(dit.id));
    const updatedItems = [...g.items];

    if (missingItems.length > 0) {
      missingItems.forEach((mit) => {
        const defIdx = defGroup.items.findIndex((x) => x.id === mit.id);
        if (defIdx >= 0 && defIdx <= updatedItems.length) {
          updatedItems.splice(defIdx, 0, { ...mit, hidden: false });
        } else {
          updatedItems.push({ ...mit, hidden: false });
        }
      });
    }

    // Ensure item-absen-konsorsium is not hidden accidentally and sync missing default children (e.g., Setor Mustahiq submenus)
    const finalItems = updatedItems.map((item) => {
      let nextItem = item;
      if (nextItem.id === 'item-absen-konsorsium' && nextItem.hidden) {
        nextItem = { ...nextItem, hidden: false };
      }
      const defItem = defGroup.items.find((di) => di.id === nextItem.id);
      if (defItem?.children && defItem.children.length > 0) {
        const existingChildren = Array.isArray(nextItem.children) ? nextItem.children : [];
        const existingSubIds = new Set(existingChildren.map((c) => c.id));
        const missingSubs = defItem.children.filter((dc) => !existingSubIds.has(dc.id));
        if (missingSubs.length > 0) {
          nextItem = {
            ...nextItem,
            children: [...existingChildren, ...missingSubs],
          };
        }
      }
      return nextItem;
    });

    return {
      ...g,
      hidden: g.id === 'grp-kesiswaan' || g.id === 'grp-sapras' ? false : g.hidden,
      items: finalItems,
    };
  });

  // 2. Add any default groups that are completely missing
  DEFAULT_SIDEBAR_GROUPS.forEach((defG) => {
    if (!existingGroupIds.has(defG.id)) {
      merged.push(defG);
    }
  });

  return merged;
}

export const useSidebarConfigStore = create<SidebarConfigState>()(
  persist(
    (set, get) => ({
      groups: DEFAULT_SIDEBAR_GROUPS,
      lastUpdated: undefined,
      cloudSyncStatus: 'idle',
      cloudMessage: undefined,

      renameGroup: (groupId: string, newName: string) => {
        const cleanName = newName.trim();
        if (!cleanName) return;
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, group: cleanName } : g)),
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
        }));
      },

      renameItem: (groupId: string, itemId: string, newTitle: string) => {
        const cleanTitle = newTitle.trim();
        if (!cleanTitle) return;
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map((item) =>
                item.id === itemId ? { ...item, title: cleanTitle } : item
              ),
            };
          }),
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
        }));
      },

      renameSubItem: (groupId: string, itemId: string, subId: string, newTitle: string) => {
        const cleanTitle = newTitle.trim();
        if (!cleanTitle) return;
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map((item) => {
                if (item.id !== itemId || !item.children) return item;
                return {
                  ...item,
                  children: item.children.map((sub) =>
                    sub.id === subId ? { ...sub, title: cleanTitle } : sub
                  ),
                };
              }),
            };
          }),
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
        }));
      },

      toggleGroupVisibility: (groupId: string) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, hidden: !g.hidden } : g
          ),
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
        }));
      },

      toggleItemVisibility: (groupId: string, itemId: string) => {
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map((item) =>
                item.id === itemId ? { ...item, hidden: !item.hidden } : item
              ),
            };
          }),
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
        }));
      },

      moveGroup: (groupId: string, direction: 'up' | 'down') => {
        set((state) => {
          const index = state.groups.findIndex((g) => g.id === groupId);
          if (index < 0) return state;
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= state.groups.length) return state;

          const newGroups = [...state.groups];
          const [removed] = newGroups.splice(index, 1);
          newGroups.splice(targetIndex, 0, removed);

          return {
            groups: newGroups,
            lastUpdated: new Date().toISOString(),
            cloudSyncStatus: 'idle',
          };
        });
      },

      moveItem: (groupId: string, itemId: string, direction: 'up' | 'down') => {
        set((state) => {
          const groupIndex = state.groups.findIndex((g) => g.id === groupId);
          if (groupIndex < 0) return state;

          const group = state.groups[groupIndex];
          const itemIndex = group.items.findIndex((item) => item.id === itemId);
          if (itemIndex < 0) return state;

          const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
          if (targetIndex < 0 || targetIndex >= group.items.length) return state;

          const newItems = [...group.items];
          const [removed] = newItems.splice(itemIndex, 1);
          newItems.splice(targetIndex, 0, removed);

          const newGroups = [...state.groups];
          newGroups[groupIndex] = { ...group, items: newItems };

          return {
            groups: newGroups,
            lastUpdated: new Date().toISOString(),
            cloudSyncStatus: 'idle',
          };
        });
      },

      moveItemToGroup: (sourceGroupId: string, targetGroupId: string, itemId: string) => {
        if (sourceGroupId === targetGroupId) return;
        set((state) => {
          const sourceIdx = state.groups.findIndex((g) => g.id === sourceGroupId);
          const targetIdx = state.groups.findIndex((g) => g.id === targetGroupId);
          if (sourceIdx < 0 || targetIdx < 0) return state;

          const sourceGroup = state.groups[sourceIdx];
          const targetGroup = state.groups[targetIdx];

          const item = sourceGroup.items.find((i) => i.id === itemId);
          if (!item) return state;

          const newSourceItems = sourceGroup.items.filter((i) => i.id !== itemId);
          const newTargetItems = [...targetGroup.items, item];

          const newGroups = [...state.groups];
          newGroups[sourceIdx] = { ...sourceGroup, items: newSourceItems };
          newGroups[targetIdx] = { ...targetGroup, items: newTargetItems };

          return {
            groups: newGroups,
            lastUpdated: new Date().toISOString(),
            cloudSyncStatus: 'idle',
          };
        });
      },

      resetToDefault: () => {
        set({
          groups: DEFAULT_SIDEBAR_GROUPS,
          lastUpdated: new Date().toISOString(),
          cloudSyncStatus: 'idle',
          cloudMessage: undefined,
        });
      },

      isCustomized: () => {
        const current = JSON.stringify(get().groups);
        const defaults = JSON.stringify(DEFAULT_SIDEBAR_GROUPS);
        return current !== defaults;
      },

      saveToSupabase: async () => {
        set({ cloudSyncStatus: 'syncing', cloudMessage: 'Menyimpan ke Supabase...' });
        const currentGroups = get().groups;
        const now = new Date().toISOString();

        try {
          const { error } = await supabase.from('app_settings').upsert([
            {
              key: 'SIDEBAR_CUSTOM_CONFIG',
              value: {
                groups: currentGroups,
                last_updated: now,
              },
            },
          ]);

          if (error) throw error;

          // Catat audit trail resmi
          await logActivity(
            'UBAH_SIDEBAR',
            `Pembaruan susunan navigasi sidebar (${currentGroups.length} grup menu tersimpan ke cloud)`
          );

          set({
            cloudSyncStatus: 'synced',
            cloudMessage: 'Konfigurasi sidebar berhasil disinkronkan ke Cloud Supabase!',
            lastUpdated: now,
          });
          return true;
        } catch (err: any) {
          console.warn('Gagal sinkronisasi sidebar ke Supabase (fallback ke penyimpanan lokal):', err);
          set({
            cloudSyncStatus: 'error',
            cloudMessage: 'Gagal menghubungkan ke Supabase. Perubahan tetap tersimpan aman di peramban lokal.',
          });
          return false;
        }
      },

      loadFromSupabase: async () => {
        try {
          const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'SIDEBAR_CUSTOM_CONFIG')
            .maybeSingle();

          if (!error && data?.value?.groups && Array.isArray(data.value.groups)) {
            set({
              groups: mergeMissingDefaultItems(data.value.groups),
              lastUpdated: data.value.last_updated,
              cloudSyncStatus: 'synced',
              cloudMessage: 'Data navigasi terbaru berhasil dimuat dari Cloud Supabase.',
            });
          }
        } catch (err) {
          console.warn('Gagal memuat sidebar config dari Supabase:', err);
        }
      },
    }),
    {
      name: 'madina_sidebar_config_v1',
      merge: (persistedState: any, currentState) => {
        if (!persistedState || !Array.isArray(persistedState.groups)) {
          return currentState;
        }
        return {
          ...currentState,
          ...persistedState,
          groups: mergeMissingDefaultItems(persistedState.groups),
        };
      },
    }
  )
);
