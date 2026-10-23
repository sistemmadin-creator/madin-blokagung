export interface PendidikProfil {
  nia: string;
  nama: string;
  pa_pi: 'PA' | 'PI';
  tingkat: string;
  kelas_ajar: string[];
  total_jam_seminggu: number;
}
