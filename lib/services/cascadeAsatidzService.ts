/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { Asatidz } from '@/types/asatidz';
import { FanPelajaranDetail, GrupAsalItem } from '@/types/fan';
import { TeacherJadwalRow } from '@/types/jadwal';
import { hitungLabelPengajarDariListAsatidz } from '@/lib/utils/jadwalHelper';
import { useFanStore } from '@/stores/useFanStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { useAbsensiStore, KEY_DB_ABSENSI, KEY_DB_SINGKATAN_ASATIDZ, LS_CACHE_ABSENSI } from '@/stores/useAbsensiStore';
import { RelationalMigrationService } from '@/lib/services/relationalMigrationService';
import {
  DeleteHistoryMode,
  DeleteImpactAnalysis,
  appendDeletedTag,
} from '@/lib/services/relationDeleteTypes';

export interface CascadeDeleteSnapshot {
  historyMode: DeleteHistoryMode;
  deletedAsatidz: Asatidz[];
  fanDetailBefore: FanPelajaranDetail;
  jadwalMapBefore: Record<string, TeacherJadwalRow>;
  jadwalSlotsDeletedRows?: any[];
  formasiBefore: Array<{ id: string | number; id_mustahiq?: string | null; wali_kelas?: string | null }>;
  konsorsiumAnggotaDeletedRows?: any[];
  konsorsiumPembimbingBefore?: Array<{ id: string; pembimbing_nama: string }>;
  konsorsiumPresensiBefore?: any[];
  absensiRecordsBefore?: any[];
  absensiRawMapBefore?: Record<string, any> | null;
  singkatanMapBefore?: Record<string, string> | null;
  grupAsalBefore?: GrupAsalItem[];
}

function parseJsonSafe<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

function normalizeJadwalMap(rawJadwal: any): Record<string, TeacherJadwalRow> {
  const obj = parseJsonSafe<any>(rawJadwal, {});
  if (Array.isArray(obj)) {
    return obj.reduce((acc, row) => {
      if (row?.nama_asatidz) acc[row.nama_asatidz.trim().toUpperCase()] = row;
      return acc;
    }, {} as Record<string, TeacherJadwalRow>);
  }
  return { ...obj };
}

function countTeacherSlotsInRow(row?: TeacherJadwalRow): number {
  if (!row) return 0;
  const days: Array<keyof TeacherJadwalRow> = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];
  let total = 0;
  days.forEach((d) => {
    const val = row[d] as any;
    if (Array.isArray(val)) {
      total += val.filter((slot) => String(slot || '').trim() !== '').length;
    } else if (val && typeof val === 'object') {
      total += Object.values(val).filter((slot) => String(slot || '').trim() !== '').length;
    }
  });
  return total;
}

/**
 * Service terpadu untuk memastikan integritas relasional (Impact Analysis, Cascade Delete & Sync)
 * antara Data Asatidz, Fan Pelajaran, Jadwal KBM, Formasi Kelas, Konsorsium, dan Presensi.
 */
