import { Santri } from './santri';
import { Asatidz } from './asatidz';
import { FormasiKelas } from './formasi';
import { ActivityLog } from './settings';
import { HariKbm } from './jadwal';
import { StatusAbsensi } from './absensi';

export interface JadwalSlotRecord {
  id?: string;
  nama_asatidz: string;
  nia?: string;
  hari: HariKbm;
  jam: number;
  tingkat?: string;
  din_kls?: string;
  din_bag?: string;
  pa_pi?: 'PA' | 'PI' | '';
  kelas_lengkap: string;
  fan: string;
  lokasi?: string;
  raw_slot?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AbsensiRecord {
  id: string;
  tanggal: string;
  hari: string;
  jam_ke: string;
  jam_num: number;
  nama_asatidz: string;
  nia?: string;
  gender?: string;
  tingkat?: string;
  din_kls?: string;
  din_bag?: string;
  blok?: string;
  kelas_mengajar: string;
  fan: string;
  lokasi?: string;
  status: StatusAbsensi | string;
  keterangan?: string;
  menit_terlambat?: string;
  nama_pengganti?: string;
  diinput_oleh?: string;
  waktu_update?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SetoranRecord {
  id: string;
  no_induk: string;
  tanggal: string;
  nama: string;
  tgl_lahir?: string;
  bln_lahir?: string;
  thn_lahir?: string;
  tempat_lahir?: string;
  penjaga: string;
  mustahiq?: string;
  tingkat?: string;
  din_bag?: string;
  din_kls?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  bin?: string;
  item_hafalan: string;
  kategori: string;
  created_at?: string;
}

export interface NotificationLogRecord {
  id?: string;
  recipient_type: 'santri' | 'asatidz' | 'wali' | 'grup' | 'mustahiq';
  recipient_target: string;
  category: 'absensi' | 'hafalan' | 'badal' | 'kbm' | 'pengumuman';
  message: string;
  channel: 'whatsapp' | 'telegram' | 'sms';
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface OfflineSyncLogRecord {
  id?: string;
  client_id: string;
  synced_count: number;
  failed_count: number;
  details?: any[];
  created_at?: string;
}

export interface ScheduleSolverProposalRecord {
  id?: string;
  title: string;
  status: 'draft' | 'applied' | 'rejected' | 'archived';
  proposed_slots: JadwalSlotRecord[];
  conflicts_detected: number;
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      santri: {
        Row: Santri;
        Insert: Partial<Santri>;
        Update: Partial<Santri>;
      };
      asatidz: {
        Row: Asatidz;
        Insert: Partial<Asatidz>;
        Update: Partial<Asatidz>;
      };
      formasi_kelas: {
        Row: FormasiKelas;
        Insert: Partial<FormasiKelas>;
        Update: Partial<FormasiKelas>;
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog>;
        Update: Partial<ActivityLog>;
      };
      app_settings: {
        Row: {
          key: string;
          value: any;
          updated_at?: string;
        };
        Insert: {
          key: string;
          value: any;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: any;
          updated_at?: string;
        };
      };
      jadwal_kbm_slots: {
        Row: JadwalSlotRecord;
        Insert: Partial<JadwalSlotRecord>;
        Update: Partial<JadwalSlotRecord>;
      };
      absensi_records: {
        Row: AbsensiRecord;
        Insert: Partial<AbsensiRecord>;
        Update: Partial<AbsensiRecord>;
      };
      setoran_hafalan_records: {
        Row: SetoranRecord;
        Insert: Partial<SetoranRecord>;
        Update: Partial<SetoranRecord>;
      };
      notification_logs: {
        Row: NotificationLogRecord;
        Insert: Partial<NotificationLogRecord>;
        Update: Partial<NotificationLogRecord>;
      };
      offline_sync_logs: {
        Row: OfflineSyncLogRecord;
        Insert: Partial<OfflineSyncLogRecord>;
        Update: Partial<OfflineSyncLogRecord>;
      };
      schedule_solver_proposals: {
        Row: ScheduleSolverProposalRecord;
        Insert: Partial<ScheduleSolverProposalRecord>;
        Update: Partial<ScheduleSolverProposalRecord>;
      };
    };
  };
}
