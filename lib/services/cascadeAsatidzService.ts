/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { Asatidz } from '@/types/asatidz';
import { FanPelajaranDetail } from '@/types/fan';
import { TeacherJadwalRow } from '@/types/jadwal';
import { hitungLabelPengajarDariListAsatidz } from '@/lib/utils/jadwalHelper';
import { useFanStore } from '@/stores/useFanStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';

export interface CascadeDeleteSnapshot {
  deletedAsatidz: Asatidz[];
  fanDetailBefore: FanPelajaranDetail;
  jadwalMapBefore: Record<string, TeacherJadwalRow>;
  formasiBefore: Array<{ id: string | number; id_mustahiq?: string | null; wali_kelas?: string | null }>;
}

/**
 * Service terpadu untuk memastikan integritas relasional (Cascade Delete & Sync)
 * antara Data Asatidz, Fan Pelajaran, Jadwal KBM, dan Formasi Kelas.
 */
export const CascadeAsatidzService = {
  /**
   * Menghapus referensi asatidz dari seluruh modul secara berkait (Cascade Deletion):
   * 1. Menghapus asatidz dari array item di FAN_PELAJARAN_DETAIL & hitung ulang label MS/MB.
   * 2. Menghapus guru dari JADWAL_MENGAJAR_ASATIDZ & membersihkan slot mengajar.
   * 3. Mengosongkan penugasan id_mustahiq / wali_kelas di tabel formasi_kelas.
   * 4. Memperbarui Zustand store lokal seketika (reactive UI).
   */
  async cascadeDeleteAsatidz(asatidzToDelete: Asatidz[]): Promise<CascadeDeleteSnapshot | null> {
    if (!asatidzToDelete || asatidzToDelete.length === 0) return null;

    const namesUpperSet = new Set(
      asatidzToDelete.map((a) => (a.nama_asatidz || '').trim().toUpperCase()).filter(Boolean)
    );
    const niasUpperSet = new Set(
      asatidzToDelete.map((a) => (a.nia || '').trim().toUpperCase()).filter(Boolean)
    );

    try {
      // 1. Ambil data saat ini (untuk snapshot undo & mutasi)
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['FAN_PELAJARAN_DETAIL', 'JADWAL_MENGAJAR_ASATIDZ']);

      const rawFan = settingsData?.find((s) => s.key === 'FAN_PELAJARAN_DETAIL')?.value;
      const rawJadwal = settingsData?.find((s) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;

      const fanDetailBefore: FanPelajaranDetail =
        typeof rawFan === 'string' ? JSON.parse(rawFan) : rawFan || { item: {} };
      const rawJadwalObj =
        typeof rawJadwal === 'string' ? JSON.parse(rawJadwal) : rawJadwal || {};
      const jadwalMapBefore: Record<string, TeacherJadwalRow> = Array.isArray(rawJadwalObj)
        ? rawJadwalObj.reduce((acc, row) => {
            if (row?.nama_asatidz) acc[row.nama_asatidz.trim().toUpperCase()] = row;
            return acc;
          }, {} as Record<string, TeacherJadwalRow>)
        : { ...rawJadwalObj };

      // Sisa daftar asatidz setelah penghapusan untuk validasi label MS/MB
      const currentAsatidzList = useAsatidzStore.getState().asatidzList;
      const remainingAsatidzList = currentAsatidzList.filter(
        (a) => !niasUpperSet.has(String(a.nia || '').trim().toUpperCase())
      );

      // 2. Cascade Clean FAN_PELAJARAN_DETAIL
      let fanDetailModified = false;
      const nextFanDetail: FanPelajaranDetail = {
        ...fanDetailBefore,
        item: { ...(fanDetailBefore.item || {}) },
      };

      Object.entries(nextFanDetail.item || {}).forEach(([itemKey, det]) => {
        if (!det || !Array.isArray(det.asatidz)) return;
        const filteredGurus = det.asatidz.filter(
          (g) => !namesUpperSet.has(String(g).trim().toUpperCase())
        );

        if (filteredGurus.length !== det.asatidz.length) {
          fanDetailModified = true;
          const nextPengajar = hitungLabelPengajarDariListAsatidz(
            filteredGurus,
            remainingAsatidzList,
            det.pengajar
          );
          nextFanDetail.item![itemKey] = {
            ...det,
            asatidz: filteredGurus,
            pengajar: nextPengajar,
          };
        }
      });

      // 3. Cascade Clean JADWAL_MENGAJAR_ASATIDZ
      let jadwalModified = false;
      const nextJadwalMap: Record<string, TeacherJadwalRow> = {};

      Object.entries(jadwalMapBefore).forEach(([keyUpper, row]) => {
        const rowName = (row.nama_asatidz || keyUpper).trim().toUpperCase();
        if (namesUpperSet.has(rowName) || niasUpperSet.has(rowName)) {
          jadwalModified = true;
          return; // Hapus baris guru ini
        }
        nextJadwalMap[keyUpper] = { ...row };
      });

      // 4. Cascade Clean formasi_kelas (id_mustahiq / wali_kelas)
      const { data: formasiRows } = await supabase
        .from('formasi_kelas')
        .select('*');

      const formasiBefore: CascadeDeleteSnapshot['formasiBefore'] = [];
      const formasiUpdates: Array<{ id: string | number; id_mustahiq: null; wali_kelas: null }> = [];

      (formasiRows || []).forEach((f: any) => {
        const mustahiqUpper = String(f.id_mustahiq || '').trim().toUpperCase();
        const waliUpper = String(f.wali_kelas || '').trim().toUpperCase();

        const matchMustahiq = namesUpperSet.has(mustahiqUpper) || niasUpperSet.has(mustahiqUpper);
        const matchWali = namesUpperSet.has(waliUpper) || niasUpperSet.has(waliUpper);

        if (matchMustahiq || matchWali) {
          formasiBefore.push({
            id: f.id,
            id_mustahiq: f.id_mustahiq,
            wali_kelas: f.wali_kelas,
          });
          formasiUpdates.push({
            id: f.id,
            id_mustahiq: matchMustahiq ? null : f.id_mustahiq,
            wali_kelas: matchWali ? null : f.wali_kelas,
          });
        }
      });

      // Simpan perubahan formasi_kelas jika ada
      if (formasiUpdates.length > 0) {
        for (const update of formasiUpdates) {
          await supabase
            .from('formasi_kelas')
            .update({ id_mustahiq: update.id_mustahiq, wali_kelas: update.wali_kelas })
            .eq('id', update.id);
        }
        await useFormasiStore.getState().fetchFormasi();
      }

      // Simpan perubahan FAN_PELAJARAN_DETAIL jika ada
      if (fanDetailModified) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'FAN_PELAJARAN_DETAIL', value: JSON.stringify(nextFanDetail) });
        useFanStore.setState({ fanDetail: nextFanDetail });
      }

      // Simpan perubahan JADWAL_MENGAJAR_ASATIDZ jika ada
      if (jadwalModified) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(nextJadwalMap) });
        useJadwalStore.setState({ jadwalMap: nextJadwalMap });
        useJadwalStore.getState().rebuildMasterStrukturKelas(
          useFormasiStore.getState().formasiList,
          remainingAsatidzList
        );
      }

      return {
        deletedAsatidz: [...asatidzToDelete],
        fanDetailBefore,
        jadwalMapBefore,
        formasiBefore,
      };
    } catch (err: any) {
      console.error('[CascadeAsatidzService] Error cascading delete:', err.message);
      return null;
    }
  },

  /**
   * Mengembalikan snapshot data yang sebelumnya dihapus berkait (Undo Support).
   */
  async restoreSnapshot(snapshot: CascadeDeleteSnapshot): Promise<boolean> {
    try {
      // 1. Pulihkan formasi_kelas
      if (snapshot.formasiBefore.length > 0) {
        for (const f of snapshot.formasiBefore) {
          await supabase
            .from('formasi_kelas')
            .update({ id_mustahiq: f.id_mustahiq, wali_kelas: f.wali_kelas })
            .eq('id', f.id);
        }
        await useFormasiStore.getState().fetchFormasi();
      }

      // 2. Pulihkan FAN_PELAJARAN_DETAIL
      await supabase
        .from('app_settings')
        .upsert({ key: 'FAN_PELAJARAN_DETAIL', value: JSON.stringify(snapshot.fanDetailBefore) });
      useFanStore.setState({ fanDetail: snapshot.fanDetailBefore });

      // 3. Pulihkan JADWAL_MENGAJAR_ASATIDZ
      await supabase
        .from('app_settings')
        .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(snapshot.jadwalMapBefore) });
      useJadwalStore.setState({ jadwalMap: snapshot.jadwalMapBefore });
      useJadwalStore.getState().rebuildMasterStrukturKelas(
        useFormasiStore.getState().formasiList,
        useAsatidzStore.getState().asatidzList
      );

      return true;
    } catch (err: any) {
      console.error('[CascadeAsatidzService] Restore snapshot error:', err.message);
      return false;
    }
  },

  /**
   * Jika nama asatidz diedit, ubah namanya di seluruh modul agar tidak meninggalkan data hantu.
   */
  async cascadeRenameAsatidz(oldNama: string, newNama: string): Promise<boolean> {
    const cleanOld = (oldNama || '').trim();
    const cleanNew = (newNama || '').trim();
    if (!cleanOld || !cleanNew || cleanOld.toUpperCase() === cleanNew.toUpperCase()) {
      return true;
    }

    try {
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['FAN_PELAJARAN_DETAIL', 'JADWAL_MENGAJAR_ASATIDZ']);

      const rawFan = settingsData?.find((s) => s.key === 'FAN_PELAJARAN_DETAIL')?.value;
      const rawJadwal = settingsData?.find((s) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;

      const fanDetail: FanPelajaranDetail =
        typeof rawFan === 'string' ? JSON.parse(rawFan) : rawFan || { item: {} };
      const rawJadwalObj =
        typeof rawJadwal === 'string' ? JSON.parse(rawJadwal) : rawJadwal || {};
      const jadwalMap: Record<string, TeacherJadwalRow> = Array.isArray(rawJadwalObj)
        ? rawJadwalObj.reduce((acc, row) => {
            if (row?.nama_asatidz) acc[row.nama_asatidz.trim().toUpperCase()] = row;
            return acc;
          }, {} as Record<string, TeacherJadwalRow>)
        : { ...rawJadwalObj };

      let fanChanged = false;
      Object.entries(fanDetail.item || {}).forEach(([itemKey, det]) => {
        if (!det || !Array.isArray(det.asatidz)) return;
        let itemModified = false;
        const newAsatidz = det.asatidz.map((g) => {
          if (String(g).trim().toUpperCase() === cleanOld.toUpperCase()) {
            itemModified = true;
            return cleanNew;
          }
          return g;
        });

        if (itemModified) {
          fanChanged = true;
          fanDetail.item![itemKey] = { ...det, asatidz: newAsatidz };
        }
      });

      if (fanChanged) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'FAN_PELAJARAN_DETAIL', value: JSON.stringify(fanDetail) });
        useFanStore.setState({ fanDetail });
      }

      let jadwalChanged = false;
      const oldUpper = cleanOld.toUpperCase();
      const newUpper = cleanNew.toUpperCase();

      if (jadwalMap[oldUpper]) {
        jadwalChanged = true;
        const existingRow = jadwalMap[oldUpper];
        delete jadwalMap[oldUpper];
        jadwalMap[newUpper] = {
          ...existingRow,
          nama_asatidz: cleanNew,
        };
      }

      if (jadwalChanged) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(jadwalMap) });
        useJadwalStore.setState({ jadwalMap });
      }

      // Perbarui formasi_kelas jika menjabat Mustahiq / Wali
      await supabase
        .from('formasi_kelas')
        .update({ id_mustahiq: cleanNew })
        .eq('id_mustahiq', cleanOld);

      await supabase
        .from('formasi_kelas')
        .update({ wali_kelas: cleanNew })
        .eq('wali_kelas', cleanOld);

      await useFormasiStore.getState().fetchFormasi();

      return true;
    } catch (err: any) {
      console.error('[CascadeAsatidzService] Error cascading rename:', err.message);
      return false;
    }
  },
};
