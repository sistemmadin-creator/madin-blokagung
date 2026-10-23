import { Santri } from './santri';
import { Asatidz } from './asatidz';
import { FormasiKelas } from './formasi';
import { ActivityLog } from './settings';

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
    };
  };
}