export const CascadeAsatidzService = {
  /**
   * Memindai relasi aktif & historis sebelum menampilkan dialog konfirmasi penghapusan.
   */
  async analyzeDeleteImpact(asatidzToDelete: Asatidz[]): Promise<DeleteImpactAnalysis> {
    const items = asatidzToDelete.map((a) => ({
      code: a.kode_guru || a.nia || '-',
      name: a.nama_asatidz || '-',
      meta: [a.jah_asatidz, a.pa_pi === 'PI' ? 'Ustadzah (PI)' : 'Asatidz (PA)']
        .filter(Boolean)
        .join(' • '),
    }));

    const namesUpperSet = new Set(
      asatidzToDelete.map((a) => (a.nama_asatidz || '').trim().toUpperCase()).filter(Boolean)
    );
    const kgUpperSet = new Set(
      asatidzToDelete.map((a) => (a.kode_guru || '').trim().toUpperCase()).filter(Boolean)
    );

    const [
      settingsRes,
      formasiRes,
      jadwalSlotsRes,
      kelasKonsorRes,
      anggotaKonsorRes,
      presensiKonsorRes,
      absensiRecRes,
    ] = await Promise.allSettled([
      supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'FAN_PELAJARAN_DETAIL',
          'JADWAL_MENGAJAR_ASATIDZ',
          'GRUP_ASAL_ASATIDZ',
          KEY_DB_ABSENSI,
        ]),
      supabase.from('formasi_kelas').select('id, tingkat, din_kls, din_bag, id_mustahiq, wali_kelas'),
      supabase.from('jadwal_kbm_slots' as any).select('id, nama_asatidz'),
      supabase.from('kelas_konsorsium').select('id, nama_kelas, pembimbing_nama, pembimbing_nia'),
      supabase.from('anggota_konsorsium').select('id, nia, nama_asatidz'),
      supabase.from('detail_presensi_konsorsium').select('id, nia, nama_asatidz'),
      supabase.from('absensi_records' as any).select('id, nama_asatidz, nia'),
    ]);

    const settingsData = settingsRes.status === 'fulfilled' ? settingsRes.value.data || [] : [];
    const rawFan = settingsData.find((s: any) => s.key === 'FAN_PELAJARAN_DETAIL')?.value;
    const rawJadwal = settingsData.find((s: any) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;
    const rawGrupAsal = settingsData.find((s: any) => s.key === 'GRUP_ASAL_ASATIDZ')?.value;
    const rawAbsensiMap = settingsData.find((s: any) => s.key === KEY_DB_ABSENSI)?.value;

    const fanDetail = parseJsonSafe<FanPelajaranDetail>(rawFan, { item: {} });
    let fanAssignCount = 0;
    Object.values(fanDetail.item || {}).forEach((det) => {
      if (det && Array.isArray(det.asatidz)) {
        const matched = det.asatidz.some((g) => namesUpperSet.has(String(g).trim().toUpperCase()));
        if (matched) fanAssignCount += 1;
      }
    });

    const jadwalSlotsRows = jadwalSlotsRes.status === 'fulfilled' ? jadwalSlotsRes.value.data || [] : [];
    const matchedSlotIds = jadwalSlotsRows.filter((s: any) =>
      namesUpperSet.has(String(s.nama_asatidz || '').trim().toUpperCase())
    );
    let jadwalSlotCount = matchedSlotIds.length;
    if (jadwalSlotCount === 0) {
      const jadwalMap = normalizeJadwalMap(rawJadwal);
      Object.entries(jadwalMap).forEach(([keyUpper, row]) => {
        const rowName = String(row?.nama_asatidz || keyUpper).trim().toUpperCase();
        if (namesUpperSet.has(rowName) || kgUpperSet.has(rowName)) {
          jadwalSlotCount += Math.max(1, countTeacherSlotsInRow(row));
        }
      });
    }

    const formasiRows = formasiRes.status === 'fulfilled' ? formasiRes.value.data || [] : [];
    const matchedFormasiClasses: string[] = [];
    formasiRows.forEach((f: any) => {
      const mU = String(f.id_mustahiq || '').trim().toUpperCase();
      const wU = String(f.wali_kelas || '').trim().toUpperCase();
      const matchM = namesUpperSet.has(mU) || kgUpperSet.has(mU);
      const matchW = namesUpperSet.has(wU) || kgUpperSet.has(wU);
      if (matchM || matchW) {
        const label = `${f.din_kls || ''}${f.din_bag || ''} ${f.tingkat || ''}`.trim() || String(f.id);
        matchedFormasiClasses.push(label);
      }
    });

    const grupList = parseJsonSafe<GrupAsalItem[]>(rawGrupAsal, []);
    let grupCount = 0;
    if (Array.isArray(grupList)) {
      grupList.forEach((g) => {
        if (Array.isArray(g.anggota) && g.anggota.some((m) => namesUpperSet.has(String(m).trim().toUpperCase()))) {
          grupCount += 1;
        }
      });
    }

    const kelasKonsorRows = kelasKonsorRes.status === 'fulfilled' ? kelasKonsorRes.value.data || [] : [];
    const pembimbingKelas = kelasKonsorRows.filter((k: any) => {
      const pName = String(k.pembimbing_nama || '').trim().toUpperCase();
      const pNia = String(k.pembimbing_nia || '').trim().toUpperCase();
      return namesUpperSet.has(pName) || (pNia && pNia !== '-' && kgUpperSet.has(pNia));
    });

    const anggotaKonsorRows = anggotaKonsorRes.status === 'fulfilled' ? anggotaKonsorRes.value.data || [] : [];
    const anggotaCount = anggotaKonsorRows.filter((a: any) => {
      const aName = String(a.nama_asatidz || '').trim().toUpperCase();
      const aNia = String(a.nia || '').trim().toUpperCase();
      return namesUpperSet.has(aName) || (aNia && aNia !== '-' && kgUpperSet.has(aNia));
    }).length;

    const presensiKonsorRows = presensiKonsorRes.status === 'fulfilled' ? presensiKonsorRes.value.data || [] : [];
    const konsorPresensiCount = presensiKonsorRows.filter((p: any) => {
      const pName = String(p.nama_asatidz || '').trim().toUpperCase();
      const pNia = String(p.nia || '').trim().toUpperCase();
      return namesUpperSet.has(pName) || (pNia && pNia !== '-' && kgUpperSet.has(pNia));
    }).length;

    const absensiRecRows = absensiRecRes.status === 'fulfilled' ? absensiRecRes.value.data || [] : [];
    let absensiHistoryCount = absensiRecRows.filter((r: any) => {
      const rName = String(r.nama_asatidz || '').trim().toUpperCase();
      const rNia = String(r.nia || '').trim().toUpperCase();
      return namesUpperSet.has(rName) || (rNia && rNia !== '-' && kgUpperSet.has(rNia));
    }).length;

    if (absensiHistoryCount === 0 && rawAbsensiMap) {
      const parsedMap = parseJsonSafe<Record<string, any>>(rawAbsensiMap, {});
      const unpacked = RelationalMigrationService.parseAbsensiBucketsToRecords(parsedMap);
      absensiHistoryCount = unpacked.filter((r) => {
        const rName = String(r.nama_asatidz || '').trim().toUpperCase();
        const rNia = String(r.nia || '').trim().toUpperCase();
        return namesUpperSet.has(rName) || (rNia && rNia !== '-' && kgUpperSet.has(rNia));
      }).length;
    }

    const impacts: string[] = [];
    const activeWarnings: string[] = [];

    if (matchedFormasiClasses.length > 0) {
      const sample = matchedFormasiClasses.slice(0, 3).join(', ');
      const extra = matchedFormasiClasses.length > 3 ? ` (+${matchedFormasiClasses.length - 3} lainnya)` : '';
      impacts.push(
        `Jabatan Mustahiq/Wali Kelas pada ${matchedFormasiClasses.length} formasi kelas (${sample}${extra}) akan dikosongkan.`
      );
      activeWarnings.push(
        `Masih menjabat Mustahiq/Wali Kelas aktif pada ${matchedFormasiClasses.length} kelas (${sample}${extra}).`
      );
    }

    if (fanAssignCount > 0) {
      impacts.push(`Nama asatidz akan dilepas dari ${fanAssignCount} entri tugas mengajar Fan Pelajaran.`);
      activeWarnings.push(`Tercatat mengajar pada ${fanAssignCount} mapel Fan Pelajaran aktif.`);
    }

    if (jadwalSlotCount > 0) {
      impacts.push(`${jadwalSlotCount} slot jadwal mengajar KBM akan dihapus dari Jadwal & Slot Relasional.`);
      activeWarnings.push(`Memiliki ${jadwalSlotCount} slot jadwal KBM aktif yang akan terhapus.`);
    }

    if (grupCount > 0) {
      impacts.push(`Dikeluarkan dari daftar anggota ${grupCount} Grup Asal Asatidz.`);
    }

    if (pembimbingKelas.length > 0) {
      impacts.push(`Menjabat sebagai Pembimbing pada ${pembimbingKelas.length} kelas Konsorsium.`);
      activeWarnings.push(`Sedang membimbing ${pembimbingKelas.length} kelas Konsorsium aktif.`);
    }

    if (anggotaCount > 0) {
      impacts.push(`Keanggotaan pada ${anggotaCount} kelas Konsorsium akan dilepas.`);
    }

    if (absensiHistoryCount > 0) {
      impacts.push(`Terhubung ke ${absensiHistoryCount} catatan riwayat Presensi KBM Harian.`);
    }

    if (konsorPresensiCount > 0) {
      impacts.push(`Terhubung ke ${konsorPresensiCount} catatan riwayat Presensi Konsorsium.`);
    }

    return {
      items,
      impacts,
      activeWarnings,
      activeWarningTitle: 'Terdeteksi Penugasan & Jadwal Aktif',
      activeRiskCheckboxLabel:
        'Saya mengerti risikonya dan tetap ingin memaksa penghapusan data ini beserta pelepasan tugas/jadwal aktif di atas.',
      safeArchiveNote:
        'Arsip ujian Ebtadin (ebtadin_asatidz) tahun ajaran sebelumnya tetap dipertahankan aman sebagai catatan historis.',
      hasHistoricalRecords: absensiHistoryCount > 0 || konsorPresensiCount > 0 || pembimbingKelas.length > 0,
    };
  },

  /**
   * Menghapus referensi asatidz dari seluruh modul secara berkait (Cascade Deletion)
   * dengan dukungan mode pertahankan arsip berlabel [Dihapus] atau hapus bersih menyeluruh.
   */
  async cascadeDeleteAsatidz(
    asatidzToDelete: Asatidz[],
    options?: { historyMode?: DeleteHistoryMode }
  ): Promise<CascadeDeleteSnapshot | null> {
    if (!asatidzToDelete || asatidzToDelete.length === 0) return null;

    const historyMode: DeleteHistoryMode = options?.historyMode || 'keep_history';
    const namesUpperSet = new Set(
      asatidzToDelete.map((a) => (a.nama_asatidz || '').trim().toUpperCase()).filter(Boolean)
    );
    const kgUpperSet = new Set(
      asatidzToDelete.map((a) => (a.kode_guru || '').trim().toUpperCase()).filter(Boolean)
    );

    const matchesAsatidz = (rawNama?: string | null, rawNiaOrKg?: string | null) => {
      const nU = String(rawNama || '').trim().toUpperCase();
      const kU = String(rawNiaOrKg || '').trim().toUpperCase();
      return (nU !== '' && namesUpperSet.has(nU)) || (kU !== '' && kU !== '-' && kgUpperSet.has(kU));
    };

    try {
      // 1. Ambil data app_settings untuk snapshot undo & mutasi
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'FAN_PELAJARAN_DETAIL',
          'JADWAL_MENGAJAR_ASATIDZ',
          'GRUP_ASAL_ASATIDZ',
          KEY_DB_ABSENSI,
          KEY_DB_SINGKATAN_ASATIDZ,
        ]);

      const rawFan = settingsData?.find((s) => s.key === 'FAN_PELAJARAN_DETAIL')?.value;
      const rawJadwal = settingsData?.find((s) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;
      const rawGrupAsal = settingsData?.find((s) => s.key === 'GRUP_ASAL_ASATIDZ')?.value;
      const rawAbsensiVal = settingsData?.find((s) => s.key === KEY_DB_ABSENSI)?.value;
      const rawSingkatanVal = settingsData?.find((s) => s.key === KEY_DB_SINGKATAN_ASATIDZ)?.value;

      const fanDetailBefore = parseJsonSafe<FanPelajaranDetail>(rawFan, { item: {} });
      const jadwalMapBefore = normalizeJadwalMap(rawJadwal);
      const grupAsalBefore = parseJsonSafe<GrupAsalItem[]>(rawGrupAsal, []);
      const absensiRawMapBefore = rawAbsensiVal
        ? parseJsonSafe<Record<string, any>>(rawAbsensiVal, {})
        : null;
      const singkatanMapBefore = rawSingkatanVal
        ? parseJsonSafe<Record<string, string>>(rawSingkatanVal, {})
        : null;

      const currentAsatidzList = useAsatidzStore.getState().asatidzList;
      const remainingAsatidzList = currentAsatidzList.filter(
        (a) => !kgUpperSet.has(String(a.kode_guru || '').trim().toUpperCase())
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

      // 3. Cascade Clean JADWAL_MENGAJAR_ASATIDZ & jadwal_kbm_slots
      let jadwalModified = false;
      const nextJadwalMap: Record<string, TeacherJadwalRow> = {};
      Object.entries(jadwalMapBefore).forEach(([keyUpper, row]) => {
        const rowName = (row.nama_asatidz || keyUpper).trim().toUpperCase();
        if (namesUpperSet.has(rowName) || kgUpperSet.has(rowName)) {
          jadwalModified = true;
          return;
        }
        nextJadwalMap[keyUpper] = { ...row };
      });

      const { data: allSlots } = await supabase.from('jadwal_kbm_slots' as any).select('*');
      const jadwalSlotsDeletedRows = (allSlots || []).filter((slot: any) =>
        matchesAsatidz(slot.nama_asatidz, slot.nia)
      );
      if (jadwalSlotsDeletedRows.length > 0) {
        const slotIds = jadwalSlotsDeletedRows.map((s: any) => s.id).filter(Boolean);
        if (slotIds.length > 0) {
          await supabase.from('jadwal_kbm_slots' as any).delete().in('id', slotIds);
        }
      }

      // 4. Cascade Clean GRUP_ASAL_ASATIDZ (Keluarkan guru dari anggota grup)
      let grupModified = false;
      const nextGrupAsal = (Array.isArray(grupAsalBefore) ? grupAsalBefore : []).map((g) => {
        if (!Array.isArray(g.anggota)) return g;
        const nextMembers = g.anggota.filter(
          (m) => !namesUpperSet.has(String(m).trim().toUpperCase())
        );
        if (nextMembers.length !== g.anggota.length) {
          grupModified = true;
          return { ...g, anggota: nextMembers };
        }
        return g;
      });
      if (grupModified) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'GRUP_ASAL_ASATIDZ', value: JSON.stringify(nextGrupAsal) });
        useFanStore.setState({ masterGrupAsal: nextGrupAsal });
      }

      // 5. Cascade Clean formasi_kelas (id_mustahiq / wali_kelas)
      const { data: formasiRows } = await supabase.from('formasi_kelas').select('*');
      const formasiBefore: CascadeDeleteSnapshot['formasiBefore'] = [];
      const formasiUpdates: Array<{ id: string | number; id_mustahiq: null | string; wali_kelas: null | string }> = [];

      (formasiRows || []).forEach((f: any) => {
        const mustahiqUpper = String(f.id_mustahiq || '').trim().toUpperCase();
        const waliUpper = String(f.wali_kelas || '').trim().toUpperCase();
        const matchMustahiq = namesUpperSet.has(mustahiqUpper) || kgUpperSet.has(mustahiqUpper);
        const matchWali = namesUpperSet.has(waliUpper) || kgUpperSet.has(waliUpper);

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

      if (formasiUpdates.length > 0) {
        for (const update of formasiUpdates) {
          await supabase
            .from('formasi_kelas')
            .update({ id_mustahiq: update.id_mustahiq, wali_kelas: update.wali_kelas })
            .eq('id', update.id);
        }
        await useFormasiStore.getState().fetchFormasi();
      }

      if (fanDetailModified) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'FAN_PELAJARAN_DETAIL', value: JSON.stringify(nextFanDetail) });
        useFanStore.setState({ fanDetail: nextFanDetail });
      }

      if (jadwalModified || jadwalSlotsDeletedRows.length > 0) {
        if (jadwalModified) {
          await supabase
            .from('app_settings')
            .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(nextJadwalMap) });
        }
        useJadwalStore.setState({ jadwalMap: nextJadwalMap });
        useJadwalStore.getState().rebuildMasterStrukturKelas(
          useFormasiStore.getState().formasiList,
          remainingAsatidzList
        );
      }

      // 6. Konsorsium (anggota aktif selalu dilepas; pembimbing & presensi mengikuti historyMode)
      const [dbAnggotaRes, dbKelasKonsorRes, dbPresensiKonsorRes] = await Promise.all([
        supabase.from('anggota_konsorsium').select('*'),
        supabase.from('kelas_konsorsium').select('id, pembimbing_nama, pembimbing_nia'),
        supabase.from('detail_presensi_konsorsium').select('*'),
      ]);

      const matchedKonsAnggota = (dbAnggotaRes.data || []).filter((ang: any) =>
        matchesAsatidz(ang.nama || ang.nama_asatidz, ang.nia)
      );
      const konsorsiumAnggotaDeletedRows = matchedKonsAnggota;
      const konsorsiumAnggotaDeletedIds = matchedKonsAnggota.map((a: any) => a.id).filter(Boolean);
      if (konsorsiumAnggotaDeletedIds.length > 0) {
        await supabase.from('anggota_konsorsium').delete().in('id', konsorsiumAnggotaDeletedIds);
      }

      const konsorsiumPembimbingBefore: Array<{ id: string; pembimbing_nama: string }> = [];
      const matchedPembimbing = (dbKelasKonsorRes.data || []).filter((k: any) =>
        matchesAsatidz(k.pembimbing_nama, k.pembimbing_nia)
      );
      for (const k of matchedPembimbing) {
        konsorsiumPembimbingBefore.push({ id: k.id, pembimbing_nama: k.pembimbing_nama });
        const nextPembimbing =
          historyMode === 'purge_all' ? '-' : appendDeletedTag(k.pembimbing_nama);
        await supabase
          .from('kelas_konsorsium')
          .update({ pembimbing_nama: nextPembimbing, updated_at: new Date().toISOString() })
          .eq('id', k.id);
      }

      const konsorsiumPresensiBefore = (dbPresensiKonsorRes.data || []).filter((p: any) =>
        matchesAsatidz(p.nama_asatidz, p.nia)
      );
      if (konsorsiumPresensiBefore.length > 0) {
        if (historyMode === 'purge_all') {
          const ids = konsorsiumPresensiBefore.map((p: any) => p.id).filter(Boolean);
          await supabase.from('detail_presensi_konsorsium').delete().in('id', ids);
        } else {
          for (const p of konsorsiumPresensiBefore) {
            const tagged = appendDeletedTag(p.nama_asatidz);
            if (tagged !== p.nama_asatidz) {
              await supabase
                .from('detail_presensi_konsorsium')
                .update({ nama_asatidz: tagged })
                .eq('id', p.id);
            }
          }
        }
      }

      if (
        konsorsiumAnggotaDeletedIds.length > 0 ||
        konsorsiumPembimbingBefore.length > 0 ||
        konsorsiumPresensiBefore.length > 0
      ) {
        await useKonsorsiumStore.getState().fetchKonsorsiumData();
      }

      // 7. Riwayat Absensi KBM (absensi_records & ABSENSI_ASATIDZ_DATA)
      const { data: absensiRows } = await supabase.from('absensi_records' as any).select('*');
      const absensiRecordsBefore = (absensiRows || []).filter((r: any) =>
        matchesAsatidz(r.nama_asatidz, r.nia)
      );

      if (absensiRecordsBefore.length > 0) {
        if (historyMode === 'purge_all') {
          const ids = absensiRecordsBefore.map((r: any) => r.id).filter(Boolean);
          for (let i = 0; i < ids.length; i += 100) {
            await supabase.from('absensi_records' as any).delete().in('id', ids.slice(i, i + 100));
          }
        } else {
          for (const rec of absensiRecordsBefore) {
            const tagged = appendDeletedTag(rec.nama_asatidz);
            if (tagged !== rec.nama_asatidz) {
              await supabase
                .from('absensi_records' as any)
                .update({ nama_asatidz: tagged })
                .eq('id', rec.id);
            }
          }
        }
      }

      let absensiMapChanged = false;
      if (absensiRawMapBefore && Object.keys(absensiRawMapBefore).length > 0) {
        const unpacked = RelationalMigrationService.parseAbsensiBucketsToRecords(absensiRawMapBefore);
        const mutatedRecords =
          historyMode === 'purge_all'
            ? unpacked.filter((r) => {
                const match = matchesAsatidz(r.nama_asatidz, r.nia);
                if (match) absensiMapChanged = true;
                return !match;
              })
            : unpacked.map((r) => {
                if (matchesAsatidz(r.nama_asatidz, r.nia)) {
                  const tagged = appendDeletedTag(r.nama_asatidz);
                  if (tagged !== r.nama_asatidz) absensiMapChanged = true;
                  return { ...r, nama_asatidz: tagged };
                }
                return r;
              });

        if (absensiMapChanged) {
          const nextBucketMap =
            RelationalMigrationService.reconstructAbsensiBucketsFromRecords(mutatedRecords);
          await supabase
            .from('app_settings')
            .upsert({ key: KEY_DB_ABSENSI, value: nextBucketMap }, { onConflict: 'key' });
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(nextBucketMap));
            }
          } catch {}
        }
      }

      if (absensiRecordsBefore.length > 0 || absensiMapChanged) {
        await useAbsensiStore.getState().fetchAbsensi();
      }

      // 8. Bersihkan Singkatan WA Asatidz jika purge_all
      let singkatanChanged = false;
      if (historyMode === 'purge_all' && singkatanMapBefore) {
        const nextSingkatan: Record<string, string> = {};
        Object.entries(singkatanMapBefore).forEach(([k, v]) => {
          if (matchesAsatidz(k, k)) {
            singkatanChanged = true;
          } else {
            nextSingkatan[k] = v;
          }
        });
        if (singkatanChanged) {
          await supabase
            .from('app_settings')
            .upsert({ key: KEY_DB_SINGKATAN_ASATIDZ, value: nextSingkatan }, { onConflict: 'key' });
          useAbsensiStore.setState({ singkatanAsatidzMap: nextSingkatan });
        }
      }

      return {
        historyMode,
        deletedAsatidz: [...asatidzToDelete],
        fanDetailBefore,
        jadwalMapBefore,
        jadwalSlotsDeletedRows,
        formasiBefore,
        konsorsiumAnggotaDeletedRows,
        konsorsiumPembimbingBefore,
        konsorsiumPresensiBefore,
        absensiRecordsBefore,
        absensiRawMapBefore: absensiMapChanged ? absensiRawMapBefore : null,
        singkatanMapBefore: singkatanChanged ? singkatanMapBefore : null,
        grupAsalBefore,
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

      // 3. Pulihkan JADWAL_MENGAJAR_ASATIDZ & jadwal_kbm_slots
      await supabase
        .from('app_settings')
        .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(snapshot.jadwalMapBefore) });
      if (snapshot.jadwalSlotsDeletedRows && snapshot.jadwalSlotsDeletedRows.length > 0) {
        await supabase
          .from('jadwal_kbm_slots' as any)
          .upsert(snapshot.jadwalSlotsDeletedRows, { onConflict: 'id' });
      }
      useJadwalStore.setState({ jadwalMap: snapshot.jadwalMapBefore });
      useJadwalStore.getState().rebuildMasterStrukturKelas(
        useFormasiStore.getState().formasiList,
        useAsatidzStore.getState().asatidzList
      );

      // 4. Pulihkan Konsorsium
      if (snapshot.konsorsiumAnggotaDeletedRows && snapshot.konsorsiumAnggotaDeletedRows.length > 0) {
        await supabase.from('anggota_konsorsium').upsert(snapshot.konsorsiumAnggotaDeletedRows);
      }
      if (snapshot.konsorsiumPembimbingBefore && snapshot.konsorsiumPembimbingBefore.length > 0) {
        for (const p of snapshot.konsorsiumPembimbingBefore) {
          await supabase
            .from('kelas_konsorsium')
            .update({ pembimbing_nama: p.pembimbing_nama })
            .eq('id', p.id);
        }
      }
      if (snapshot.konsorsiumPresensiBefore && snapshot.konsorsiumPresensiBefore.length > 0) {
        await supabase.from('detail_presensi_konsorsium').upsert(snapshot.konsorsiumPresensiBefore);
      }
      if (
        (snapshot.konsorsiumAnggotaDeletedRows?.length || 0) > 0 ||
        (snapshot.konsorsiumPembimbingBefore?.length || 0) > 0 ||
        (snapshot.konsorsiumPresensiBefore?.length || 0) > 0
      ) {
        await useKonsorsiumStore.getState().fetchKonsorsiumData();
      }

      // 5. Pulihkan Absensi KBM & Singkatan WA
      if (snapshot.absensiRecordsBefore && snapshot.absensiRecordsBefore.length > 0) {
        await supabase
          .from('absensi_records' as any)
          .upsert(snapshot.absensiRecordsBefore, { onConflict: 'id' });
      }
      if (snapshot.absensiRawMapBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: KEY_DB_ABSENSI, value: snapshot.absensiRawMapBefore }, { onConflict: 'key' });
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(snapshot.absensiRawMapBefore));
          }
        } catch {}
      }
      if (snapshot.singkatanMapBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: KEY_DB_SINGKATAN_ASATIDZ, value: snapshot.singkatanMapBefore }, { onConflict: 'key' });
        useAbsensiStore.setState({ singkatanAsatidzMap: snapshot.singkatanMapBefore });
      }
      if ((snapshot.absensiRecordsBefore?.length || 0) > 0 || snapshot.absensiRawMapBefore) {
        await useAbsensiStore.getState().fetchAbsensi();
      }

      // 6. Pulihkan GRUP_ASAL_ASATIDZ
      if (snapshot.grupAsalBefore) {
        await supabase
          .from('app_settings')
          .upsert({ key: 'GRUP_ASAL_ASATIDZ', value: JSON.stringify(snapshot.grupAsalBefore) });
        useFanStore.setState({ masterGrupAsal: snapshot.grupAsalBefore });
      }

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

      // Perbarui tabel relasional Absen Konsorsium jika menjadi pembimbing atau anggota
      await supabase
        .from('kelas_konsorsium')
        .update({ pembimbing_nama: cleanNew, updated_at: new Date().toISOString() })
        .eq('pembimbing_nama', cleanOld);

      await supabase
        .from('anggota_konsorsium')
        .update({ nama_asatidz: cleanNew })
        .eq('nama_asatidz', cleanOld);

      await supabase
        .from('detail_presensi_konsorsium')
        .update({ nama_asatidz: cleanNew })
        .eq('nama_asatidz', cleanOld);

      await useKonsorsiumStore.getState().fetchKonsorsiumData();

      // Perbarui GRUP_ASAL_ASATIDZ di app_settings & useFanStore jika asatidz tergabung di grup
      const { data: rawGrupAsalData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'GRUP_ASAL_ASATIDZ')
        .maybeSingle();

      if (rawGrupAsalData?.value) {
        try {
          const grupList: GrupAsalItem[] = typeof rawGrupAsalData.value === 'string'
            ? JSON.parse(rawGrupAsalData.value)
            : rawGrupAsalData.value;

          let grupModified = false;
          const nextGrupList = grupList.map((g) => {
            if (!Array.isArray(g.anggota)) return g;
            let itemChanged = false;
            const nextAnggota = g.anggota.map((m) => {
              if (String(m).trim().toUpperCase() === cleanOld.toUpperCase()) {
                itemChanged = true;
                return cleanNew;
              }
              return m;
            });
            if (itemChanged) {
              grupModified = true;
              return { ...g, anggota: nextAnggota };
            }
            return g;
          });

          if (grupModified) {
            await supabase
              .from('app_settings')
              .upsert({ key: 'GRUP_ASAL_ASATIDZ', value: JSON.stringify(nextGrupList) });
            useFanStore.setState({ masterGrupAsal: nextGrupList });
          }
        } catch (grupErr: any) {
          console.warn('[CascadeAsatidzService] Gagal update GRUP_ASAL_ASATIDZ:', grupErr.message);
        }
      }

      return true;
    } catch (err: any) {
      console.error('[CascadeAsatidzService] Error cascading rename:', err.message);
      return false;
    }
  },
};
