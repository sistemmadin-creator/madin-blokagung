export interface UserProfile {
  id: string;
  username: string;
  nama: string;
  role: 'Master Admin' | 'Admin Kurikulum' | 'Admin Kesiswaan' | 'Asatidz';
  canEdit: boolean;
}
