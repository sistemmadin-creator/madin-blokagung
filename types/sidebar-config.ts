export interface ConfigSubMenuItem {
  id: string;
  title: string;
  href: string;
  iconName?: string;
  hidden?: boolean;
}

export interface ConfigMenuItem {
  id: string;
  title: string;
  href?: string;
  iconName: string;
  badge?: string;
  hidden?: boolean;
  children?: ConfigSubMenuItem[];
}

export interface ConfigMenuGroup {
  id: string;
  group: string;
  hidden?: boolean;
  items: ConfigMenuItem[];
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SidebarConfigState {
  groups: ConfigMenuGroup[];
  lastUpdated?: string;
  cloudSyncStatus: CloudSyncStatus;
  cloudMessage?: string;

  // Mutasi lokal
  renameGroup: (groupId: string, newName: string) => void;
  renameItem: (groupId: string, itemId: string, newTitle: string) => void;
  renameSubItem: (groupId: string, itemId: string, subId: string, newTitle: string) => void;
  toggleGroupVisibility: (groupId: string) => void;
  toggleItemVisibility: (groupId: string, itemId: string) => void;
  moveGroup: (groupId: string, direction: 'up' | 'down') => void;
  moveItem: (groupId: string, itemId: string, direction: 'up' | 'down') => void;
  moveItemToGroup: (sourceGroupId: string, targetGroupId: string, itemId: string) => void;
  resetToDefault: () => void;
  isCustomized: () => boolean;

  // Sinkronisasi Supabase (Two-tier persistence)
  saveToSupabase: () => Promise<boolean>;
  loadFromSupabase: () => Promise<void>;
}
