export interface HierarchyNode {
  [key: string]: HierarchyNode | string[];
}

export interface AppSettingsGlobal {
  tree1: Record<string, any>; // Blok -> Asrama -> Kamar (Santri)
  tree2: Record<string, any>; // Asatidz
  tree3?: Record<string, any>;
  hafWajib?: Record<string, number>;
  hafSunnah?: Record<string, number>;
  hafKitab?: Record<string, number>;
  penjagaBebas?: string;
}

export interface ActivityLog {
  id?: string;
  waktu: string;
  user: string;
  modul: string;
  aktivitas: string;
}
