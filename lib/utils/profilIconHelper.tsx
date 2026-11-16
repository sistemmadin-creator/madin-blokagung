import React from 'react';
import {
  Calendar,
  Users,
  School,
  Award,
  BookCheck,
  Sparkles,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Building2,
  Layers,
  Sun,
  Moon,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { ProfilIconName } from '@/types/profil-konten';

export const PROFIL_ICON_COMPONENTS: Record<ProfilIconName, LucideIcon> = {
  Calendar,
  Users,
  School,
  Award,
  BookCheck,
  Sparkles,
  TrendingUp,
  BookOpen,
  GraduationCap,
  Building2,
  Layers,
  Sun,
  Moon,
  Clock,
};

export const PROFIL_ICON_SELECT_OPTIONS: { value: ProfilIconName; label: string }[] = [
  { value: 'Calendar', label: 'Kalender' },
  { value: 'Users', label: 'Santri / Pengguna' },
  { value: 'School', label: 'Sekolah / Kelas' },
  { value: 'Award', label: 'Penghargaan / SDM' },
  { value: 'BookCheck', label: 'Kitab Tercentang' },
  { value: 'Sparkles', label: 'Unggulan / Bintang' },
  { value: 'TrendingUp', label: 'Grafik Akselerasi' },
  { value: 'BookOpen', label: 'Kitab Terbuka' },
  { value: 'GraduationCap', label: 'Kelulusan' },
  { value: 'Building2', label: 'Gedung Lembaga' },
  { value: 'Layers', label: 'Lapisan Jenjang' },
  { value: 'Sun', label: 'Matahari (Siang)' },
  { value: 'Moon', label: 'Bulan (Malam)' },
  { value: 'Clock', label: 'Jam / Waktu' },
];

export function renderProfilIcon(iconName: ProfilIconName, className = 'w-6 h-6') {
  const Icon = PROFIL_ICON_COMPONENTS[iconName] || Calendar;
  return <Icon className={className} />;
}
