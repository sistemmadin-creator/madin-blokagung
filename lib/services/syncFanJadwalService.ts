/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, FanPelajaranDetail } from '@/types/fan';
import { TeacherJadwalRow, LIST_HARI } from '@/types/jadwal';
import { parseFanItemString } from '@/lib/utils/fanHelper';
import { syncGuruMengajarAndTotalObj } from '@/lib/utils/jadwalHelper';
import { useFanStore } from '@/stores/useFanStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';

export interface SyncResult {
  classesProcessed: number;
  teachersUpdated: number;
  slotsAdded: number;
  details: string[];
}

/**
 * Service untuk menyinkronkan Fan Wajib Mustahiq ke Jadwal KBM (Jam 1 & 2),
 * serta membersihkan penumpukan data fan agar konsisten dan saling terhubung.
 */
export const SyncFanJadwalService = {
  /**
   * Menjalankan sinkronisasi komprehensif:
   * 1. Menemukan kelas-kelas yang Jam 1 & 2 nya masih kosong padahal Mustahiq-nya sudah ada.
   * 2. Memetakan fan wajib Mustahiq (MS) ke slot Jam 1 & Jam 2 pada hari aktif KBM.
   * 3. Memetakan fan non-MS (Tauhid, Akhlaq/B.Arab) dari guru bidang studi yang relevan.
   * 4. Menyimpan pembaruan ke JADWAL_MENGAJAR_ASATIDZ dan memperbarui master UI.
   */
  async syncAllMustahiqToJadwalKBM(): Promise<SyncResult> {
    const asatidzList = useAsatidzStore.getState().asatidzList;
    const formasiList = useFormasiStore.getState().formasiList;

    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['FAN_CONFIG', 'FAN_PELAJARAN_DETAIL', 'JADWAL_MENGAJAR_ASATIDZ']);

    const rawCfg = settingsData?.find((s) => s.key === 'FAN_CONFIG')?.value;
    const rawFan = settingsData?.find((s) => s.key === 'FAN_PELAJARAN_DETAIL')?.value;
    const rawJdw = settingsData?.find((s) => s.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;

    const fanConfig: FanConfigMap =
      typeof rawCfg === 'string' ? JSON.parse(rawCfg) : rawCfg || {};
    const fanDetail: FanPelajaranDetail =
      typeof rawFan === 'string' ? JSON.parse(rawFan) : rawFan || { item: {} };
    const rawJdwObj =
      typeof rawJdw === 'string' ? JSON.parse(rawJdw) : rawJdw || {};

    const jadwalMap: Record<string, TeacherJadwalRow> = Array.isArray(rawJdwObj)
      ? rawJdwObj.reduce((acc, row) => {
          if (row?.nama_asatidz) acc[row.nama_asatidz.trim().toUpperCase()] = row;
          return acc;
        }, {} as Record<string, TeacherJadwalRow>)
      : { ...rawJdwObj };

    // Peta guru asatidz by upper name
    const asatidzByName = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      const n = (a.nama_asatidz || '').trim().toUpperCase();
      if (n) asatidzByName.set(n, a);
    });

    let slotsAdded = 0;
    const updatedTeachers = new Set<string>();
    const details: string[] = [];

    // Helper untuk mengambil atau menginisialisasi baris jadwal guru
    const getTeacherRow = (namaGuru: string): TeacherJadwalRow => {
      const gUpper = namaGuru.trim().toUpperCase();
      if (!jadwalMap[gUpper]) {
        jadwalMap[gUpper] = {
          nama_asatidz: namaGuru.trim(),
          mengajar: '',
          totalJam: 0,
          sabtu: '',
          ahad: '',
          senin: '',
          selasa: '',
          rabu: '',
          kamis: '',
        };
      }
      return jadwalMap[gUpper];
    };

    // Pindai semua Mustahiq yang tercatat di master Asatidz
    const mustahiqList = asatidzList.filter((a) => {
      const jah = (a.jah_asatidz || '').toLowerCase();
      return (
        jah.includes('mustahiq') ||
        jah.includes('ms & koor') ||
        jah.includes("isti'dad") ||
        jah === 'ist'
      );
    });

    let classesProcessed = 0;

    for (const m of mustahiqList) {
      const tkt = (m.tingkat_asatidz || '').trim().toUpperCase();
      const kls = (m.din_kls_asatidz || '').trim();
      const bag = (m.din_bag_asatidz || '').trim().toUpperCase();
      const papi = (m.pa_pi || '').trim().toUpperCase();
      const namaMS = (m.nama_asatidz || '').trim();
      const lokal = (m.lokasi_diniyyah || '').trim();

      if (!tkt || !kls || !bag || !namaMS) continue;

      const kelasLengkap = `${kls} ${bag} ${tkt} (${papi || '-'})`;
      const kelasKeyConfig = `${kls} ${tkt}`;
      const configItems = fanConfig[kelasKeyConfig] || fanConfig[tkt] || [];

      // Filter fan wajib MS dari konfigurasi
      const fanWajibMS: string[] = [];
      const fanNonMS: string[] = [];

      configItems.forEach((raw) => {
        const itemKey = `${kelasKeyConfig}||${raw}`;
        const itemDet = fanDetail.item?.[itemKey];
        const pengajarStr = (itemDet?.pengajar || '').toUpperCase();
        const parsed = parseFanItemString(raw);
        const fanShort = parsed.fan && parsed.fan !== '-' ? parsed.fan : parsed.mapel || raw;

        if (fanShort.toLowerCase().includes('badongan') || fanShort.toLowerCase().includes('takror')) {
          return; // Lewati jam 3 & 4 karena itu sesi tersendiri
        }

        if (pengajarStr.includes('MS') || itemDet?.asatidz?.some((g) => g.toUpperCase() === namaMS.toUpperCase())) {
          if (!fanWajibMS.includes(fanShort)) fanWajibMS.push(fanShort);
        } else {
          if (!fanNonMS.includes(fanShort)) fanNonMS.push(fanShort);
        }
      });

      // Default fallback jika belum tersetting di Fan Pelajaran
      if (fanWajibMS.length === 0) {
        if (tkt === 'ULA') {
          if (kls === '1') fanWajibMS.push('Pegon', 'Tajwid', 'Fiqih', 'Praktek Fiqh');
          else if (kls === '2') fanWajibMS.push('Nahwu', 'Fiqih', 'Praktek Fiqh', "Imla'");
          else fanWajibMS.push('Nahwu', 'Shorof', 'Fiqih', 'Tajwid');
        } else {
          fanWajibMS.push('Nahwu', 'Fiqih', 'Tauhid', 'Akhlaq');
        }
      }

      // Cek apakah kelas ini sudah memiliki slot Jam 1 & 2 di jadwalMap
      let hasJam1or2 = false;
      Object.values(jadwalMap).forEach((r) => {
        LIST_HARI.forEach((h) => {
          const text = r[h.toLowerCase()] || '';
          if (text.includes(kelasLengkap) && (text.includes('Jam 1') || text.includes('Jam 2'))) {
            hasJam1or2 = true;
          }
        });
      });

      // Jika Jam 1 & 2 kelas ini memang belum ada isinya, kita sinkronkan!
      if (!hasJam1or2) {
        classesProcessed++;
        const msRow = getTeacherRow(namaMS);
        const lokasiStr = lokal ? ` (${lokal})` : '';

        // Jadwal hari untuk Mustahiq (4 hari untuk 4 fan wajib MS)
        // Sabtu: Fan 1, Senin: Fan 2, Selasa: Fan 3, Rabu: Fan 4
        const mapHariFan: Array<{ hari: string; fan: string }> = [
          { hari: 'sabtu', fan: fanWajibMS[0] || 'Pegon' },
          { hari: 'senin', fan: fanWajibMS[1] || 'Tajwid' },
          { hari: 'selasa', fan: fanWajibMS[2] || 'Fiqih' },
          { hari: 'rabu', fan: fanWajibMS[3] || 'Praktek Fiqh' },
        ];

        mapHariFan.forEach(({ hari, fan }) => {
          const existingText = msRow[hari] || '';
          const newSlot1 = `Jam 1 | ${fan} | ${kelasLengkap}${lokasiStr}`;
          const newSlot2 = `Jam 2 | ${fan} | ${kelasLengkap}${lokasiStr}`;

          // Pastikan tidak duplikat di hari yang sama
          if (!existingText.includes(`Jam 1 | ${fan}`) && !existingText.includes(`Jam 2 | ${fan}`)) {
            const combined = existingText ? `${existingText}\n${newSlot1}\n${newSlot2}` : `${newSlot1}\n${newSlot2}`;
            msRow[hari] = combined;
            slotsAdded += 2;
          }
        });

        // Pastikan juga Jam 3 & 4 ada jika belum ada
        const existingSabtu = msRow.sabtu || '';
        if (!existingSabtu.includes('Jam 3')) {
          LIST_HARI.forEach((h) => {
            const hKey = h.toLowerCase();
            const cur = msRow[hKey] || '';
            const badonganName = tkt === 'ULA' && kls === '1'
              ? '(Badongan) Akhlaqul Banin/nat I.II {PA/PI}'
              : '(Badongan) Badongan';
            const s3 = `Jam 3 | ${badonganName} | ${kelasLengkap}${lokasiStr}`;
            const s4 = `Jam 4 | (Takror) Takror | ${kelasLengkap}${lokasiStr}`;
            msRow[hKey] = cur ? `${cur}\n${s3}\n${s4}` : `${s3}\n${s4}`;
            slotsAdded += 2;
          });
        }

        updatedTeachers.add(namaMS.toUpperCase());
        details.push(`Populasi Jadwal Mustahiq: ${namaMS} -> Kelas ${kelasLengkap} (${fanWajibMS.join(', ')})`);
      }
    }

    // Hitung ulang totalJam dan mengajar untuk seluruh guru yang terpengaruh
    updatedTeachers.forEach((gUpper) => {
      syncGuruMengajarAndTotalObj(jadwalMap[gUpper], asatidzList);
    });

    if (slotsAdded > 0) {
      // Simpan ke Supabase JADWAL_MENGAJAR_ASATIDZ
      await supabase
        .from('app_settings')
        .upsert({ key: 'JADWAL_MENGAJAR_ASATIDZ', value: JSON.stringify(jadwalMap) });

      // Perbarui Zustand Store
      useJadwalStore.setState({ jadwalMap });
      useJadwalStore.getState().rebuildMasterStrukturKelas(formasiList, asatidzList, fanConfig);
    }

    return {
      classesProcessed,
      teachersUpdated: updatedTeachers.size,
      slotsAdded,
      details,
    };
  },

  /**
   * Menghilangkan duplikasi & nama yatim (orphan) di FAN_PELAJARAN_DETAIL
   * agar tidak terjadi penumpukan data.
   */
  async cleanFanDetailDuplicates(): Promise<number> {
    const asatidzList = useAsatidzStore.getState().asatidzList;
    const activeNamesUpper = new Set(
      asatidzList.map((a) => (a.nama_asatidz || '').trim().toUpperCase()).filter(Boolean)
    );

    const { data: s } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'FAN_PELAJARAN_DETAIL')
      .single();

    const fanDetail: FanPelajaranDetail =
      typeof s?.value === 'string' ? JSON.parse(s.value) : s?.value || { item: {} };

    let cleanedCount = 0;
    Object.entries(fanDetail.item || {}).forEach(([itemKey, det]) => {
      if (!det || !Array.isArray(det.asatidz)) return;

      const seen = new Set<string>();
      const deduped: string[] = [];

      det.asatidz.forEach((g) => {
        const clean = String(g || '').trim();
        const upper = clean.toUpperCase();
        if (upper && activeNamesUpper.has(upper) && !seen.has(upper)) {
          seen.add(upper);
          // Ambil nama resmi sesuai master asatidz
          const official = asatidzList.find((a) => a.nama_asatidz?.trim().toUpperCase() === upper);
          deduped.push(official?.nama_asatidz || clean);
        } else if (upper && !activeNamesUpper.has(upper)) {
          cleanedCount++; // Hapus nama yang sudah tidak aktif / orphan
        } else if (seen.has(upper)) {
          cleanedCount++; // Hapus duplikasi
        }
      });

      if (deduped.length !== det.asatidz.length) {
        fanDetail.item![itemKey] = {
          ...det,
          asatidz: deduped,
        };
      }
    });

    if (cleanedCount > 0) {
      await supabase
        .from('app_settings')
        .upsert({ key: 'FAN_PELAJARAN_DETAIL', value: JSON.stringify(fanDetail) });
      useFanStore.setState({ fanDetail });
    }

    return cleanedCount;
  },
};
