export interface HierarchyNode {
  [key: string]: HierarchyNode | string[];
}

export interface AppSettingsGlobal {
  tree1: string | Record<string, any>; // Blok -> Asrama -> Kode -> Kamar
  tree2: string | Record<string, any>; // Unit -> Jurusan -> Semester -> Kelas -> Bagian
  tree3?: string | Record<string, any>;
  hafWajib?: Record<string, number>;
  hafSunnah?: Record<string, number>;
  hafKitab?: Record<string, number>;
  penjagaBebas?: string;
}

export interface ActivityLog {
  id?: string;
  created_at?: string;
  username: string;
  nama: string;
  aktivitas: string;
  detail: string;
}
